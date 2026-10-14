import { departments } from '../data/staff'
import type { OccupancyDay, Staff } from '../data/types'
import {
  assignmentsByPerson,
  computeHours,
  computeUnmet,
  personViolations,
  pendingLeaveOn,
  timelineFor,
} from './constraints'
import { computeDemand } from './demand'
import { SHIFT_INFO, SHIFT_LEN, addDays, dayNumber, fmtDate, hasSkill, resolveOptions, sortAssignments } from './shifts'
import type {
  Assignment,
  DemandDay,
  Decision,
  EngineShift,
  ResolvedOptions,
  Roster,
  RosterOptions,
  UnmetDemand,
} from './types'

const SHIFT_ORDER: EngineShift[] = ['N', 'M', 'E']

function weekOf(date: string, start: number): number {
  return Math.floor((dayNumber(date) - start) / 7)
}

function prefers(p: Staff, shift: EngineShift): boolean | null {
  const pr = p.preferredShifts
  if (shift === 'M') return pr.includes('O') || pr.includes('D')
  if (shift === 'E') return pr.includes('E') || pr.includes('C') || pr.includes('D')
  return pr.includes('C') ? true : null
}

/** Mutable working state for building or repairing one roster. */
/** Weights the greedy pass is tried with; the best resulting roster wins. */
interface Profile {
  /** points per night already worked (night fairness) */
  nightFair: number
  /** bonus for continuing a night block, up to 3 nights */
  nightBlock: number
  /** deterministic tie-shaking amplitude (seeded), 0 = none */
  noise: number
  seed: number
}
const BASE_PROFILES = [
  { nightFair: 22, nightBlock: 14 },
  { nightFair: 10, nightBlock: 24 },
  { nightFair: 4, nightBlock: 30 },
  { nightFair: 22, nightBlock: 0 },
]
/** 4 hand-tuned weightings (seeded noise is available but off). Same inputs always give the same roster. */
const PROFILES: Profile[] = BASE_PROFILES.flatMap((b) =>
  Array.from({ length: 1 }, (_, seed) => ({ ...b, seed, noise: 0 })),
)

function rng(seed: number) {
  let t = (seed + 1) * 0x6d2b79f5
  return () => {
    t = (t + 0x6d2b79f5) | 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function createEngine(staff: Staff[], demand: DemandDay[], o: ResolvedOptions, initial: Assignment[] = [], profile: Profile = PROFILES[0]) {
  const rand = rng(profile.seed)
  const dates = demand.map((d) => d.date)
  const start = dayNumber(dates[0])
  const assignments: Assignment[] = [...initial]
  const decisions: Decision[] = []
  const byId = new Map(staff.map((s) => [s.id, s]))
  const mineOf = (id: string) => assignments.filter((a) => a.staffId === id)

  function weekHours(id: string, week: number): number {
    return mineOf(id).filter((a) => weekOf(a.date, start) === week).length * SHIFT_LEN
  }

  function contractedFor(p: Staff, week: number): number {
    return p.weeklyHours * (Math.min(7, dates.length - week * 7) / 7)
  }

  /** Can this person take this shift without breaking any hard rule (and, unless allowOT, any contracted hours)? */
  function canAdd(p: Staff, date: string, shift: EngineShift, allowOT: boolean): boolean {
    const mine = mineOf(p.id)
    if (mine.some((a) => a.date === date)) return false
    const week = weekOf(date, start)
    const cap = contractedFor(p, week) + (allowOT ? o.maxOvertimePerWeek : 0)
    if (weekHours(p.id, week) + SHIFT_LEN > cap) return false
    return personViolations(p, [...mine, { staffId: p.id, date, shift }], o).length === 0
  }

  /** Lower is better. Fairness + overtime + preferences + night spread + turnaround comfort. */
  function cost(p: Staff, date: string, shift: EngineShift, firstAidCovered: boolean): number {
    const mine = mineOf(p.id)
    const day = dayNumber(date)
    const week = weekOf(date, start)
    const entries = timelineFor(p.history, mine)
    const worked = new Set(entries.map((e) => e.day))
    const prev = [...entries].reverse().find((e) => e.day < day)
    let c = (weekHours(p.id, week) / Math.max(8, contractedFor(p, week))) * 40
    if (weekHours(p.id, week) + SHIFT_LEN > contractedFor(p, week)) c += 35 // overtime
    const pref = prefers(p, shift)
    if (pref === true) c -= 12
    else if (pref === false) c += 12
    if (shift === 'N') {
      const nights = mine.filter((a) => a.shift === 'N').length
      let run = 0
      while (entries.some((e) => e.day === day - 1 - run && e.night)) run++
      c += nights * profile.nightFair + (run >= 1 && run < 3 ? -profile.nightBlock : 0) + (run >= 3 ? 45 : 0) // night blocks of up to 3, then a break
    }
    if (prev) {
      const rest = dayNumber(date) * 24 + SHIFT_INFO[shift].start - prev.span.end
      if (rest < 16) c += 10 // legal but tight
      if (prev.day === day - 1 && prev.span.start % 24 === SHIFT_INFO[shift].start) c -= 4 // steady pattern
    }
    let streak = 0
    while (worked.has(day - 1 - streak)) streak++
    if (streak >= 4) c += (streak - 3) * 6
    if (pendingLeaveOn(p, date)) c += 60
    if (!firstAidCovered && hasSkill(p, 'first-aid')) c -= 40
    return c + (profile.noise ? rand() * profile.noise : 0)
  }

  function add(p: Staff, date: string, shift: EngineShift) {
    assignments.push({ staffId: p.id, date, shift })
  }

  function remove(id: string, date: string) {
    const i = assignments.findIndex((a) => a.staffId === id && a.date === date)
    if (i >= 0) assignments.splice(i, 1)
  }

  function firstAidOn(date: string): boolean {
    return assignments.some((a) => a.date === date && hasSkill(byId.get(a.staffId)!, 'first-aid'))
  }

  /** Pass 1: day by day, no overtime, best-scoring eligible person per slot. */
  function greedy() {
    for (const d of demand) {
      for (const shift of SHIFT_ORDER) {
        for (const dept of departments) {
          const slot = d.slots.find((s) => s.shift === shift && s.department === dept)
          if (!slot) continue
          const pool = staff.filter((p) => p.department === dept)
          for (let k = 0; k < slot.count; k++) {
            let cands = pool.filter((p) => canAdd(p, d.date, shift, false))
            if (slot.requiresSkill) {
              const have = assignments.some(
                (a) => a.date === d.date && a.shift === shift && byId.get(a.staffId)!.department === dept && hasSkill(byId.get(a.staffId)!, slot.requiresSkill!),
              )
              const skilled = cands.filter((p) => hasSkill(p, slot.requiresSkill!))
              if (!have && skilled.length) cands = skilled
            }
            if (!cands.length) break
            const faCovered = firstAidOn(d.date)
            const best = cands
              .map((p) => ({ p, c: cost(p, d.date, shift, faCovered) }))
              .sort((a, b) => a.c - b.c || a.p.id.localeCompare(b.p.id))[0].p
            add(best, d.date, shift)
          }
        }
      }
    }
  }

  /**
   * Local repair move: someone working another shift that day switches to the empty one,
   * and a rested colleague takes the shift they left. No overtime needed.
   */
  function swapIn(dept: Staff['department'], date: string, shift: EngineShift, allowOT = false): boolean {
    const here = assignments.filter((a) => a.date === date && a.shift !== shift && byId.get(a.staffId)!.department === dept)
    for (const a of here) {
      const q = byId.get(a.staffId)!
      const snapshot = [...assignments]
      remove(q.id, date)
      if (canAdd(q, date, shift, allowOT)) {
        add(q, date, shift)
        const faCovered = firstAidOn(date)
        const pool = staff.filter((p) => p.department === dept && p.id !== q.id && canAdd(p, date, a.shift, allowOT))
        if (pool.length) {
          const best = pool
            .map((p) => ({ p, c: cost(p, date, a.shift, faCovered) }))
            .sort((x, y) => x.c - y.c || x.p.id.localeCompare(y.p.id))[0].p
          add(best, date, a.shift)
          decisions.push({
            kind: 'note',
            staffId: q.id,
            date,
            text: `${q.name} moves to ${SHIFT_INFO[shift].label.toLowerCase()} on ${fmtDate(date)} and ${best.name} takes the ${SHIFT_INFO[a.shift].label.toLowerCase()}, so ${dept} is covered without overtime.`,
          })
          return true
        }
      }
      assignments.splice(0, assignments.length, ...snapshot)
    }
    return false
  }

  /**
   * Ejection chain, depth 1: a colleague is blocked today only by their shift on the
   * day before or after. Free them from it (a third person covers that day), then use them today.
   */
  function vacateAdjacent(dept: Staff['department'], date: string, shift: EngineShift, allowOT: boolean): boolean {
    return vacateDay(dept, date, shift, allowOT, -1) || vacateDay(dept, date, shift, allowOT, 1)
  }

  function vacateDay(dept: Staff['department'], date: string, shift: EngineShift, allowOT: boolean, offset: -1 | 1): boolean {
    const yesterday = addDays(date, offset)
    for (const q of staff.filter((p) => p.department === dept)) {
      const prior = assignments.find((a) => a.staffId === q.id && a.date === yesterday)
      if (!prior || assignments.some((a) => a.staffId === q.id && a.date === date)) continue
      const snapshot = [...assignments]
      remove(q.id, yesterday)
      if (canAdd(q, date, shift, allowOT)) {
        const pool = staff.filter((p) => p.department === dept && p.id !== q.id && canAdd(p, yesterday, prior.shift, allowOT))
        if (pool.length) {
          const best = pool
            .map((p) => ({ p, c: cost(p, yesterday, prior.shift, firstAidOn(yesterday)) }))
            .sort((x, y) => x.c - y.c || x.p.id.localeCompare(y.p.id))[0].p
          add(best, yesterday, prior.shift)
          add(q, date, shift)
          decisions.push({
            kind: 'note',
            staffId: q.id,
            date,
            text: `${best.name} takes ${q.name}'s ${SHIFT_INFO[prior.shift].label.toLowerCase()} on ${fmtDate(yesterday)} so ${q.name} can work ${SHIFT_INFO[shift].label.toLowerCase()} on ${fmtDate(date)}.`,
          })
          return true
        }
      }
      assignments.splice(0, assignments.length, ...snapshot)
    }
    return false
  }

  /** Pass 2: local repair of unmet demand, allowing capped overtime. */
  function fillUnmet() {
    for (let round = 0; round < 4; round++) {
      const unmet = computeUnmet(staff, demand, assignments)
      let progress = false
      for (const u of unmet) {
        if (u.kind === 'headcount' && u.department && u.shift) {
          for (let k = 0; k < u.missing; k++) {
            if (swapIn(u.department, u.date, u.shift) || vacateAdjacent(u.department, u.date, u.shift, false)) {
              progress = true
              continue
            }
            const pool = staff.filter((p) => p.department === u.department && canAdd(p, u.date, u.shift!, true))
            if (!pool.length) {
              if (swapIn(u.department, u.date, u.shift, true) || vacateAdjacent(u.department, u.date, u.shift, true)) {
                progress = true
                continue
              }
              break
            }
            const faCovered = firstAidOn(u.date)
            const best = pool
              .map((p) => ({ p, c: cost(p, u.date, u.shift!, faCovered) }))
              .sort((a, b) => a.c - b.c || a.p.id.localeCompare(b.p.id))[0].p
            const week = weekOf(u.date, start)
            const overtime = weekHours(best.id, week) + SHIFT_LEN > contractedFor(best, week)
            add(best, u.date, u.shift)
            progress = true
            decisions.push({
              kind: overtime ? 'overtime' : 'note',
              staffId: best.id,
              date: u.date,
              text: overtime
                ? `${best.name} takes an extra ${SHIFT_INFO[u.shift].label.toLowerCase()} shift on ${fmtDate(u.date)}; ${u.department} has no one else rested and free (overtime).`
                : `${best.name} fills a late gap in ${u.department} on ${fmtDate(u.date)}.`,
            })
          }
        } else if (u.kind === 'skill' && u.department && u.shift) {
          const slotAssigned = assignments.filter(
            (a) => a.date === u.date && a.shift === u.shift && byId.get(a.staffId)!.department === u.department,
          )
          const need = demand.find((d) => d.date === u.date)!.slots.find((s) => s.department === u.department && s.shift === u.shift)!.requiresSkill!
          const skilled = staff.filter((p) => p.department === u.department && hasSkill(p, need))
          for (const swapOut of slotAssigned) {
            const out = byId.get(swapOut.staffId)!
            const snapshot = [...assignments]
            remove(out.id, u.date)
            const cand = skilled.find((p) => canAdd(p, u.date, u.shift!, true))
            if (cand) {
              add(cand, u.date, u.shift)
              progress = true
              decisions.push({
                kind: 'skill',
                staffId: cand.id,
                date: u.date,
                text: `${cand.name} replaces ${out.name} on ${fmtDate(u.date)} ${SHIFT_INFO[u.shift].label.toLowerCase()} so ${u.department} has a ${need} skill on shift.`,
              })
              break
            }
            assignments.splice(0, assignments.length, ...snapshot)
          }
        } else if (u.kind === 'first-aid') {
          const cands = staff
            .filter((p) => hasSkill(p, 'first-aid'))
            .flatMap((p) => (['M', 'E'] as EngineShift[]).filter((s) => canAdd(p, u.date, s, true)).map((s) => ({ p, s })))
            .map((x) => ({ ...x, c: cost(x.p, u.date, x.s, false) }))
            .sort((a, b) => a.c - b.c || a.p.id.localeCompare(b.p.id))
          if (cands.length) {
            const { p, s } = cands[0]
            add(p, u.date, s)
            progress = true
            decisions.push({
              kind: 'first-aid',
              staffId: p.id,
              date: u.date,
              text: `${p.name} added on ${fmtDate(u.date)} ${SHIFT_INFO[s].label.toLowerCase()} so someone with first-aid training is on site.`,
            })
          }
        }
      }
      if (!progress) break
    }
  }

  /** Remove assignments that break a hard rule until none remain (defensive repair). */
  function removeViolations() {
    for (let guard = 0; guard < 500; guard++) {
      let found: { id: string; date: string; text: string } | null = null
      const by = assignmentsByPerson(staff, assignments)
      for (const p of staff) {
        const v = personViolations(p, sortAssignments(by.get(p.id)!), o)[0]
        if (v) {
          found = { id: p.id, date: v.date, text: v.text }
          break
        }
      }
      if (!found) return
      remove(found.id, found.date)
      decisions.push({ kind: 'repair', staffId: found.id, date: found.date, text: `Removed a shift to fix a rule break: ${found.text}` })
    }
  }

  return { assignments, decisions, greedy, fillUnmet, removeViolations, add, remove, canAdd, cost, byId }
}

function describe(staff: Staff[], demand: DemandDay[], assignments: Assignment[], unmet: UnmetDemand[], o: ResolvedOptions): Decision[] {
  const out: Decision[] = []
  const start = demand[0].date

  // Forced rest: people already past the consecutive-days limit coming in.
  for (const p of staff) {
    const entries = timelineFor(p.history, [])
    const day0 = dayNumber(start)
    let streak = 0
    while (entries.some((e) => e.day === day0 - 1 - streak)) streak++
    if (streak >= o.maxConsecutiveDays) {
      out.push({
        kind: 'rest',
        staffId: p.id,
        date: start,
        text: `${p.name} is off on ${fmtDate(start)}: ${streak} days worked in a row, limit is ${o.maxConsecutiveDays}.`,
      })
    }
  }

  // Leave.
  for (const p of staff) {
    for (const l of p.leave) {
      const dates = demand.map((d) => d.date).filter((d) => d >= l.from && d <= l.to)
      if (!dates.length) continue
      const worked = dates.filter((d) => assignments.some((a) => a.staffId === p.id && a.date === d))
      const range = l.from === l.to ? fmtDate(l.from) : `${fmtDate(l.from)} to ${fmtDate(l.to)}`
      if (l.status === 'approved') {
        out.push({ kind: 'leave', staffId: p.id, text: `${p.name}'s approved leave (${range}) is kept; cover comes from ${p.department} colleagues.` })
      } else if (!worked.length) {
        out.push({ kind: 'leave', staffId: p.id, text: `${p.name}'s pending leave (${range}) is honoured.` })
      } else {
        out.push({ kind: 'leave', staffId: p.id, text: `${p.name}'s pending leave (${range}) could not be fully honoured: ${worked.length} day(s) needed for cover.` })
      }
    }
  }

  // Night spread.
  const nightPeople = staff
    .map((p) => ({ p, n: assignments.filter((a) => a.staffId === p.id && a.shift === 'N').length }))
    .filter((x) => x.n > 0)
  if (nightPeople.length) {
    const byDept = new Map<string, string[]>()
    for (const { p, n } of nightPeople) byDept.set(p.department, [...(byDept.get(p.department) ?? []), `${p.name.split(' ')[0]} ${n}`])
    for (const [dept, list] of byDept) {
      out.push({ kind: 'nights', text: `${dept} night shifts are spread across the team: ${list.join(', ')}.` })
    }
  }

  for (const u of unmet) out.push({ kind: 'unmet', date: u.date, text: `Not covered: ${u.text}` })
  return out
}

export function finalizeRoster(
  kind: Roster['kind'],
  staff: Staff[],
  demand: DemandDay[],
  assignments: Assignment[],
  decisions: Decision[],
  o: ResolvedOptions,
): Roster {
  const sorted = sortAssignments(assignments)
  const dates = demand.map((d) => d.date)
  const hours = computeHours(staff, sorted, dates)
  const unmet = computeUnmet(staff, demand, sorted)
  const base = kind === 'engine' ? describe(staff, demand, sorted, unmet, o) : []
  const all = [...base, ...decisions]
  const totals = Object.values(hours)
  return {
    kind,
    startDate: dates[0],
    dates,
    assignments: sorted,
    demand,
    hours,
    totalOvertimeHours: totals.reduce((s, h) => s + h.overtimeHours, 0),
    totalOvertimeCost: totals.reduce((s, h) => s + h.overtimeCost, 0),
    unmet,
    decisions: all,
  }
}

/** Lower is better: uncovered shifts first, then overtime cost, then how uneven night shifts are inside a department. */
function penalty(r: Roster, staff: Staff[]): number {
  const missing = r.unmet.reduce((n, u) => n + u.missing, 0)
  let nightRange = 0
  for (const dept of new Set(staff.map((p) => p.department))) {
    const nights = staff.filter((p) => p.department === dept).map((p) => r.hours[p.id].nights)
    if (nights.some((n) => n > 0)) nightRange += Math.max(...nights) - Math.min(...nights)
  }
  return missing * 100_000 + r.totalOvertimeCost + nightRange * 800
}

/** Constraint-based, deterministic roster: greedy by day, then a local-repair pass. */
export function generateRoster(staff: Staff[], forecast: OccupancyDay[], options: RosterOptions = {}): Roster {
  const o = resolveOptions(options)
  const demand = computeDemand(forecast, o.rooms)
  let best: Roster | null = null
  for (const profile of PROFILES) {
    const eng = createEngine(staff, demand, o, [], profile)
    eng.greedy()
    eng.fillUnmet()
    eng.removeViolations()
    const r = finalizeRoster('engine', staff, demand, eng.assignments, eng.decisions, o)
    if (!best || penalty(r, staff) < penalty(best, staff)) best = r
  }
  return best!
}

/** Take any roster, strip hard-rule breaks and refill gaps. */
export function repairRoster(staff: Staff[], roster: Roster, options: RosterOptions = {}): Roster {
  const o = resolveOptions(options)
  const eng = createEngine(staff, roster.demand, o, roster.assignments)
  eng.removeViolations()
  eng.fillUnmet()
  eng.removeViolations()
  return finalizeRoster('engine', staff, roster.demand, eng.assignments, eng.decisions, o)
}

/** Move one slot to the best available colleague in the same department (used by fixes). */
export function reassignSlot(
  staff: Staff[],
  roster: Roster,
  removed: Assignment[],
  o: ResolvedOptions,
): { assignments: Assignment[]; notes: Decision[] } {
  const removedKeys = new Set(removed.map((r) => `${r.staffId}|${r.date}`))
  const kept = roster.assignments.filter((a) => !removedKeys.has(`${a.staffId}|${a.date}`))
  const eng = createEngine(staff, roster.demand, o, kept)
  const notes: Decision[] = []
  for (const r of removed) {
    const who = eng.byId.get(r.staffId)!
    const pool = staff.filter((p) => p.department === who.department && p.id !== who.id && eng.canAdd(p, r.date, r.shift, true))
    if (!pool.length) {
      notes.push({ kind: 'unmet', staffId: who.id, date: r.date, text: `No one in ${who.department} can take ${who.name}'s ${SHIFT_INFO[r.shift].label.toLowerCase()} shift on ${fmtDate(r.date)}.` })
      continue
    }
    const faCovered = eng.assignments.some((a) => a.date === r.date && hasSkill(eng.byId.get(a.staffId)!, 'first-aid'))
    const best = pool
      .map((p) => ({ p, c: eng.cost(p, r.date, r.shift, faCovered) }))
      .sort((a, b) => a.c - b.c || a.p.id.localeCompare(b.p.id))[0].p
    eng.add(best, r.date, r.shift)
    notes.push({ kind: 'note', staffId: best.id, date: r.date, text: `${best.name} covers ${who.name}'s ${SHIFT_INFO[r.shift].label.toLowerCase()} shift on ${fmtDate(r.date)}.` })
  }
  return { assignments: eng.assignments, notes }
}
