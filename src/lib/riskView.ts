import type { ShiftCode, Staff } from '../data/types'
import { dayNumber, fmtDate, timelineFor, type Assignment, type Fix, type RiskBand, type RiskFactor, type RiskReason, type RiskResult, type Roster } from '../engine'
import type { Demo, FixOutcome } from './demo'
import type { CellKind } from './rosterView'

/* ---------------- Kinds of risk ---------------- */

export type RiskKind = 'burnout' | 'rest' | 'stagnation'

const KIND_OF: Record<RiskFactor, RiskKind> = {
  'no-weekly-off': 'burnout',
  overtime: 'burnout',
  'leave-ignored': 'burnout',
  'late-nights': 'rest',
  'short-rest': 'rest',
  'no-skill-growth': 'stagnation',
  'feedback-falling': 'stagnation',
}

export const KIND_LABEL: Record<RiskKind, string> = {
  burnout: 'Burnout',
  rest: 'Rest and fatigue',
  stagnation: 'Stagnation',
}

/** The kind that carries the most points; steady people with nothing to flag return null. */
export function dominantKind(reasons: RiskReason[]): RiskKind | null {
  const pts: Record<RiskKind, number> = { burnout: 0, rest: 0, stagnation: 0 }
  for (const r of reasons) pts[KIND_OF[r.factor]] += r.points
  const best = (Object.keys(pts) as RiskKind[]).sort((a, b) => pts[b] - pts[a])[0]
  return pts[best] > 0 ? best : null
}

export type RiskFilter = 'all' | 'burnout' | 'stagnation'

/** "Burnout" covers workload strain of every sort (hours, rest, nights); "Stagnation" is growth and morale. */
export function matchesFilter(reasons: RiskReason[], f: RiskFilter): boolean {
  if (f === 'all') return true
  return reasons.some((r) => (f === 'stagnation') === (KIND_OF[r.factor] === 'stagnation'))
}

export const BAND_LABEL: Record<RiskBand, string> = { steady: 'Steady', watch: 'Watch', high: 'High' }

export interface RankedPerson {
  person: Staff
  risk: RiskResult
  kind: RiskKind | null
}

/** Highest score first; ties go to whoever has the single heaviest reason. */
export function rankPeople(demo: Demo): RankedPerson[] {
  return demo.people
    .map((person, i) => ({ person, risk: demo.risks[i], kind: dominantKind(demo.risks[i].reasons) }))
    .sort(
      (a, b) =>
        b.risk.score - a.risk.score ||
        (b.risk.reasons[0]?.points ?? 0) - (a.risk.reasons[0]?.points ?? 0) ||
        a.person.name.localeCompare(b.person.name),
    )
}

const ROSTER_FIXES = new Set<Fix['kind']>(['weekly-off', 'shift-pattern', 'honour-leave'])

/** The roster a person's score is judged against: only once a fix has changed their plan. */
export function scoredRoster(demo: Demo, staffId: string): Roster | null {
  return demo.applied.some((a) => a.fix.staffId === staffId && ROSTER_FIXES.has(a.fix.kind)) ? demo.roster : null
}

/* ---------------- Plain-language sentence ---------------- */

const firstName = (p: Staff) => p.name.split(' ')[0]

export function headline(p: Staff, risk: RiskResult, kind: RiskKind | null): string {
  const f = firstName(p)
  if (!risk.reasons.length) return `${f} looks well rested and on track. Nothing to do but say thanks.`
  const top = risk.reasons
    .slice(0, 2)
    .map((r) => r.text.charAt(0).toLowerCase() + r.text.slice(1))
    .join(', and ')
  const lead =
    kind === 'stagnation'
      ? `${f} may be feeling stuck: ${top}.`
      : kind === 'rest'
        ? `${f} is not getting enough time to recover: ${top}.`
        : `${f} has been carrying a lot: ${top}.`
  return risk.band === 'steady' ? `${lead} Small things, nothing urgent.` : lead
}

/* ---------------- Evidence behind each reason ---------------- */

const iso = (day: number) => new Date(day * 86_400_000).toISOString().slice(0, 10)

function clock(absHours: number): string {
  const h = ((absHours % 24) + 24) % 24
  let hh = Math.floor(h)
  let mm = Math.round((h - hh) * 60)
  if (mm === 60) {
    hh += 1
    mm = 0
  }
  const suffix = hh % 24 >= 12 ? 'pm' : 'am'
  const h12 = hh % 12 === 0 ? 12 : hh % 12
  return `${h12}${mm ? ':' + String(mm).padStart(2, '0') : ''} ${suffix}`
}

const trim = (n: number) => String(Math.round(n * 10) / 10).replace(/\.0$/, '')

/** The dates and figures a reason rests on, so a manager can check it against the roster. */
export function evidenceFor(person: Staff, roster: Roster | null, reason: RiskReason, asOf: string): string[] {
  const mine: Assignment[] = roster ? roster.assignments.filter((a) => a.staffId === person.id) : []
  const entries = timelineFor(person.history, mine)
  const end = dayNumber(asOf)
  const worked = new Set(entries.map((e) => e.day))
  const out: string[] = []

  switch (reason.factor) {
    case 'no-weekly-off': {
      let best = { len: 0, from: 0, to: 0 }
      for (let d = end - 13; d <= end; d++) {
        if (!worked.has(d)) continue
        let back = 0
        while (worked.has(d - 1 - back)) back++
        let fwd = 0
        while (worked.has(d + 1 + fwd)) fwd++
        if (back + 1 + fwd > best.len) best = { len: back + 1 + fwd, from: d - back, to: d + fwd }
      }
      out.push(`Worked every day from ${fmtDate(iso(best.from))} to ${fmtDate(iso(best.to))}, ${best.len} days.`)
      out.push('A weekly off is due at least every 7 days.')
      break
    }
    case 'overtime': {
      for (let w = 0; w < 4; w++) {
        const hi = end - w * 7
        const hrs = entries.filter((e) => e.day > hi - 7 && e.day <= hi).reduce((s, e) => s + e.hours, 0)
        const ot = Math.max(0, hrs - person.weeklyHours)
        if (ot > 0) out.push(`${fmtDate(iso(hi - 6))} to ${fmtDate(iso(hi))}: ${trim(hrs)} h worked against ${person.weeklyHours} h contracted (+${trim(ot)} h).`)
      }
      break
    }
    case 'late-nights': {
      let cur: number[] = []
      let best: number[] = []
      for (let d = end - 13; d <= end; d++) {
        const e = entries.find((x) => x.day === d)
        cur = e?.night ? [...cur, d] : []
        if (cur.length > best.length) best = cur
      }
      const shown = best.slice(0, 5).map((d) => fmtDate(iso(d)))
      out.push(`Late finishes on ${shown.join(', ')}${best.length > 5 ? ` and ${best.length - 5} more` : ''}.`)
      break
    }
    case 'short-rest': {
      const gaps: string[] = []
      for (let i = 1; i < entries.length; i++) {
        if (entries[i].day < end - 13) continue
        const rest = entries[i].span.start - entries[i - 1].span.end
        if (rest < 11) gaps.push(`Finished ${clock(entries[i - 1].span.end)} on ${fmtDate(entries[i - 1].date)}, started ${clock(entries[i].span.start)} on ${fmtDate(entries[i].date)}: ${trim(rest)} h to recover.`)
      }
      out.push(...gaps.slice(0, 3))
      if (gaps.length > 3) out.push(`And ${gaps.length - 3} more turnarounds like it.`)
      break
    }
    case 'leave-ignored': {
      for (const l of person.leave) {
        const days = entries.filter((e) => e.date >= l.from && e.date <= l.to).length
        if (!days) continue
        const range = l.from === l.to ? fmtDate(l.from) : `${fmtDate(l.from)} to ${fmtDate(l.to)}`
        out.push(`${l.status === 'approved' ? 'Approved' : 'Requested'} ${range} (${l.reason.toLowerCase()}), still rostered on ${days} of those days.`)
      }
      break
    }
    case 'no-skill-growth': {
      const latest = [...person.skills].sort((a, b) => b.since.localeCompare(a.since))[0]
      if (latest) out.push(`Most recent new skill: ${latest.label} (${latest.since}).`)
      if (person.plan?.skillCourse) out.push(`Course agreed: ${person.plan.skillCourse}.`)
      break
    }
    case 'feedback-falling': {
      out.push(`Feedback by quarter: ${person.feedback.map((f) => `${f.period} ${f.score.toFixed(1)}`).join(', ')}.`)
      if (person.plan?.recognition) out.push('A recognition conversation is planned.')
      break
    }
  }
  return out
}

/* ---------------- Timeline: six weeks back, two weeks planned ---------------- */

export interface TLCell {
  date: string
  kind: CellKind
  /** hours this week have passed the contracted total by this day */
  ot: boolean
  /** part of a run of 7 or more days in a row */
  streak: boolean
  planned: boolean
}

export interface TLWeek {
  start: string
  planned: boolean
  hours: number
  overtime: number
  cells: TLCell[]
}

const HISTORY_KIND: Record<ShiftCode, CellKind> = { O: 'M', D: 'M', E: 'E', C: 'N', X: 'X', LV: 'L' }

export function buildTimeline(person: Staff, roster: Roster): TLWeek[] {
  type Day = { date: string; kind: CellKind; hours: number; planned: boolean }
  const days: Day[] = person.history.map((h) => ({ date: h.date, kind: HISTORY_KIND[h.shift], hours: h.hours, planned: false }))
  const mine = new Map(roster.assignments.filter((a) => a.staffId === person.id).map((a) => [a.date, a.shift]))
  for (const date of roster.dates) {
    const shift = mine.get(date)
    const onLeave = person.leave.some((l) => l.status === 'approved' && date >= l.from && date <= l.to)
    days.push({ date, kind: shift ?? (onLeave ? 'L' : 'X'), hours: shift ? 8 : 0, planned: true })
  }

  const isWork = (k: CellKind) => k === 'M' || k === 'E' || k === 'N'
  // flag every day that sits inside a run of 7+ worked days
  const streak = new Array<boolean>(days.length).fill(false)
  for (let i = 0; i < days.length; ) {
    if (!isWork(days[i].kind)) {
      i++
      continue
    }
    let j = i
    while (j < days.length && isWork(days[j].kind)) j++
    if (j - i >= 7) for (let k = i; k < j; k++) streak[k] = true
    i = j
  }

  const weeks: TLWeek[] = []
  for (let w = 0; w * 7 < days.length; w++) {
    const slice = days.slice(w * 7, w * 7 + 7)
    let cum = 0
    const cells = slice.map((d, k) => {
      cum += d.hours
      return { date: d.date, kind: d.kind, ot: d.hours > 0 && cum > person.weeklyHours, streak: streak[w * 7 + k], planned: d.planned }
    })
    weeks.push({ start: slice[0].date, planned: slice[0].planned, hours: cum, overtime: Math.max(0, cum - person.weeklyHours), cells })
  }
  return weeks
}

/* ---------------- What changed after a fix ---------------- */

export interface Outcome {
  staffId: string
  fixKind: Fix['kind']
  /** the single most important change, in a sentence */
  headline: string
  /** colleagues who picked up shifts, and other consequences */
  covers: string[]
  /** "before → after" rows for the reasons that eased */
  eased: { before: string; after: string | null }[]
  scoreBefore: number
  scoreAfter: number
  bandBefore: RiskBand
  bandAfter: RiskBand
  shiftsBefore: number
  shiftsAfter: number
  /** planned dates whose shift for this person changed */
  changedDates: string[]
}

export function describeOutcome(o: FixOutcome): Outcome {
  const id = o.fix.staffId
  const mineOf = (r: Roster) => new Map(r.assignments.filter((a) => a.staffId === id).map((a) => [a.date, a.shift]))
  const before = mineOf(o.prev.roster)
  const after = mineOf(o.next.roster)
  const changedDates = o.next.roster.dates.filter((d) => before.get(d) !== after.get(d))
  const eased: Outcome['eased'] = []
  for (const r of o.before.reasons) {
    const now = o.after.reasons.find((x) => x.factor === r.factor)
    if (!now) eased.push({ before: r.text, after: null })
    else if (now.points < r.points) eased.push({ before: r.text, after: now.text })
  }
  return {
    staffId: id,
    fixKind: o.fix.kind,
    headline: o.result.changes[0],
    covers: o.result.changes.slice(1),
    eased: eased.slice(0, 3),
    scoreBefore: o.before.score,
    scoreAfter: o.after.score,
    bandBefore: o.before.band,
    bandAfter: o.after.band,
    shiftsBefore: before.size,
    shiftsAfter: after.size,
    changedDates,
  }
}
