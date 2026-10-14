import type { Staff } from '../data/types'
import { fmtDate, headcountFor, type Roster, type RiskResult } from '../engine'

export interface SubScore {
  key: 'coverage' | 'overtime' | 'skills' | 'leave' | 'rest'
  /** short, warm label */
  label: string
  /** 0–100 */
  value: number
  /** share of the overall score */
  weight: number
  note: string
}

export type ReadinessBand = 'ready' | 'nearly' | 'needs-work'

export interface Readiness {
  score: number
  band: ReadinessBand
  subScores: SubScore[]
}

export interface LeaveConflict {
  staffId: string
  name: string
  from: string
  to: string
  status: 'approved' | 'pending'
  daysNeeded: number
}

export interface LeaveStats {
  total: number
  honoured: number
  conflicts: LeaveConflict[]
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n))

/** Leave requests that touch the roster window, and whether the roster keeps them. */
export function leaveStats(staff: Staff[], roster: Roster): LeaveStats {
  const first = roster.dates[0]
  const last = roster.dates[roster.dates.length - 1]
  let total = 0
  const conflicts: LeaveConflict[] = []
  for (const p of staff) {
    for (const l of p.leave) {
      if (l.to < first || l.from > last) continue
      total++
      const needed = roster.assignments.filter((a) => a.staffId === p.id && a.date >= l.from && a.date <= l.to).length
      if (needed > 0) {
        conflicts.push({ staffId: p.id, name: p.name, from: l.from, to: l.to, status: l.status, daysNeeded: needed })
      }
    }
  }
  return { total, honoured: total - conflicts.length, conflicts }
}

/**
 * Season Readiness Score (0–100), from the generated roster and today's workload scores.
 * Weights: shifts covered 30, skills 20, rested team 20, overtime 15, leave 15.
 */
export function computeReadiness(staff: Staff[], roster: Roster, risks: RiskResult[]): Readiness {
  const required = roster.demand.reduce((n, d) => n + headcountFor(d), 0)
  const missing = roster.unmet.filter((u) => u.kind === 'headcount').reduce((n, u) => n + u.missing, 0)
  let coverage = clamp(100 * (1 - missing / required))
  if (missing > 0) coverage = Math.min(coverage, 99) // never show a perfect score next to a known gap

  const personWeeks = (staff.length * roster.dates.length) / 7
  const otPerPersonWeek = roster.totalOvertimeHours / personWeeks
  const overtime = clamp(100 - otPerPersonWeek * 25)

  const skillSlots = roster.demand.reduce((n, d) => n + d.slots.filter((s) => s.requiresSkill).length + (d.firstAidRequired ? 1 : 0), 0)
  const skillGaps = roster.unmet.filter((u) => u.kind !== 'headcount').length
  const skills = clamp(100 * (1 - skillGaps / skillSlots))

  const leave = leaveStats(staff, roster)
  const leaveScore = leave.total ? clamp((100 * leave.honoured) / leave.total) : 100

  const high = risks.filter((r) => r.band === 'high').length
  const watch = risks.filter((r) => r.band === 'watch').length
  const rest = clamp(100 - ((high + watch * 0.4) / staff.length) * 250)

  const subScores: SubScore[] = [
    { key: 'coverage', label: 'Shifts covered', value: Math.round(coverage), weight: 30, note: missing ? `${missing} shift${missing === 1 ? '' : 's'} still uncovered` : 'Every shift has someone' },
    { key: 'skills', label: 'Skills on shift', value: Math.round(skills), weight: 20, note: skillGaps ? `${skillGaps} shift${skillGaps === 1 ? '' : 's'} missing a skill` : 'Certified people on every shift' },
    { key: 'rest', label: 'Rested team', value: Math.round(rest), weight: 20, note: `${high} high risk, ${watch} on watch` },
    { key: 'overtime', label: 'Overtime load', value: Math.round(overtime), weight: 15, note: `${roster.totalOvertimeHours} overtime hours planned` },
    { key: 'leave', label: 'Leave kept', value: Math.round(leaveScore), weight: 15, note: `${leave.honoured} of ${leave.total} requests honoured` },
  ]
  const score = Math.round(subScores.reduce((s, x) => s + (x.value * x.weight) / 100, 0))
  const band: ReadinessBand = score >= 90 ? 'ready' : score >= 75 ? 'nearly' : 'needs-work'
  return { score, band, subScores }
}

/* ---------------- "Needs attention" cards ---------------- */

export interface Attention {
  id: string
  tone: 'gap' | 'risk' | 'leave'
  title: string
  body: string
  to: '/roster' | '/at-risk'
  cta: string
}

const WHERE: Record<string, string> = {
  'Front Desk': 'at the front desk',
  Housekeeping: 'in housekeeping',
  Kitchen: 'in the kitchen',
  'F&B Service': 'on the restaurant floor',
  Maintenance: 'in maintenance',
  Security: 'on security',
}

const firstName = (n: string) => n.split(' ')[0]
const joinNames = (names: string[]) => (names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`)

export function buildAttention(staff: Staff[], roster: Roster, risks: RiskResult[]): Attention[] {
  const cards: Attention[] = []

  // 1. The most understaffed day, else the day leaning hardest on overtime.
  const byDay = new Map<string, { missing: number; dept?: string; shift?: string }>()
  for (const u of roster.unmet.filter((x) => x.kind === 'headcount')) {
    const cur = byDay.get(u.date)
    byDay.set(u.date, { missing: (cur?.missing ?? 0) + u.missing, dept: cur?.dept ?? u.department, shift: cur?.shift })
  }
  const worst = [...byDay.entries()].sort((a, b) => b[1].missing - a[1].missing || a[0].localeCompare(b[0]))[0]
  if (worst) {
    const [date, v] = worst
    cards.push({
      id: 'gap',
      tone: 'gap',
      title: `${fmtDate(date)} needs ${v.missing} more ${WHERE[v.dept!] ?? v.dept}`,
      body: 'Everyone available is already rostered or resting. A part-timer or a swap would close it.',
      to: '/roster',
      cta: 'See the day',
    })
  } else {
    const ot = roster.decisions.find((d) => d.kind === 'overtime' && d.date)
    cards.push({
      id: 'gap',
      tone: 'gap',
      title: ot ? `${fmtDate(ot.date!)} leans on overtime` : 'Every shift is covered',
      body: ot ? ot.text : 'Nothing is short in the next two weeks. Nicely done.',
      to: '/roster',
      cta: 'Open the roster',
    })
  }

  // 2. People at high workload risk.
  const high = risks.filter((r) => r.band === 'high').sort((a, b) => b.score - a.score)
  const names = high.map((r) => firstName(staff.find((s) => s.id === r.staffId)!.name))
  cards.push({
    id: 'risk',
    tone: 'risk',
    title: high.length ? `${high.length} ${high.length === 1 ? 'person is' : 'people are'} at high workload risk` : 'Nobody is at high workload risk',
    body: high.length
      ? `${joinNames(names)}: ${high[0].reasons[0].text.toLowerCase()}${names.length > 1 ? ' and more' : ''}. A small change now is kinder than a resignation later.`
      : 'Workloads look balanced. We will keep watching.',
    to: '/at-risk',
    cta: 'Look at the early warnings',
  })

  // 3. Leave we could not fully keep, else someone who has stopped growing.
  const conflict = leaveStats(staff, roster).conflicts.sort((a, b) => b.daysNeeded - a.daysNeeded)[0]
  if (conflict) {
    const range = conflict.from === conflict.to ? fmtDate(conflict.from) : `${fmtDate(conflict.from)} to ${fmtDate(conflict.to)}`
    cards.push({
      id: 'leave',
      tone: 'leave',
      title: `${firstName(conflict.name)}'s leave can't be fully kept`,
      body: `${conflict.name} asked for ${range}. ${conflict.daysNeeded} day${conflict.daysNeeded === 1 ? '' : 's'} still need them for cover. Worth a quick word.`,
      to: '/roster',
      cta: 'Review leave',
    })
  } else {
    const watch = risks.filter((r) => r.band === 'watch')[0]
    cards.push({
      id: 'leave',
      tone: 'leave',
      title: watch ? `${firstName(staff.find((s) => s.id === watch.staffId)!.name)} could use a nudge` : 'Leave requests are all kept',
      body: watch ? watch.reasons.map((r) => r.text).join('. ') + '.' : 'Every request in the next two weeks is honoured.',
      to: '/at-risk',
      cta: 'See details',
    })
  }
  return cards
}
