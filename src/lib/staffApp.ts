import type { Skill, Staff } from '../data/types'
import { SHIFT_INFO, SHIFT_LEN, personViolations, resolveOptions, timelineFor, hasSkill, type Assignment, type EngineShift, type SkillKey, type Fix } from '../engine'
import { TODAY, TODAY_MONTH } from './courses'
import type { Demo } from './demo'
import { dayFullByIndex, type Lang } from './staffText'

/* ---------------- The demo clock ---------------- */

/** A fixed sample "now" (Tue 13 Oct 2026, 9:00 am IST); the app ticks forward from it. */
export const DEMO_NOW = Date.parse(`${TODAY}T09:00:00+05:30`)

export function shiftStartMs(date: string, shift: EngineShift): number {
  return Date.parse(`${date}T00:00:00+05:30`) + SHIFT_INFO[shift].start * 3_600_000
}

export function myAssignments(demo: Demo, staffId: string): Assignment[] {
  return demo.roster.assignments.filter((a) => a.staffId === staffId)
}

export function nextShift(demo: Demo, staffId: string, nowMs: number): Assignment | null {
  return (
    myAssignments(demo, staffId)
      .filter((a) => shiftStartMs(a.date, a.shift) > nowMs)
      .sort((a, b) => shiftStartMs(a.date, a.shift) - shiftStartMs(b.date, b.shift))[0] ?? null
  )
}

/* ---------------- What the manager changed ---------------- */

export interface ManagerUpdate {
  kind: Fix['kind']
  /** weekday index (0 = Sunday) for a fixed weekly off */
  weekday?: number
  /** first names of colleagues covering */
  covers: string[]
  course?: string
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function managerUpdates(demo: Demo, staffId: string): ManagerUpdate[] {
  return demo.applied
    .filter((a) => a.fix.staffId === staffId)
    .map(({ fix, result }) => {
      const upd: ManagerUpdate = { kind: fix.kind, covers: [] }
      const m = /now has (\w+) as a fixed weekly off/.exec(result.changes[0] ?? '')
      if (fix.kind === 'weekly-off' && m) upd.weekday = WEEKDAY_NAMES.indexOf(m[1])
      upd.covers = [...new Set(result.changes.slice(1).map((c) => /^([^ ]+ [^ ]+) (?:covers|takes)/.exec(c)?.[1]).filter((n): n is string => !!n))]
      if (fix.kind === 'skill-course') upd.course = result.person.plan?.skillCourse
      return upd
    })
}

export const fixedOffWeekday = (updates: ManagerUpdate[]): number | undefined => updates.find((u) => u.kind === 'weekly-off')?.weekday

export const weekdayName = (i: number, lang: Lang) => dayFullByIndex(i, lang)

/* ---------------- Swaps ---------------- */

/** Skill labels that tell colleagues apart; the language line is true of everyone so it proves nothing. */
const sharedLabels = (a: Staff, b: Staff): string[] => {
  const mine = new Set(a.skills.map((s) => s.label.toLowerCase()))
  return b.skills.filter((s) => mine.has(s.label.toLowerCase()) && !/hindi|english/i.test(s.label)).map((s) => s.label)
}

export interface Peer {
  person: Staff
  /** a skill you both hold, to show why they are a fair match */
  shared: string
}

/** Coworkers in the same department who hold at least one skill you hold. */
export function swapPeers(demo: Demo, me: Staff): Peer[] {
  return demo.people
    .filter((p) => p.id !== me.id && p.department === me.department)
    .map((person) => ({ person, shared: sharedLabels(me, person)[0] }))
    .filter((x): x is Peer => !!x.shared)
}

export type CheckId = 'rest' | 'off' | 'skill' | 'overtime' | 'leave' | 'busy'
export interface SwapCheck {
  id: CheckId
  ok: boolean
  /** who the line is about */
  who: 'me' | 'them' | 'both'
  /** hours of rest, for the rest check */
  hours?: number
}

export interface SwapEvaluation {
  ok: boolean
  checks: SwapCheck[]
}

const trimH = (n: number) => Math.round(n * 10) / 10

function weekOvertime(p: Staff, list: Assignment[], date: string, firstDate: string): number {
  const week = Math.floor((Date.parse(date) - Date.parse(firstDate)) / (7 * 86_400_000))
  const n = list.filter((a) => Math.floor((Date.parse(a.date) - Date.parse(firstDate)) / (7 * 86_400_000)) === week).length
  return Math.max(0, n * SHIFT_LEN - p.weeklyHours)
}

function restAround(p: Staff, list: Assignment[], date: string): number {
  const entries = timelineFor(p.history, list)
  const i = entries.findIndex((e) => e.fromRoster && e.date === date)
  if (i < 0) return Infinity
  const before = i > 0 ? entries[i].span.start - entries[i - 1].span.end : Infinity
  const after = i < entries.length - 1 ? entries[i + 1].span.start - entries[i].span.end : Infinity
  return Math.min(before, after)
}

/**
 * Would swapping A's shift on `aDate` for B's on `bDate` be fair to both?
 * Uses the same hard rules as the roster: rest, days in a row, weekly off, leave, skills.
 */
export function evaluateSwap(demo: Demo, a: Staff, aDate: string, b: Staff, bDate: string): SwapEvaluation {
  const o = resolveOptions()
  const mineA = myAssignments(demo, a.id)
  const mineB = myAssignments(demo, b.id)
  const sA = mineA.find((x) => x.date === aDate)
  const sB = mineB.find((x) => x.date === bDate)
  const checks: SwapCheck[] = []
  if (!sA || !sB) return { ok: false, checks: [{ id: 'busy', ok: false, who: 'both' }] }

  if (aDate !== bDate && mineA.some((x) => x.date === bDate)) checks.push({ id: 'busy', ok: false, who: 'me' })
  if (aDate !== bDate && mineB.some((x) => x.date === aDate)) checks.push({ id: 'busy', ok: false, who: 'them' })
  if (checks.length) return { ok: false, checks }

  const newA: Assignment[] = [...mineA.filter((x) => x !== sA), { staffId: a.id, date: bDate, shift: sB.shift }]
  const newB: Assignment[] = [...mineB.filter((x) => x !== sB), { staffId: b.id, date: aDate, shift: sA.shift }]
  const sortByDate = (l: Assignment[]) => [...l].sort((x, y) => x.date.localeCompare(y.date))
  const vA = personViolations(a, sortByDate(newA), o)
  const vB = personViolations(b, sortByDate(newB), o)
  const had = (v: ReturnType<typeof personViolations>, ...rules: string[]) => v.some((x) => rules.includes(x.rule))

  // leave first: it makes every other line moot
  if (had(vA, 'leave')) checks.push({ id: 'leave', ok: false, who: 'me' })
  if (had(vB, 'leave')) checks.push({ id: 'leave', ok: false, who: 'them' })

  const restA = restAround(a, sortByDate(newA), bDate)
  const restB = restAround(b, sortByDate(newB), aDate)
  checks.push({ id: 'rest', ok: !had(vA, 'rest'), who: 'me', hours: trimH(restA) })
  checks.push({ id: 'rest', ok: !had(vB, 'rest'), who: 'them', hours: trimH(restB) })
  checks.push({ id: 'off', ok: !had(vA, 'weekly-off', 'max-consecutive'), who: 'me' })
  checks.push({ id: 'off', ok: !had(vB, 'weekly-off', 'max-consecutive'), who: 'them' })

  // the skill each slot needs must come with the person taking it over
  const slotNeed = (date: string, shift: EngineShift, dept: Staff['department']): SkillKey | undefined =>
    demo.roster.demand.find((d) => d.date === date)?.slots.find((s) => s.department === dept && s.shift === shift)?.requiresSkill
  const needA = slotNeed(aDate, sA.shift, a.department)
  const needB = slotNeed(bDate, sB.shift, b.department)
  const skillOk = (!needA || hasSkill(b, needA)) && (!needB || hasSkill(a, needB))
  checks.push({ id: 'skill', ok: skillOk, who: 'both' })

  const first = demo.roster.dates[0]
  const otA = weekOvertime(a, newA, bDate, first) <= weekOvertime(a, mineA, bDate, first) && weekOvertime(a, newA, aDate, first) <= weekOvertime(a, mineA, aDate, first)
  const otB = weekOvertime(b, newB, aDate, first) <= weekOvertime(b, mineB, aDate, first) && weekOvertime(b, newB, bDate, first) <= weekOvertime(b, mineB, bDate, first)
  checks.push({ id: 'overtime', ok: otA && otB, who: otA ? 'them' : 'me' })

  return { ok: checks.every((c) => c.ok), checks }
}

/* ---------------- Seasons ---------------- */

export interface SeasonRow {
  key: string
  kind: 'summer' | 'autumn'
  year: number
  current: boolean
  skills: Skill[]
}

const WINDOW = { summer: ['04', '06'], autumn: ['10', '11'] } as const

/** Every summer (Apr–Jun) and autumn (Oct–Nov) season since the person joined, newest first. */
export function seasonsFor(p: Staff): SeasonRow[] {
  const joinMonth = p.joinDate.slice(0, 7)
  const joinYear = Number(p.joinDate.slice(0, 4))
  const lastYear = Number(TODAY_MONTH.slice(0, 4))
  const rows: SeasonRow[] = []
  for (let y = joinYear; y <= lastYear; y++) {
    for (const kind of ['summer', 'autumn'] as const) {
      const [from, to] = WINDOW[kind]
      const start = `${y}-${from}`
      const end = `${y}-${to}`
      if (end < joinMonth || start > TODAY_MONTH) continue
      rows.push({ key: `${kind}-${y}`, kind, year: y, current: TODAY_MONTH >= start && TODAY_MONTH <= end, skills: [] })
    }
  }
  // a skill belongs to the season it was earned in, or the next one it prepared them for
  for (const s of p.skills) {
    const row = rows.find((r) => s.since <= `${r.year}-${WINDOW[r.kind][1]}`) ?? rows[rows.length - 1]
    row?.skills.push(s)
  }
  return rows.reverse()
}

/** The season after the current one. */
export function nextSeason(rows: SeasonRow[]): { kind: 'summer' | 'autumn'; year: number } {
  const cur = rows.find((r) => r.current) ?? rows[0]
  return cur.kind === 'autumn' ? { kind: 'summer', year: cur.year + 1 } : { kind: 'autumn', year: cur.year }
}
