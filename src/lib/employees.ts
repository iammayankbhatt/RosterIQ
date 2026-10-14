import { departments, lastSeason } from '../data'
import type { Department, ShiftCode, Staff } from '../data/types'
import { OVERTIME_MULTIPLIER, SHIFT_LEN, hasSkill, type RiskBand, type RiskResult, type SkillKey } from '../engine'
import { TODAY } from './courses'
import type { Demo } from './demo'
import { buildTimeline } from './riskView'
import { managerUpdates } from './staffApp'

/** Department colours for charts: palette colours plus one sage tint, so six stay distinguishable. */
export const DEPT_COLOUR: Record<Department, string> = {
  'Front Desk': 'var(--pine)',
  Housekeeping: 'var(--saffron)',
  Kitchen: 'var(--terracotta)',
  'F&B Service': 'var(--teal)',
  Maintenance: 'var(--stone)',
  Security: '#9cc5b7',
}

export const BAND_COLOUR: Record<RiskBand, string> = { steady: 'var(--teal)', watch: 'var(--saffron)', high: 'var(--terracotta)' }

const DAY = 86_400_000
const dayOf = (iso: string) => Date.parse(`${iso}T00:00:00Z`)
const round1 = (n: number) => Math.round(n * 10) / 10

export const tenureYears = (p: Staff): number => (dayOf(TODAY) - dayOf(p.joinDate)) / (365.25 * DAY)

export function tenureLabel(years: number): string {
  if (years < 1) return `${Math.max(1, Math.round(years * 12))} mo`
  const y = Math.floor(years)
  const m = Math.round((years - y) * 12)
  return m >= 12 ? `${y + 1} yr` : m ? `${y} yr ${m} mo` : `${y} yr`
}

/* ---------------- Weekly hours ---------------- */

export interface WeekPoint {
  /** first day of the week, ISO */
  start: string
  hours: number
  contracted: number
  overtime: number
  /** true for the two planned weeks */
  planned: boolean
}

/** Six worked weeks from the shift history, then the two planned weeks from the live roster. */
export function weeklyHours(p: Staff, demo: Demo): WeekPoint[] {
  const out: WeekPoint[] = []
  for (let w = 0; w < 6; w++) {
    const slice = p.history.slice(w * 7, w * 7 + 7)
    const hours = slice.reduce((s, r) => s + r.hours, 0)
    out.push({ start: slice[0].date, hours, contracted: p.weeklyHours, overtime: Math.max(0, hours - p.weeklyHours), planned: false })
  }
  for (let w = 0; w < 2; w++) {
    const dates = demo.roster.dates.slice(w * 7, w * 7 + 7)
    const hours = demo.roster.assignments.filter((a) => a.staffId === p.id && dates.includes(a.date)).length * SHIFT_LEN
    out.push({ start: dates[0], hours, contracted: p.weeklyHours, overtime: Math.max(0, hours - p.weeklyHours), planned: true })
  }
  return out
}

/* ---------------- One person ---------------- */

export interface MixSlice {
  key: 'day' | 'evening' | 'late' | 'off' | 'leave'
  label: string
  value: number
  colour: string
}

const MIX: Record<ShiftCode, MixSlice['key']> = { O: 'day', D: 'day', E: 'evening', C: 'late', X: 'off', LV: 'leave' }
const MIX_META: Record<MixSlice['key'], { label: string; colour: string }> = {
  day: { label: 'Morning or day', colour: 'var(--saffron)' },
  evening: { label: 'Evening', colour: 'var(--teal)' },
  late: { label: 'Late close', colour: 'var(--pine)' },
  off: { label: 'Day off', colour: '#9cc5b7' },
  leave: { label: 'Leave', colour: 'var(--stone)' },
}

export interface PersonStats {
  person: Staff
  risk: RiskResult
  tenure: number
  weeks: WeekPoint[]
  /** overtime hours over the six worked weeks */
  ot6: number
  /** overtime hours in the two planned weeks */
  otNext: number
  /** assumption: overtime paid at 2x the hourly rate */
  otCost6: number
  /** assumption: contracted hours x rate x 52 / 12 */
  monthlyBase: number
  /** the six worked weeks, split by kind of day */
  mix: MixSlice[]
  daysWorked: number
  daysOff: number
  longestRun: number
  /** next 14 days, from the live roster */
  next14: { shifts: number; nights: number; weekendShifts: number }
  feedback: { first: number; latest: number; delta: number; series: { period: string; score: number }[] }
  onLeaveNow: boolean
  pendingLeave: boolean
  /** a manager fix or a swap has touched this person */
  updated: boolean
}

export function personStats(p: Staff, risk: RiskResult, demo: Demo): PersonStats {
  const weeks = weeklyHours(p, demo)
  const counts = new Map<MixSlice['key'], number>()
  for (const r of p.history) counts.set(MIX[r.shift], (counts.get(MIX[r.shift]) ?? 0) + 1)
  const mix = (Object.keys(MIX_META) as MixSlice['key'][]).map((key) => ({ key, ...MIX_META[key], value: counts.get(key) ?? 0 }))

  const mine = demo.roster.assignments.filter((a) => a.staffId === p.id)
  const wd = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay()
  const fb = p.feedback
  const timeline = buildTimeline(p, demo.roster).flatMap((w) => w.cells)
  let longestRun = 0
  let run = 0
  for (const c of timeline) {
    run = c.kind === 'M' || c.kind === 'E' || c.kind === 'N' ? run + 1 : 0
    longestRun = Math.max(longestRun, run)
  }
  const worked = p.history.filter((r) => r.hours > 0).length

  return {
    person: p,
    risk,
    tenure: tenureYears(p),
    weeks,
    ot6: round1(weeks.slice(0, 6).reduce((s, w) => s + w.overtime, 0)),
    otNext: round1(weeks.slice(6).reduce((s, w) => s + w.overtime, 0)),
    otCost6: Math.round(weeks.slice(0, 6).reduce((s, w) => s + w.overtime, 0) * p.hourlyRate * OVERTIME_MULTIPLIER),
    monthlyBase: Math.round((p.weeklyHours * p.hourlyRate * 52) / 12),
    mix,
    daysWorked: worked,
    daysOff: p.history.filter((r) => r.shift === 'X').length,
    longestRun,
    next14: {
      shifts: mine.length,
      nights: mine.filter((a) => a.shift === 'N').length,
      weekendShifts: mine.filter((a) => [0, 6].includes(wd(a.date))).length,
    },
    feedback: { first: fb[0].score, latest: fb[fb.length - 1].score, delta: round1(fb[fb.length - 1].score - fb[0].score), series: fb.map((f) => ({ period: f.period, score: f.score })) },
    onLeaveNow: p.leave.some((l) => l.status === 'approved' && TODAY >= l.from && TODAY <= l.to),
    pendingLeave: p.leave.some((l) => l.status === 'pending'),
    updated: demo.changes.some((c) => c.staffId === p.id) || managerUpdates(demo, p.id).length > 0,
  }
}

/* ---------------- The whole team ---------------- */

export interface OrgStats {
  headcount: number
  byDept: { dept: Department; count: number; colour: string }[]
  avgTenure: number
  newHires: number
  longest: { name: string; years: number }
  tenureBuckets: { label: string; count: number }[]
  bands: Record<RiskBand, number>
  /** worked + planned weeks for everyone together */
  weeks: { start: string; hours: number; contracted: number; overtime: number; planned: boolean }[]
  ot6: number
  otCost6: number
  monthlyPayroll: number
  /** average feedback per quarter, for each department and overall */
  feedback: { period: string; overall: number; byDept: Record<Department, number> }[]
  latestFeedback: number
  feedbackDelta: number
  skills: { key: SkillKey; label: string; holders: number; names: string[] }[]
  shiftMix: { label: string; value: number; colour: string }[]
  leave: { onLeaveNow: number; approvedUpcoming: number; pending: number }
  /** last season's exits, sample record */
  attrition: { byDept: { dept: Department; count: number; cost: number }[]; total: number; cost: number }
  updatedCount: number
}

const SKILL_LABEL: Record<SkillKey, string> = { 'front-desk': 'Front-desk certified', cook: 'Cook', 'first-aid': 'First-aid trained' }

export function orgStats(demo: Demo): OrgStats {
  const stats = demo.people.map((p, i) => personStats(p, demo.risks[i], demo))
  const people = demo.people
  const n = people.length

  const byDept = departments.map((dept) => ({ dept, count: people.filter((p) => p.department === dept).length, colour: DEPT_COLOUR[dept] }))
  const tenures = stats.map((s) => s.tenure)
  const longest = stats.reduce((b, s) => (s.tenure > b.tenure ? s : b))
  const bucket = (lo: number, hi: number) => tenures.filter((t) => t >= lo && t < hi).length
  const bands: Record<RiskBand, number> = { steady: 0, watch: 0, high: 0 }
  for (const r of demo.risks) bands[r.band]++

  const weeks = Array.from({ length: 8 }, (_, w) => {
    const pts = stats.map((s) => s.weeks[w])
    return {
      start: pts[0].start,
      hours: round1(pts.reduce((s, x) => s + x.hours, 0)),
      contracted: pts.reduce((s, x) => s + x.contracted, 0),
      overtime: round1(pts.reduce((s, x) => s + x.overtime, 0)),
      planned: w >= 6,
    }
  })

  const periods = people[0].feedback.map((f) => f.period)
  const feedback = periods.map((period, qi) => ({
    period,
    overall: round1(people.reduce((s, p) => s + p.feedback[qi].score, 0) / n),
    byDept: Object.fromEntries(
      departments.map((d) => {
        const g = people.filter((p) => p.department === d)
        return [d, round1(g.reduce((s, p) => s + p.feedback[qi].score, 0) / g.length)]
      }),
    ) as Record<Department, number>,
  }))

  const skills = (Object.keys(SKILL_LABEL) as SkillKey[]).map((key) => {
    const who = people.filter((p) => hasSkill(p, key))
    return { key, label: SKILL_LABEL[key], holders: who.length, names: who.map((p) => p.name) }
  })

  const shifts = demo.roster.assignments
  const shiftMix = [
    { label: 'Morning', value: shifts.filter((a) => a.shift === 'M').length, colour: 'var(--saffron)' },
    { label: 'Evening', value: shifts.filter((a) => a.shift === 'E').length, colour: 'var(--teal)' },
    { label: 'Night', value: shifts.filter((a) => a.shift === 'N').length, colour: 'var(--pine)' },
  ]

  const first = demo.roster.dates[0]
  const last = demo.roster.dates[demo.roster.dates.length - 1]
  const leaves = people.flatMap((p) => p.leave)
  const exits = lastSeason.resignations
  const exitDepts = departments
    .map((dept) => ({ dept, count: exits.filter((r) => r.department === dept).length, cost: exits.filter((r) => r.department === dept).reduce((s, r) => s + r.replacementCost, 0) }))
    .filter((d) => d.count > 0)

  const lastFb = feedback[feedback.length - 1].overall
  return {
    headcount: n,
    byDept,
    avgTenure: round1(tenures.reduce((s, t) => s + t, 0) / n),
    newHires: tenures.filter((t) => t < 1).length,
    longest: { name: longest.person.name, years: round1(longest.tenure) },
    tenureBuckets: [
      { label: 'Under 1 yr', count: bucket(0, 1) },
      { label: '1 to 3 yrs', count: bucket(1, 3) },
      { label: '3 to 5 yrs', count: bucket(3, 5) },
      { label: '5 to 8 yrs', count: bucket(5, 8) },
      { label: '8+ yrs', count: bucket(8, 100) },
    ],
    bands,
    weeks,
    ot6: round1(stats.reduce((s, x) => s + x.ot6, 0)),
    otCost6: stats.reduce((s, x) => s + x.otCost6, 0),
    monthlyPayroll: stats.reduce((s, x) => s + x.monthlyBase, 0),
    feedback,
    latestFeedback: lastFb,
    feedbackDelta: round1(lastFb - feedback[0].overall),
    skills,
    shiftMix,
    leave: {
      onLeaveNow: stats.filter((s) => s.onLeaveNow).length,
      approvedUpcoming: leaves.filter((l) => l.status === 'approved' && l.to >= first && l.from <= last).length,
      pending: leaves.filter((l) => l.status === 'pending' && l.to >= first && l.from <= last).length,
    },
    attrition: { byDept: exitDepts, total: exits.length, cost: exits.reduce((s, r) => s + r.replacementCost, 0) },
    updatedCount: stats.filter((s) => s.updated).length,
  }
}

/* ---------------- Directory ---------------- */

export type SortKey = 'name' | 'department' | 'tenure' | 'risk' | 'overtime' | 'feedback' | 'next'

export const SORTS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'department', label: 'Department' },
  { key: 'tenure', label: 'Time with us' },
  { key: 'risk', label: 'Workload risk' },
  { key: 'overtime', label: 'Overtime (6 weeks)' },
  { key: 'feedback', label: 'Feedback' },
  { key: 'next', label: 'Shifts, next 14 days' },
]

export function sortValue(s: PersonStats, key: SortKey): number | string {
  switch (key) {
    case 'name':
      return s.person.name
    case 'department':
      return s.person.department
    case 'tenure':
      return s.tenure
    case 'risk':
      return s.risk.score
    case 'overtime':
      return s.ot6
    case 'feedback':
      return s.feedback.latest
    case 'next':
      return s.next14.shifts
  }
}

/** One row per person, as CSV a manager can open in Excel. */
export function toCsv(rows: PersonStats[]): string {
  const head = ['Name', 'Role', 'Department', 'Joined', 'Years with us', 'Contract hours a week', 'Hourly rate (sample, INR)', 'Workload risk', 'Band', 'Overtime hours (6 weeks)', 'Overtime hours (next 2 weeks)', 'Shifts next 14 days', 'Latest feedback', 'Skills']
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const lines = rows.map((r) =>
    [r.person.name, r.person.role, r.person.department, r.person.joinDate, round1(r.tenure), r.person.weeklyHours, r.person.hourlyRate, r.risk.score, r.risk.band, r.ot6, r.otNext, r.next14.shifts, r.feedback.latest, r.person.skills.map((s) => s.label).join('; ')].map(esc).join(','),
  )
  return [head.map(esc).join(','), ...lines].join('\r\n')
}
