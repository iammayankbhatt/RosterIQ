import type { Staff } from '../data/types'
import type { CellChange } from './demo'
import {
  OVERTIME_MULTIPLIER,
  SHIFT_INFO,
  SHIFT_LEN,
  fmtDate,
  hasSkill,
  headcountFor,
  personViolations,
  resolveOptions,
  timelineFor,
  type Assignment,
  type EngineShift,
  type Roster,
  type SkillKey,
  type Violation,
} from '../engine'

/** What sits in one grid cell: a shift, a plain day off, or approved leave. */
export type CellKind = EngineShift | 'X' | 'L'
export type RosterMode = 'manual' | 'engine'

export const cellKey = (staffId: string, date: string) => `${staffId}|${date}`

export interface RosterIndex {
  cells: Map<string, EngineShift>
  byPerson: Map<string, Assignment[]>
  /** hard-rule breaks and rest problems, by `staffId|date` */
  violations: Map<string, Violation[]>
  /** people scheduled per date */
  perDay: Map<string, number>
  /** dates with an uncovered slot */
  unmetDates: Set<string>
}

export function indexRoster(staff: Staff[], roster: Roster): RosterIndex {
  const o = resolveOptions()
  const cells = new Map<string, EngineShift>()
  const byPerson = new Map<string, Assignment[]>(staff.map((s) => [s.id, []]))
  const perDay = new Map<string, number>()
  for (const a of roster.assignments) {
    cells.set(cellKey(a.staffId, a.date), a.shift)
    byPerson.get(a.staffId)?.push(a)
    perDay.set(a.date, (perDay.get(a.date) ?? 0) + 1)
  }
  const violations = new Map<string, Violation[]>()
  for (const p of staff) {
    for (const v of personViolations(p, byPerson.get(p.id)!, o)) {
      const k = cellKey(p.id, v.date)
      violations.set(k, [...(violations.get(k) ?? []), v])
    }
  }
  return { cells, byPerson, violations, perDay, unmetDates: new Set(roster.unmet.map((u) => u.date)) }
}

export function approvedLeave(p: Staff, date: string) {
  return p.leave.find((l) => l.status === 'approved' && date >= l.from && date <= l.to)
}

export function cellKind(p: Staff, date: string, idx: RosterIndex): CellKind {
  const shift = idx.cells.get(cellKey(p.id, date))
  if (shift) return shift
  return approvedLeave(p, date) ? 'L' : 'X'
}

export interface WeekStats {
  /** overtime hours per person */
  overtime: Map<string, number>
  hours: Map<string, number>
  totalOvertimeHours: number
  totalOvertimeCost: number
}

/** Hours and overtime inside one 7-day window, against each person's contracted week. */
export function weekStats(staff: Staff[], idx: RosterIndex, dates: string[]): WeekStats {
  const inWeek = new Set(dates)
  const overtime = new Map<string, number>()
  const hours = new Map<string, number>()
  let totalOvertimeHours = 0
  let totalOvertimeCost = 0
  for (const p of staff) {
    const h = idx.byPerson.get(p.id)!.filter((a) => inWeek.has(a.date)).length * SHIFT_LEN
    const ot = Math.max(0, h - p.weeklyHours)
    hours.set(p.id, h)
    overtime.set(p.id, ot)
    totalOvertimeHours += ot
    totalOvertimeCost += ot * p.hourlyRate * OVERTIME_MULTIPLIER
  }
  return { overtime, hours, totalOvertimeHours, totalOvertimeCost }
}

export function neededOn(roster: Roster, date: string): number {
  const d = roster.demand.find((x) => x.date === date)
  return d ? headcountFor(d) : 0
}

/* ---------------- Explaining a cell ---------------- */

export interface Reason {
  tone: 'ok' | 'note' | 'warn'
  text: string
}

export interface CellExplanation {
  heading: string
  detail: string
  reasons: Reason[]
}

const SKILL_LABEL: Record<SkillKey, string> = {
  'front-desk': 'front-desk certification',
  cook: 'cook skill',
  'first-aid': 'first-aid training',
}

/** Same reading of preferred shift codes the engine uses when it scores a slot. */
function prefersShift(p: Staff, shift: EngineShift): boolean | null {
  const pr = p.preferredShifts
  if (shift === 'M') return pr.includes('O') || pr.includes('D')
  if (shift === 'E') return pr.includes('E') || pr.includes('C') || pr.includes('D')
  return pr.includes('C') ? true : null
}

const lower = (s: EngineShift) => SHIFT_INFO[s].label.toLowerCase()
const firstName = (p: Staff) => p.name.split(' ')[0]
const trimNum = (n: number) => String(Math.round(n * 10) / 10).replace(/\.0$/, '')

function describeEntry(e: { span: { start: number; end: number }; night: boolean; fromRoster: boolean }, roster: Roster, staffId: string, date: string): string {
  if (e.fromRoster) {
    const a = roster.assignments.find((x) => x.staffId === staffId && x.date === date)
    return a ? `their ${lower(a.shift)} shift` : 'their last shift'
  }
  const start = e.span.start % 24
  if (e.night) return 'a late close'
  if (start < 8) return 'an early open'
  if (start < 12) return 'a day shift'
  return 'an evening shift'
}

function explainCellBase(args: {
  mode: RosterMode
  person: Staff
  date: string
  roster: Roster
  index: RosterIndex
  weekDates: string[]
  staff: Staff[]
}): CellExplanation {
  const { mode, person: p, date, roster, index, weekDates } = args
  const staffById = new Map(args.staff.map((s) => [s.id, s]))
  const kind = cellKind(p, date, index)
  const mine = index.byPerson.get(p.id)!
  const warnings = index.violations.get(cellKey(p.id, date)) ?? []
  const reasons: Reason[] = []
  const stats = weekStats([p], index, weekDates)
  const weekH = stats.hours.get(p.id) ?? 0
  const weekOt = stats.overtime.get(p.id) ?? 0

  /* ----- days off ----- */
  if (kind === 'L' || kind === 'X') {
    const leave = approvedLeave(p, date)
    if (leave) {
      reasons.push({ tone: 'ok', text: `Approved leave (${leave.reason.toLowerCase()}) is kept. ${p.department} colleagues cover the shift.` })
    } else {
      const pending = p.leave.find((l) => l.status === 'pending' && date >= l.from && date <= l.to)
      if (pending) reasons.push({ tone: 'ok', text: `Pending leave request (${pending.reason.toLowerCase()}) is honoured here.` })
      const entries = timelineFor(p.history, mine)
      const before = [...entries].reverse().find((e) => e.date < date)
      const after = entries.find((e) => e.date > date)
      if (mode === 'engine') {
        const forced = roster.decisions.find((d) => d.kind === 'rest' && d.staffId === p.id && d.date === date)
        if (forced) reasons.push({ tone: 'ok', text: forced.text })
        else reasons.push({ tone: 'ok', text: `Rest day: ${firstName(p)} gets a proper weekly off, ${weekH} hours booked this week against ${p.weeklyHours} contracted.` })
        if (before) reasons.push({ tone: 'note', text: `Last worked ${fmtDate(before.date)}${after ? `, back on ${fmtDate(after.date)}` : ''}.` })
      } else {
        reasons.push({ tone: 'note', text: `Fixed weekly off on the paper roster: the same weekday every week, whatever the demand.` })
      }
    }
    return {
      heading: kind === 'L' ? 'Leave' : 'Day off',
      detail: `${p.name} · ${fmtDate(date)}`,
      reasons,
    }
  }

  /* ----- working days ----- */
  const shift = kind
  if (mode === 'manual') {
    reasons.push({ tone: 'note', text: `Usual ${lower(shift)} shift: the paper roster repeats one fixed pattern every week.` })
    for (const v of warnings) reasons.push({ tone: 'warn', text: v.text })
    if (warnings.length) reasons.push({ tone: 'note', text: 'Nothing on paper checks rest between shifts or days in a row.' })
    if (weekOt > 0) reasons.push({ tone: 'warn', text: `${weekH} hours this week against ${p.weeklyHours} contracted: ${trimNum(weekOt)} hours of overtime.` })
    return { heading: `${SHIFT_INFO[shift].label} · ${hoursOf(shift)}`, detail: `${p.name} · ${fmtDate(date)}`, reasons }
  }

  const entries = timelineFor(p.history, mine)
  const i = entries.findIndex((e) => e.fromRoster && e.date === date)
  const prev = i > 0 ? entries[i - 1] : undefined
  if (prev) {
    const rest = entries[i].span.start - prev.span.end
    const steady = prev.date !== date && entries[i].day - prev.day === 1 && prev.span.start % 24 === SHIFT_INFO[shift].start
    reasons.push({
      tone: 'ok',
      text: `Placed on ${lower(shift)}s: ${trimNum(rest)} hours of rest after ${describeEntry(prev, roster, p.id, prev.date)} on ${fmtDate(prev.date)} (minimum 11).${steady ? ' Same shift as the day before, so a steady rhythm.' : ''}`,
    })
  } else {
    reasons.push({ tone: 'ok', text: `Placed on ${lower(shift)}s: fully rested coming in, nothing before it on the record.` })
  }

  const offs = weekDates.filter((d) => !index.cells.has(cellKey(p.id, d)) && !approvedLeave(p, d))
  if (offs.length) reasons.push({ tone: 'ok', text: `Keeps their weekly off on ${offs.slice(0, 2).map(fmtDate).join(' and ')}.` })

  const slot = roster.demand.find((d) => d.date === date)?.slots.find((s) => s.department === p.department && s.shift === shift)
  if (slot?.requiresSkill && hasSkill(p, slot.requiresSkill)) {
    reasons.push({ tone: 'ok', text: `Holds the ${SKILL_LABEL[slot.requiresSkill]} this ${p.department} ${lower(shift)} needs.` })
  }
  if (hasSkill(p, 'first-aid')) {
    const someoneElse = roster.assignments.some((a) => a.date === date && a.staffId !== p.id && staffById.get(a.staffId) && hasSkill(staffById.get(a.staffId)!, 'first-aid'))
    if (!someoneElse) reasons.push({ tone: 'note', text: 'First-aid trained, which keeps a trained person on site today.' })
  }
  const pref = prefersShift(p, shift)
  if (pref === true) reasons.push({ tone: 'ok', text: `Matches ${firstName(p)}'s preferred ${lower(shift)} shifts.` })
  if (shift === 'N') {
    const nights = mine.filter((a) => a.shift === 'N').sort((a, b) => a.date.localeCompare(b.date))
    const n = nights.findIndex((a) => a.date === date) + 1
    reasons.push({ tone: 'note', text: `Night ${n} of ${nights.length} for ${firstName(p)} this fortnight; ${p.department} nights rotate across the team.` })
  }
  for (const d of roster.decisions) {
    if (d.staffId === p.id && d.date === date && (d.kind === 'note' || d.kind === 'overtime' || d.kind === 'skill' || d.kind === 'first-aid')) {
      reasons.push({ tone: d.kind === 'overtime' ? 'warn' : 'note', text: d.text })
    }
  }
  if (weekOt > 0 && !reasons.some((r) => r.tone === 'warn')) {
    reasons.push({ tone: 'note', text: `${weekH} hours this week against ${p.weeklyHours} contracted, so ${trimNum(weekOt)} hours count as overtime.` })
  }
  for (const v of warnings) reasons.push({ tone: 'warn', text: v.text })
  return { heading: `${SHIFT_INFO[shift].label} · ${hoursOf(shift)}`, detail: `${p.name} · ${fmtDate(date)}`, reasons: reasons.slice(0, 6) }
}

const hoursOf = (s: EngineShift) => `${String(SHIFT_INFO[s].start).padStart(2, '0')}–${String(SHIFT_INFO[s].end % 24).padStart(2, '0')}`
export const shiftTimes = hoursOf

/** Explain a cell; if a manager fix or a swap moved it, say so first. */
export function explainCell(args: Parameters<typeof explainCellBase>[0] & { change?: CellChange }): CellExplanation {
  const out = explainCellBase(args)
  const c = args.change
  if (!c) return out
  const word = (s: EngineShift | null) => (s ? `${SHIFT_INFO[s].label.toLowerCase()} shift` : 'a day off')
  out.reasons.unshift({
    tone: 'note',
    text: `${c.cause === 'swap' ? 'Swapped' : 'Changed by a manager fix'}: was ${word(c.before)}, now ${word(c.after)}.`,
  })
  return out
}
