import { occupancyForecast, staff } from '../src/data'
import {
  SHIFT_INFO,
  applyFix,
  computeSavings,
  generateManualBaseline,
  generateRoster,
  recommendFix,
  scoreRisk,
  validateRoster,
  resolveOptions,
  type Roster,
} from '../src/engine'
import { formatINR, formatLakh } from '../src/lib/format'

const line = (s = '') => console.log(s)

function grid(r: Roster, from = 0, days = 7) {
  const dates = r.dates.slice(from, from + days)
  line('Name'.padEnd(18) + dates.map((d) => d.slice(5).padStart(6)).join(''))
  for (const p of staff) {
    const row = dates.map((d) => {
      const a = r.assignments.find((x) => x.staffId === p.id && x.date === d)
      return (a ? a.shift : '·').padStart(6)
    })
    line(p.name.padEnd(18) + row.join('') + `   ${r.hours[p.id].weekHours[from / 7]}h/${p.weeklyHours}h`)
  }
}

const manual = generateManualBaseline(staff, occupancyForecast)
const roster = generateRoster(staff, occupancyForecast)
const o = resolveOptions()

line('=== RosterIQ engine demo (all names and figures are sample data) ===')
line(`Shifts: ${Object.entries(SHIFT_INFO).map(([k, v]) => `${k}=${v.label}`).join(', ')}`)
line()
line('--- Generated roster, week 1 (Tue 13 Oct) ---')
grid(roster, 0)
line()
line(`Hard-rule violations  engine: ${validateRoster(staff, roster.assignments, roster.demand, o).length}   manual: ${validateRoster(staff, manual.assignments, manual.demand, o).length}`)
line(`Unmet demand          engine: ${roster.unmet.length}   manual: ${manual.unmet.length}`)
line(`Overtime hours        engine: ${roster.totalOvertimeHours}   manual: ${manual.totalOvertimeHours}`)
line()
line('--- Notable decisions (first 8) ---')
roster.decisions.slice(0, 8).forEach((d) => line(` - ${d.text}`))
line()
line('--- Workload risk scores (today, from shift history; a rule-based check, not a prediction) ---')
for (const name of ['Ravi', 'Meena', 'Arjun']) {
  const p = staff.find((x) => x.name.startsWith(name))!
  const r = scoreRisk(p, null)
  line(`${p.name}: ${r.score}/100 (${r.band})`)
  r.reasons.forEach((x) => line(`    [+${String(x.points).padStart(2)}] ${x.text}`))
  for (const fix of recommendFix(p, r.reasons)) {
    const res = applyFix(fix, p, manual, { staff })
    line(`    Fix: ${fix.title} -> ${res.before.score} to ${res.after.score} (${res.after.band})`)
  }
}
line()
const s = computeSavings(manual, roster)
line('--- Savings (ASSUMPTIONS, sample hotel) ---')
line(`Overtime saved   ${formatINR(s.overtime.savedAnnual)} a year  (${s.overtime.reductionPct}% less overtime cost; ${formatINR(s.overtime.savedMonthly)}/month)`)
line(`Turnover saved   ${formatINR(s.turnover.savedAnnual)} a year  (${s.turnover.exitsPrevented} of ${s.turnover.exitsBaseline} exits prevented at ${formatINR(s.assumptions.costPerExit)})`)
line(`Total saving     ${formatLakh(s.totalAnnual)} a year`)
line(`Subscription     ${formatINR(s.subscriptionAnnual)} a year (${formatINR(s.assumptions.subscriptionMonthly)}/month)`)
line(`Net gain         ${formatLakh(s.netGain)}   ratio ${s.ratio.toFixed(1)}x`)
line(s.disclaimer)
