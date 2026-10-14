import { occupancyForecast, staff } from '../data'
import type { Staff } from '../data/types'
import {
  applyFix,
  generateManualBaseline,
  generateRoster,
  resolveOptions,
  scoreRisk,
  type ApplyResult,
  type Assignment,
  type Decision,
  type Fix,
  type RiskResult,
  type Roster,
} from '../engine'
import { finalizeRoster } from '../engine/roster'
import { COURSE_BY_ID, TODAY, TODAY_MONTH, holdsCourseSkill } from './courses'
import { buildAttention, computeReadiness, type Attention, type Readiness } from './readiness'

export interface AppliedFix {
  fix: Fix
  result: ApplyResult
}

/** One cell that differs from the roster as first generated. */
export interface CellChange {
  staffId: string
  date: string
  /** the shift before (null: they were off) */
  before: Assignment['shift'] | null
  /** the shift now (null: they are off) */
  after: Assignment['shift'] | null
  cause: 'fix' | 'swap'
}

export interface Demo {
  roster: Roster
  /** every cell a manager fix or a swap has moved, so each screen can point at the same changes */
  changes: CellChange[]
  manual: Roster
  /** workload risk, one per person (same order as `people`) */
  risks: RiskResult[]
  /** the staff list with everything agreed so far folded in: plans, new skills, check-ins */
  people: Staff[]
  /** manager fixes applied so far, oldest first */
  applied: AppliedFix[]
  /** shift swaps that are live in `roster` */
  swaps: SwapRecord[]
  readiness: Readiness
  attention: Attention[]
}

/** A swap: `aId` hands over their shift on `aDate`, `bId` hands over theirs on `bDate`. */
export interface SwapRecord {
  id: number
  aId: string
  aDate: string
  bId: string
  bDate: string
}

export interface MoodEntry {
  /** first day of the week the check-in belongs to */
  week: string
  /** 1 (really tough) to 5 (great) */
  score: number
}

interface Overlay {
  moods: Record<string, MoodEntry>
  /** lessons finished, per person, per course */
  progress: Record<string, Record<string, number>>
  swaps: SwapRecord[]
}

const ROSTER_FIXES = new Set<Fix['kind']>(['weekly-off', 'shift-pattern', 'honour-leave'])

/* ---------------- Pure derivation ---------------- */

function withOverlay(p: Staff, o: Overlay): Staff {
  let out = p
  const prog = o.progress[p.id]
  if (prog) {
    const earned = [...COURSE_BY_ID.values()].filter((c) => (prog[c.id] ?? 0) >= c.lessons && !holdsCourseSkill(out, c))
    // a finished course is a new skill, dated this month
    if (earned.length) out = { ...out, skills: [...out.skills, ...earned.map((c) => ({ label: c.skill, since: TODAY_MONTH }))] }
  }
  const mood = o.moods[p.id]
  // the weekly check-in becomes the newest feedback point the stagnation signal reads
  if (mood) out = { ...out, feedback: [...out.feedback, { period: `Check-in ${mood.week}`, score: mood.score }] }
  return out
}

/** Exchange two shifts. Returns null if either shift is no longer where the swap expects it. */
function swapAssignments(list: Assignment[], s: SwapRecord): Assignment[] | null {
  const a = list.find((x) => x.staffId === s.aId && x.date === s.aDate)
  const b = list.find((x) => x.staffId === s.bId && x.date === s.bDate)
  if (!a || !b) return null
  const rest = list.filter((x) => x !== a && x !== b)
  const busy = (id: string, date: string) => rest.some((x) => x.staffId === id && x.date === date)
  if (busy(s.aId, s.bDate) || busy(s.bId, s.aDate)) return null
  return [...rest, { staffId: s.aId, date: s.bDate, shift: b.shift }, { staffId: s.bId, date: s.aDate, shift: a.shift }]
}

function withSwaps(roster: Roster, people: Staff[], swaps: SwapRecord[]): { roster: Roster; live: SwapRecord[] } {
  let assignments = roster.assignments
  const notes: Decision[] = []
  const live: SwapRecord[] = []
  const name = (id: string) => people.find((p) => p.id === id)!.name
  for (const s of swaps) {
    const next = swapAssignments(assignments, s)
    if (!next) continue // a later fix moved one of the shifts; drop the swap quietly
    assignments = next
    live.push(s)
    notes.push({ kind: 'note', staffId: s.aId, date: s.bDate, text: `${name(s.aId)} swapped shifts with ${name(s.bId)} (approved: rest, weekly off and skills all hold).` })
    notes.push({ kind: 'note', staffId: s.bId, date: s.aDate, text: `${name(s.bId)} swapped shifts with ${name(s.aId)} (approved: rest, weekly off and skills all hold).` })
  }
  if (!live.length) return { roster, live }
  const kept = roster.decisions.filter((d) => d.kind === 'note' || d.kind === 'overtime')
  return { roster: finalizeRoster('engine', people, roster.demand, assignments, [...kept, ...notes], resolveOptions()), live }
}

/** Exactly which people/days differ between the original roster and the live one. */
function diffRosters(original: Roster, now: Roster, swaps: SwapRecord[]): CellChange[] {
  const k = (a: Assignment) => `${a.staffId}|${a.date}`
  const before = new Map(original.assignments.map((a) => [k(a), a.shift]))
  const after = new Map(now.assignments.map((a) => [k(a), a.shift]))
  const swapped = new Set(swaps.flatMap((s) => [`${s.aId}|${s.aDate}`, `${s.aId}|${s.bDate}`, `${s.bId}|${s.aDate}`, `${s.bId}|${s.bDate}`]))
  const out: CellChange[] = []
  for (const key of new Set([...before.keys(), ...after.keys()])) {
    const b = before.get(key) ?? null
    const a = after.get(key) ?? null
    if (b === a) continue
    const [staffId, date] = key.split('|')
    out.push({ staffId, date, before: b, after: a, cause: swapped.has(key) ? 'swap' : 'fix' })
  }
  return out.sort((x, y) => x.date.localeCompare(y.date) || x.staffId.localeCompare(y.staffId))
}

function build(people: Staff[], roster: Roster, manual: Roster, applied: AppliedFix[], swaps: SwapRecord[], changes: CellChange[]): Demo {
  // People whose roster was changed are scored on history plus the fixed plan; everyone else on history alone.
  const rosterFixed = new Set(applied.filter((a) => ROSTER_FIXES.has(a.fix.kind)).map((a) => a.fix.staffId))
  const risks = people.map((p) => scoreRisk(p, rosterFixed.has(p.id) ? roster : null))
  return {
    roster,
    changes,
    manual,
    risks,
    people,
    applied,
    swaps,
    readiness: computeReadiness(people, roster, risks),
    attention: buildAttention(people, roster, risks),
  }
}

/* ---------------- Live state ---------------- */

let baseRoster: Roster | null = null
let manualRoster: Roster | null = null
let fixes: Fix[] = []
let overlay: Overlay = { moods: {}, progress: {}, swaps: [] }
let current: Demo | null = null
let swapCounter = 0

function derive(base: Roster): Demo {
  manualRoster ??= generateManualBaseline(staff, occupancyForecast)
  let people = staff.map((p) => withOverlay(p, overlay))
  let roster = base
  const applied: AppliedFix[] = []
  for (const fix of fixes) {
    const person = people.find((p) => p.id === fix.staffId)!
    const result = applyFix(fix, person, roster, { staff: people })
    roster = result.roster
    people = people.map((p) => (p.id === person.id ? result.person : p))
    applied.push({ fix, result })
  }
  const swapped = withSwaps(roster, people, overlay.swaps)
  return build(people, swapped.roster, manualRoster, applied, swapped.live, diffRosters(base, swapped.roster, swapped.live))
}

function invalidate() {
  current = null
}

/** Everything the screens need, derived from the engine plus whatever has been agreed so far. */
export function getDemo(): Demo {
  if (!current) {
    baseRoster ??= generateRoster(staff, occupancyForecast)
    current = derive(baseRoster)
  }
  return current
}

/**
 * Back to the original state. The two base rosters come from fixed sample data and never change,
 * so they stay cached: a reset is instant instead of re-running the solver.
 */
export function clearDemo() {
  fixes = []
  overlay = { moods: {}, progress: {}, swaps: [] }
  current = null
}

/** True once the first derivation has run, so screens can render without a stall. */
export function isDemoWarm(): boolean {
  return current !== null
}

/* ---------------- Manager fixes ---------------- */

export interface FixOutcome {
  fix: Fix
  result: ApplyResult
  before: RiskResult
  after: RiskResult
  prev: Demo
  next: Demo
}

/** Apply a fix to the live demo. The whole app reads `getDemo()`, so it changes everywhere. */
export function applyDemoFix(fix: Fix): FixOutcome {
  const prev = getDemo()
  fixes = [...fixes, fix]
  invalidate()
  const next = getDemo()
  const risk = (d: Demo) => d.risks[d.people.findIndex((p) => p.id === fix.staffId)]
  return { fix, result: next.applied[next.applied.length - 1].result, before: risk(prev), after: risk(next), prev, next }
}

export function canUndo(): boolean {
  return fixes.length > 0
}

/** Step back to how things were before the last applied fix. */
export function undoDemoFix(): { undone: AppliedFix; prev: Demo; next: Demo } | null {
  if (!fixes.length) return null
  const next = getDemo()
  fixes = fixes.slice(0, -1)
  invalidate()
  return { undone: next.applied[next.applied.length - 1], prev: getDemo(), next }
}

/**
 * Run the engine again from scratch and replay every agreed fix and swap on top, so a
 * regenerated roster keeps the changes already made.
 */
export function regenerateWithFixes(): Roster {
  return derive(generateRoster(staff, occupancyForecast)).roster
}

/* ---------------- Staff-app actions ---------------- */

export function getOverlay(): Readonly<Overlay> {
  return overlay
}

/** Save this week's check-in (one per person per week; saving again replaces it). */
export function setMood(staffId: string, score: number) {
  overlay = { ...overlay, moods: { ...overlay.moods, [staffId]: { week: TODAY, score } } }
  invalidate()
}

/** Finish the next lesson of a course. At the last lesson the skill joins the profile. */
export function advanceCourse(staffId: string, courseId: string) {
  const course = COURSE_BY_ID.get(courseId)
  if (!course) return
  const mine = overlay.progress[staffId] ?? {}
  overlay = { ...overlay, progress: { ...overlay.progress, [staffId]: { ...mine, [courseId]: Math.min(course.lessons, (mine[courseId] ?? 0) + 1) } } }
  invalidate()
}

/** Make a swap live. Returns false if it could not be applied to the current roster. */
export function requestSwap(s: Omit<SwapRecord, 'id'>): SwapRecord | null {
  const rec = { ...s, id: ++swapCounter }
  overlay = { ...overlay, swaps: [...overlay.swaps, rec] }
  invalidate()
  if (getDemo().swaps.some((x) => x.id === rec.id)) return rec
  overlay = { ...overlay, swaps: overlay.swaps.filter((x) => x.id !== rec.id) }
  invalidate()
  return null
}

export function undoSwap(id: number) {
  overlay = { ...overlay, swaps: overlay.swaps.filter((x) => x.id !== id) }
  invalidate()
}
