import type { ShiftRecord, Staff } from '../data/types'
import { timelineFor } from './constraints'
import { dayNumber, fmtDate } from './shifts'
import type { Roster } from './types'

/**
 * Workload risk score: a transparent 0–100 rule count, NOT a prediction.
 * It says how heavy someone's recent and planned workload is, and why.
 */
export const RISK_NOTE = 'A workload risk score is a rule-based check of recent and planned workload. It is not a prediction of who will quit.'

export const RISK_BANDS = { watch: 20, high: 50 } as const

export type RiskBand = 'steady' | 'watch' | 'high'
export type RiskFactor = 'no-weekly-off' | 'overtime' | 'late-nights' | 'short-rest' | 'leave-ignored' | 'no-skill-growth' | 'feedback-falling'

export interface RiskReason {
  factor: RiskFactor
  points: number
  /** plain English, shown to the manager */
  text: string
}

export interface RiskResult {
  staffId: string
  score: number
  band: RiskBand
  reasons: RiskReason[]
  asOf: string
  note: string
}

const WEIGHTS = {
  /** max points per factor */
  weeklyOff: 35,
  overtime: 25,
  nights: 20,
  rest: 36,
  leave: 15,
  skill: 10,
  feedback: 15,
}

function band(score: number): RiskBand {
  return score >= RISK_BANDS.high ? 'high' : score >= RISK_BANDS.watch ? 'watch' : 'steady'
}

function monthsBetween(ym: string, iso: string): number {
  const [y, m] = ym.split('-').map(Number)
  const [Y, M] = iso.split('-').map(Number)
  return (Y - y) * 12 + (M - m)
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`
const round1 = (n: number) => Math.round(n * 10) / 10

/**
 * Score one person. The timeline is their shift history followed by the roster
 * (if given); everything is judged as of the last day on that timeline.
 */
export function scoreRisk(person: Staff, roster: Roster | null, history: ShiftRecord[] = person.history): RiskResult {
  const mine = roster ? roster.assignments.filter((a) => a.staffId === person.id) : []
  const entries = timelineFor(history, mine)
  const lastHistory = history.length ? history[history.length - 1].date : null
  const lastRoster = roster ? roster.dates[roster.dates.length - 1] : null
  const asOf = [lastHistory, lastRoster].filter((d): d is string => !!d).sort().at(-1) ?? '1970-01-01'
  const end = dayNumber(asOf)
  const worked = new Map(entries.map((e) => [e.day, e]))
  const reasons: RiskReason[] = []

  // 1. Days without a weekly off: the longest unbroken run touching the last 14 days.
  let run = 0
  for (let d = end - 13; d <= end; d++) {
    if (!worked.has(d)) continue
    let back = 0
    while (worked.has(d - 1 - back)) back++
    let fwd = 0
    while (worked.has(d + 1 + fwd)) fwd++
    run = Math.max(run, back + 1 + fwd)
  }
  if (run >= 7) {
    reasons.push({
      factor: 'no-weekly-off',
      points: Math.min(WEIGHTS.weeklyOff, Math.round(5 + (run - 7) * 2.5)),
      text: `${run} days without a weekly off`,
    })
  }

  // 2. Overtime over the last 4 weeks (four 7-day blocks ending today).
  let ot = 0
  for (let w = 0; w < 4; w++) {
    const hi = end - w * 7
    const hrs = entries.filter((e) => e.day > hi - 7 && e.day <= hi).reduce((s, e) => s + e.hours, 0)
    ot += Math.max(0, hrs - person.weeklyHours)
  }
  ot = round1(ot)
  if (ot >= 4) {
    reasons.push({
      factor: 'overtime',
      points: Math.min(WEIGHTS.overtime, Math.round(ot * 0.8)),
      text: `${ot} hours of overtime in the last 4 weeks`,
    })
  }

  // 3. Consecutive late nights in the last 14 days.
  let nightRun = 0
  let cur = 0
  for (let d = end - 13; d <= end; d++) {
    cur = worked.get(d)?.night ? cur + 1 : 0
    nightRun = Math.max(nightRun, cur)
  }
  if (nightRun >= 3) {
    reasons.push({
      factor: 'late-nights',
      points: Math.min(WEIGHTS.nights, 7 * (nightRun - 1)),
      text: `${nightRun} late-night shifts in a row`,
    })
  }

  // 4. Short turnarounds (< 11 h rest) in the last 14 days.
  const short: number[] = []
  for (let i = 1; i < entries.length; i++) {
    if (entries[i].day < end - 13) continue
    const rest = entries[i].span.start - entries[i - 1].span.end
    if (rest < 11) short.push(rest)
  }
  if (short.length) {
    const pts = short.reduce((s, r) => s + (r < 8 ? 12 : 7), 0)
    const min = Math.min(...short)
    reasons.push({
      factor: 'short-rest',
      points: Math.min(WEIGHTS.rest, pts),
      text: `${plural(short.length, 'turnaround')} with under 11 hours of rest (shortest ${round1(min)} hours)`,
    })
  }

  // 5. Leave requests that were ignored.
  const hit = person.leave.filter((l) => entries.some((e) => e.date >= l.from && e.date <= l.to))
  if (hit.length) {
    const approved = hit.filter((l) => l.status === 'approved').length
    const range = (l: (typeof hit)[number]) => (l.from === l.to ? fmtDate(l.from) : `${fmtDate(l.from)} to ${fmtDate(l.to)}`)
    reasons.push({
      factor: 'leave-ignored',
      points: Math.min(WEIGHTS.leave, approved * 10 + (hit.length - approved) * 5),
      text: `${approved ? 'Approved' : 'Requested'} leave not honoured: ${hit.map(range).join('; ')}`,
    })
  }

  // 6. Stagnation: no skill growth, falling feedback. A booked course / recognition earns half credit.
  const latest = person.skills.map((s) => s.since).sort().at(-1)
  if (latest) {
    const m = monthsBetween(latest, asOf)
    if (m >= 18) {
      const full = WEIGHTS.skill
      const course = person.plan?.skillCourse
      reasons.push({
        factor: 'no-skill-growth',
        points: course ? full / 2 : full,
        text: `No new skill in ${m} months${course ? ` (course planned: ${course})` : ''}`,
      })
    }
  }
  if (person.feedback.length >= 2) {
    const first = person.feedback[0].score
    const last = person.feedback[person.feedback.length - 1].score
    const drop = round1(first - last)
    if (drop >= 0.3) {
      const full = Math.min(WEIGHTS.feedback, Math.round(drop * 10))
      reasons.push({
        factor: 'feedback-falling',
        points: person.plan?.recognition ? Math.round(full / 2) : full,
        text: `Feedback fell from ${first.toFixed(1)} to ${last.toFixed(1)} over ${person.feedback.length} quarters${person.plan?.recognition ? ' (recognition conversation planned)' : ''}`,
      })
    }
  }

  reasons.sort((a, b) => b.points - a.points)
  const score = Math.min(100, Math.round(reasons.reduce((s, r) => s + r.points, 0)))
  return { staffId: person.id, score, band: band(score), reasons, asOf, note: RISK_NOTE }
}
