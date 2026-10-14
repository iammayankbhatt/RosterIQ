import type { ShiftRecord, Staff } from '../data/types'
import { OVERTIME_MULTIPLIER, SHIFT_INFO, SHIFT_LEN, dayNumber, fmtDate, hasSkill, spanOf, weekdayOf, type Span } from './shifts'
import type {
  Assignment,
  DemandDay,
  PersonHours,
  ResolvedOptions,
  UnmetDemand,
  Violation,
} from './types'

/** One worked day on a person's timeline (history or roster). */
export interface Entry {
  date: string
  day: number
  span: Span
  hours: number
  /** ends after midnight, or a night shift */
  night: boolean
  fromRoster: boolean
}

const historyCache = new WeakMap<ShiftRecord[], Entry[]>()

export function historyEntries(history: ShiftRecord[]): Entry[] {
  const hit = historyCache.get(history)
  if (hit) return hit
  const out: Entry[] = []
  for (const r of history) {
    if (r.start == null || r.end == null || r.hours <= 0) continue
    const day = dayNumber(r.date)
    out.push({
      date: r.date,
      day,
      span: { start: day * 24 + r.start, end: day * 24 + r.end },
      hours: r.hours,
      night: r.end >= 24,
      fromRoster: false,
    })
  }
  historyCache.set(history, out)
  return out
}

export function assignmentEntry(a: Assignment): Entry {
  return {
    date: a.date,
    day: dayNumber(a.date),
    span: spanOf(a.date, a.shift),
    hours: SHIFT_LEN,
    night: SHIFT_INFO[a.shift].end >= 24,
    fromRoster: true,
  }
}

/** History followed by the roster; a roster assignment replaces any history on the same day. */
export function timelineFor(history: ShiftRecord[], mine: Assignment[]): Entry[] {
  const roster = mine.map(assignmentEntry)
  const days = new Set(roster.map((e) => e.day))
  return [...historyEntries(history).filter((e) => !days.has(e.day)), ...roster].sort((a, b) => a.day - b.day)
}

function approvedLeaveOn(p: Staff, date: string): boolean {
  return p.leave.some((l) => l.status === 'approved' && date >= l.from && date <= l.to)
}

export function pendingLeaveOn(p: Staff, date: string): boolean {
  return p.leave.some((l) => l.status === 'pending' && date >= l.from && date <= l.to)
}

/**
 * Hard-rule check for one person. Only roster entries are judged;
 * rest/streak problems already sitting in last month's history are not the roster's fault.
 */
export function personViolations(p: Staff, mine: Assignment[], o: ResolvedOptions): Violation[] {
  const entries = timelineFor(p.history, mine)
  const worked = new Set(entries.map((e) => e.day))
  const out: Violation[] = []
  const rule = o.rules[p.id]

  entries.forEach((e, idx) => {
    if (!e.fromRoster) return
    const label = fmtDate(e.date)

    if (approvedLeaveOn(p, e.date)) {
      out.push({ rule: 'leave', staffId: p.id, date: e.date, text: `${p.name} is rostered on ${label} but has approved leave.` })
    }

    const prev = entries[idx - 1]
    if (prev) {
      const rest = e.span.start - prev.span.end
      if (rest < o.minRestHours) {
        out.push({
          rule: 'rest',
          staffId: p.id,
          date: e.date,
          text: `${p.name} gets only ${rest.toFixed(1).replace(/\.0$/, '')} hours of rest before ${label} (minimum ${o.minRestHours}).`,
        })
      }
    }

    let streak = 1
    while (worked.has(e.day - streak)) streak++
    if (streak > o.maxConsecutiveDays) {
      out.push({
        rule: 'max-consecutive',
        staffId: p.id,
        date: e.date,
        text: `${p.name} would work ${streak} days in a row on ${label} (maximum ${o.maxConsecutiveDays}).`,
      })
    }

    let full = true
    for (let k = 1; k <= 6; k++) if (!worked.has(e.day - k)) full = false
    if (full) {
      out.push({ rule: 'weekly-off', staffId: p.id, date: e.date, text: `${p.name} has no day off in the 7 days up to ${label}.` })
    }

    if (rule?.fixedOffWeekday !== undefined && weekdayOf(e.date) === rule.fixedOffWeekday) {
      out.push({ rule: 'rule', staffId: p.id, date: e.date, text: `${label} is ${p.name}'s fixed weekly off.` })
    }
    if (rule?.maxConsecutiveNights !== undefined && e.night) {
      let run = 1
      while (entries.some((x) => x.day === e.day - run && x.night)) run++
      if (run > rule.maxConsecutiveNights) {
        out.push({
          rule: 'rule',
          staffId: p.id,
          date: e.date,
          text: `${p.name} would work ${run} late nights in a row on ${label} (limit ${rule.maxConsecutiveNights}).`,
        })
      }
    }
  })
  return out
}

export function assignmentsByPerson(staff: Staff[], assignments: Assignment[]): Map<string, Assignment[]> {
  const m = new Map<string, Assignment[]>(staff.map((s) => [s.id, []]))
  for (const a of assignments) m.get(a.staffId)?.push(a)
  return m
}

/** Slot coverage (headcount, skills, first-aid) for a set of assignments. */
export function computeUnmet(staff: Staff[], demand: DemandDay[], assignments: Assignment[]): UnmetDemand[] {
  const byId = new Map(staff.map((s) => [s.id, s]))
  const out: UnmetDemand[] = []
  for (const d of demand) {
    for (const slot of d.slots) {
      const here = assignments.filter((a) => a.date === d.date && a.shift === slot.shift && byId.get(a.staffId)?.department === slot.department)
      const shiftName = SHIFT_INFO[slot.shift].label
      if (here.length < slot.count) {
        out.push({
          date: d.date,
          kind: 'headcount',
          department: slot.department,
          shift: slot.shift,
          missing: slot.count - here.length,
          text: `${fmtDate(d.date)}, ${slot.department} ${shiftName}: need ${slot.count}, have ${here.length}.`,
        })
      }
      if (slot.requiresSkill && here.length > 0 && !here.some((a) => hasSkill(byId.get(a.staffId)!, slot.requiresSkill!))) {
        out.push({
          date: d.date,
          kind: 'skill',
          department: slot.department,
          shift: slot.shift,
          missing: 1,
          text: `${fmtDate(d.date)}, ${slot.department} ${shiftName}: nobody with the ${slot.requiresSkill} skill.`,
        })
      }
    }
    if (d.firstAidRequired) {
      const covered = assignments.some((a) => a.date === d.date && hasSkill(byId.get(a.staffId)!, 'first-aid'))
      if (!covered) {
        out.push({ date: d.date, kind: 'first-aid', missing: 1, text: `${fmtDate(d.date)}: no first-aid trained person on site.` })
      }
    }
  }
  return out
}

/** All hard-rule violations in a roster, plus skill coverage gaps. */
export function validateRoster(staff: Staff[], assignments: Assignment[], demand: DemandDay[], o: ResolvedOptions): Violation[] {
  const by = assignmentsByPerson(staff, assignments)
  const out: Violation[] = []
  for (const p of staff) out.push(...personViolations(p, by.get(p.id)!, o))
  for (const u of computeUnmet(staff, demand, assignments)) {
    if (u.kind === 'skill') out.push({ rule: 'skill', date: u.date, text: u.text })
  }
  return out
}

export function computeHours(staff: Staff[], assignments: Assignment[], dates: string[]): Record<string, PersonHours> {
  const out: Record<string, PersonHours> = {}
  const weeks = Math.ceil(dates.length / 7)
  const start = dayNumber(dates[0])
  const by = assignmentsByPerson(staff, assignments)
  for (const p of staff) {
    const mine = by.get(p.id)!
    const weekHours = Array.from({ length: weeks }, () => 0)
    for (const a of mine) weekHours[Math.floor((dayNumber(a.date) - start) / 7)] += SHIFT_LEN
    const overtimeByWeek = weekHours.map((h, w) => {
      const blockDays = Math.min(7, dates.length - w * 7)
      return Math.max(0, h - p.weeklyHours * (blockDays / 7))
    })
    const overtimeHours = overtimeByWeek.reduce((a, b) => a + b, 0)
    out[p.id] = {
      weekHours,
      overtimeByWeek,
      totalHours: weekHours.reduce((a, b) => a + b, 0),
      overtimeHours,
      overtimeCost: overtimeHours * p.hourlyRate * OVERTIME_MULTIPLIER,
      shifts: mine.length,
      nights: mine.filter((a) => a.shift === 'N').length,
    }
  }
  return out
}
