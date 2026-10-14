import { beforeAll, describe, expect, it } from 'vitest'
import { lastSeasonTotal, occupancyForecast, staff, type Staff } from '../data'
import {
  DEFAULT_ASSUMPTIONS,
  RISK_NOTE,
  SHIFT_INFO,
  applyFix,
  computeDemand,
  computeSavings,
  dayNumber,
  generateManualBaseline,
  generateRoster,
  hasSkill,
  personViolations,
  recommendFix,
  repairRoster,
  resolveOptions,
  scoreRisk,
  validateRoster,
  type Assignment,
  type Roster,
} from './index'

const o = resolveOptions()
const by = (name: string): Staff => staff.find((s) => s.name.startsWith(name))!

let roster: Roster
let manual: Roster

beforeAll(() => {
  roster = generateRoster(staff, occupancyForecast)
  manual = generateManualBaseline(staff, occupancyForecast)
})

/* ---------- independent re-checks of the hard rules (not using the engine's own validator) ---------- */

function worked(p: Staff, r: Roster) {
  const days = new Map<number, { start: number; end: number }>()
  for (const h of p.history) {
    if (h.start != null && h.end != null && h.hours > 0) {
      const d = dayNumber(h.date)
      days.set(d, { start: d * 24 + h.start, end: d * 24 + h.end })
    }
  }
  for (const a of r.assignments.filter((x) => x.staffId === p.id)) {
    const d = dayNumber(a.date)
    days.set(d, { start: d * 24 + SHIFT_INFO[a.shift].start, end: d * 24 + SHIFT_INFO[a.shift].end })
  }
  return days
}

describe('demand', () => {
  const demand = computeDemand(occupancyForecast)
  const day = (wd: string, nth = 0) => demand.filter((d) => d.weekday === wd)[nth]
  const count = (d: (typeof demand)[number], dept: string, shift: string) =>
    d.slots.find((s) => s.department === dept && s.shift === shift)?.count ?? 0

  it('housekeeping needs 1 attendant per 6 occupied rooms in the morning', () => {
    const sat = day('Sat') // 96% of 25 rooms = 24 rooms
    expect(sat.occupiedRooms).toBe(24)
    expect(count(sat, 'Housekeeping', 'M')).toBe(4)
    const wed = day('Wed') // 35% = 9 rooms
    expect(count(wed, 'Housekeeping', 'M')).toBe(2)
  })

  it('kitchen scales with covers', () => {
    expect(count(day('Sat'), 'Kitchen', 'M')).toBeGreaterThan(count(day('Wed'), 'Kitchen', 'M'))
    expect(count(day('Wed'), 'Kitchen', 'M')).toBeGreaterThanOrEqual(1)
  })

  it('front desk needs a certified person on every shift, every day', () => {
    for (const d of demand) {
      for (const s of ['M', 'E', 'N']) {
        const slot = d.slots.find((x) => x.department === 'Front Desk' && x.shift === s)!
        expect(slot.count).toBeGreaterThanOrEqual(1)
        expect(slot.requiresSkill).toBe('front-desk')
      }
    }
  })

  it('needs first-aid cover each day and is busier at the weekend than midweek', () => {
    expect(demand.every((d) => d.firstAidRequired)).toBe(true)
    const total = (d: (typeof demand)[number]) => d.slots.reduce((n, s) => n + s.count, 0)
    expect(total(day('Sat'))).toBeGreaterThan(total(day('Wed')))
  })
})

describe('generateRoster: hard rules', () => {
  it('has no hard-rule violations', () => {
    const bad = validateRoster(staff, roster.assignments, roster.demand, o).filter((v) => v.rule !== 'skill')
    expect(bad).toEqual([])
  })

  it('gives at least 11 hours of rest between any two shifts (history included)', () => {
    for (const p of staff) {
      const days = [...worked(p, roster).entries()].sort((a, b) => a[0] - b[0])
      for (let i = 1; i < days.length; i++) {
        const isRoster = roster.assignments.some((a) => a.staffId === p.id && dayNumber(a.date) === days[i][0])
        if (isRoster) expect(days[i][1].start - days[i - 1][1].end, `${p.name} day ${days[i][0]}`).toBeGreaterThanOrEqual(11)
      }
    }
  })

  it('never has more than 6 consecutive working days and has a weekly off in every 7 days', () => {
    const first = dayNumber(roster.dates[0])
    for (const p of staff) {
      const days = worked(p, roster)
      for (let d = first; d < first + roster.dates.length; d++) {
        let all7 = true
        for (let k = 0; k < 7; k++) if (!days.has(d - k)) all7 = false
        expect(all7, `${p.name} has no off in the 7 days to day ${d}`).toBe(false)
      }
    }
  })

  it('respects approved leave', () => {
    for (const p of staff) {
      for (const l of p.leave.filter((x) => x.status === 'approved')) {
        const hit = roster.assignments.filter((a) => a.staffId === p.id && a.date >= l.from && a.date <= l.to)
        expect(hit, p.name).toEqual([])
      }
    }
  })

  it('covers every skill-required shift with a skilled person, or reports it as unmet', () => {
    const unmetSkill = new Set(roster.unmet.filter((u) => u.kind === 'skill').map((u) => `${u.date}|${u.department}|${u.shift}`))
    for (const d of roster.demand) {
      for (const slot of d.slots.filter((s) => s.requiresSkill)) {
        const here = roster.assignments.filter(
          (a) => a.date === d.date && a.shift === slot.shift && by(staff.find((s) => s.id === a.staffId)!.name).department === slot.department,
        )
        const ok = here.some((a) => hasSkill(staff.find((s) => s.id === a.staffId)!, slot.requiresSkill!))
        if (here.length) expect(ok || unmetSkill.has(`${d.date}|${slot.department}|${slot.shift}`)).toBe(true)
      }
    }
    // front desk specifically: certified on every shift of every day
    for (const d of roster.demand) {
      for (const s of ['M', 'E', 'N'] as const) {
        const someone = roster.assignments.some(
          (a) => a.date === d.date && a.shift === s && staff.find((x) => x.id === a.staffId)!.department === 'Front Desk' && hasSkill(staff.find((x) => x.id === a.staffId)!, 'front-desk'),
        )
        const gap = roster.unmet.some((u) => u.date === d.date && u.department === 'Front Desk' && u.shift === s)
        expect(someone || gap, `${d.date} ${s}`).toBe(true)
      }
    }
  })

  it('has first-aid cover every day unless reported unmet', () => {
    for (const d of roster.demand) {
      const covered = roster.assignments.some((a) => a.date === d.date && hasSkill(staff.find((x) => x.id === a.staffId)!, 'first-aid'))
      const reported = roster.unmet.some((u) => u.kind === 'first-aid' && u.date === d.date)
      expect(covered || reported, d.date).toBe(true)
    }
  })

  it('forces Ravi (21 days straight) off on day one', () => {
    const ravi = by('Ravi')
    expect(roster.assignments.some((a) => a.staffId === ravi.id && a.date === roster.dates[0])).toBe(false)
    expect(roster.decisions.some((d) => d.staffId === ravi.id && d.kind === 'rest' && d.text.includes('21 days'))).toBe(true)
  })

  it('is deterministic', () => {
    const again = generateRoster(staff, occupancyForecast)
    expect(again.assignments).toEqual(roster.assignments)
  })
})

describe('generateRoster: output', () => {
  it('returns hours, overtime, unmet demand and readable reasons', () => {
    for (const p of staff) {
      const h = roster.hours[p.id]
      expect(h.weekHours).toHaveLength(2)
      expect(h.totalHours).toBe(h.shifts * 8)
      expect(h.overtimeHours).toBeGreaterThanOrEqual(0)
    }
    expect(Array.isArray(roster.unmet)).toBe(true)
    expect(roster.decisions.length).toBeGreaterThan(3)
    roster.decisions.forEach((d) => expect(d.text.length).toBeGreaterThan(10))
    expect(roster.totalOvertimeHours).toBe(Object.values(roster.hours).reduce((s, h) => s + h.overtimeHours, 0))
  })

  it('keeps unmet demand small and explains it', () => {
    expect(roster.unmet.reduce((n, u) => n + u.missing, 0)).toBeLessThanOrEqual(3)
    roster.unmet.forEach((u) => expect(roster.decisions.some((d) => d.kind === 'unmet' && d.text.includes(u.text))).toBe(true))
  })

  it('spreads night shifts across the front-desk team', () => {
    const nights = staff.filter((p) => p.department === 'Front Desk').map((p) => roster.hours[p.id].nights)
    expect(Math.min(...nights)).toBeGreaterThan(0)
    expect(roster.decisions.some((d) => d.kind === 'nights')).toBe(true)
  })

  it('uses less overtime than the manual roster', () => {
    expect(roster.totalOvertimeCost).toBeLessThan(manual.totalOvertimeCost)
  })
})

describe('hard-rule detection and repair', () => {
  // a person with a clean slate, so only the assignments below are judged
  const p: Staff = { ...by('Pooja'), history: [] }
  const a = (date: string, shift: Assignment['shift']): Assignment => ({ staffId: p.id, date, shift })

  it('flags less than 11 hours of rest', () => {
    const v = personViolations(p, [a('2026-10-14', 'E'), a('2026-10-15', 'M')], o)
    expect(v.some((x) => x.rule === 'rest')).toBe(true)
  })

  it('flags 7 days in a row and a missing weekly off', () => {
    const week = ['13', '14', '15', '16', '17', '18', '19'].map((d) => a(`2026-10-${d}`, 'M'))
    const v = personViolations(p, week, o)
    expect(v.some((x) => x.rule === 'max-consecutive')).toBe(true)
    expect(v.some((x) => x.rule === 'weekly-off')).toBe(true)
    expect(personViolations(p, week.slice(0, 6), o)).toEqual([])
  })

  it('flags work on approved leave', () => {
    const karan = by('Karan')
    const v = personViolations(karan, [{ staffId: karan.id, date: '2026-10-21', shift: 'E' }], o)
    expect(v.some((x) => x.rule === 'leave')).toBe(true)
  })

  it('flags a fixed weekly off being rostered', () => {
    const v = personViolations(p, [a('2026-10-14', 'M')], { ...o, rules: { [p.id]: { fixedOffWeekday: 3 } } })
    expect(v.some((x) => x.rule === 'rule')).toBe(true)
  })

  it('repairRoster removes injected violations', () => {
    const broken: Roster = {
      ...roster,
      assignments: [...roster.assignments, { staffId: by('Ravi').id, date: roster.dates[0], shift: 'M' }],
    }
    expect(validateRoster(staff, broken.assignments, broken.demand, o).some((v) => v.rule === 'max-consecutive')).toBe(true)
    const fixed = repairRoster(staff, broken)
    expect(validateRoster(staff, fixed.assignments, fixed.demand, o).filter((v) => v.rule !== 'skill')).toEqual([])
    expect(fixed.decisions.some((d) => d.kind === 'repair')).toBe(true)
  })
})

describe('generateManualBaseline', () => {
  it('is a real roster for the same demand that breaks real rules', () => {
    expect(manual.kind).toBe('manual')
    expect(manual.demand).toEqual(roster.demand)
    const v = validateRoster(staff, manual.assignments, manual.demand, o)
    expect(v.length).toBeGreaterThan(0)
    expect(v.some((x) => x.rule === 'rest' || x.rule === 'max-consecutive')).toBe(true)
  })

  it('is deterministic', () => {
    expect(generateManualBaseline(staff, occupancyForecast).assignments).toEqual(manual.assignments)
  })

  it('keeps approved leave but ignores everything else', () => {
    expect(validateRoster(staff, manual.assignments, manual.demand, o).some((v) => v.rule === 'leave')).toBe(false)
  })
})

describe('scoreRisk', () => {
  it('scores Ravi high: 21 days without a weekly off, heavy overtime', () => {
    const r = scoreRisk(by('Ravi'), null)
    expect(r.band).toBe('high')
    expect(r.score).toBeGreaterThanOrEqual(50)
    expect(r.reasons[0].text).toBe('21 days without a weekly off')
    expect(r.reasons.some((x) => /hours of overtime in the last 4 weeks/.test(x.text))).toBe(true)
  })

  it('scores Meena high: late closes then early opens, short rests', () => {
    const r = scoreRisk(by('Meena'), null)
    expect(r.band).toBe('high')
    expect(r.reasons.some((x) => /late-night shifts in a row/.test(x.text))).toBe(true)
    expect(r.reasons.some((x) => /under 11 hours of rest \(shortest 5 hours\)/.test(x.text))).toBe(true)
  })

  it('flags Arjun for stagnation without calling it overwork', () => {
    const r = scoreRisk(by('Arjun'), null)
    expect(r.band).toBe('watch')
    expect(r.reasons.map((x) => x.factor).sort()).toEqual(['feedback-falling', 'no-skill-growth'])
    expect(r.reasons.some((x) => x.text === 'No new skill in 18 months')).toBe(true)
  })

  it('keeps the three healthy staff steady', () => {
    for (const p of staff.filter((s) => s.seedTag === 'healthy')) {
      const r = scoreRisk(p, null)
      expect(r.band, p.name).toBe('steady')
      expect(r.score).toBeLessThan(20)
    }
  })

  it('orders reasons by points, stays within 0-100 and never claims to predict', () => {
    for (const p of staff) {
      const r = scoreRisk(p, null)
      expect(r.score).toBeGreaterThanOrEqual(0)
      expect(r.score).toBeLessThanOrEqual(100)
      const pts = r.reasons.map((x) => x.points)
      expect(pts).toEqual([...pts].sort((a, b) => b - a))
      expect(r.note).toBe(RISK_NOTE)
      expect(r.note).toMatch(/not a prediction/)
    }
  })

  it('counts ignored leave when the roster works someone on a requested day', () => {
    const ravi = by('Ravi')
    const withLeave = scoreRisk(ravi, manual)
    const ignored = manual.assignments.some((a) => a.staffId === ravi.id && a.date >= '2026-10-18' && a.date <= '2026-10-19')
    expect(withLeave.reasons.some((x) => x.factor === 'leave-ignored')).toBe(ignored)
  })

  it('the engine roster is calmer than the manual one for the overworked staff', () => {
    for (const n of ['Ravi', 'Meena']) {
      expect(scoreRisk(by(n), roster).score).toBeLessThan(scoreRisk(by(n), null).score)
    }
  })
})

describe('recommendFix / applyFix', () => {
  it('recommends a fixed weekly off for Ravi, a shift-pattern change for Meena, growth for Arjun', () => {
    const ravi = by('Ravi')
    expect(recommendFix(ravi, scoreRisk(ravi, null).reasons)[0].kind).toBe('weekly-off')
    const meena = by('Meena')
    const mFix = recommendFix(meena, scoreRisk(meena, null).reasons)
    expect(mFix.map((f) => f.kind)).toContain('shift-pattern')
    const arjun = by('Arjun')
    const aFix = recommendFix(arjun, scoreRisk(arjun, null).reasons)
    expect(aFix.map((f) => f.kind).sort()).toEqual(['recognition', 'skill-course'])
    aFix.forEach((f) => expect(f.action.length).toBeGreaterThan(20))
  })

  it('applying every fix makes each score visibly drop', () => {
    for (const n of ['Ravi', 'Meena', 'Arjun']) {
      const p = by(n)
      for (const fix of recommendFix(p, scoreRisk(p, null).reasons)) {
        const res = applyFix(fix, p, manual, { staff })
        expect(res.after.score, `${n} ${fix.kind}`).toBeLessThan(res.before.score)
      }
    }
  })

  it("Ravi's weekly-off fix leaves no run longer than 6 days and a fixed off weekday", () => {
    const ravi = by('Ravi')
    const fix = recommendFix(ravi, scoreRisk(ravi, null).reasons).find((f) => f.kind === 'weekly-off')!
    const res = applyFix(fix, ravi, manual, { staff })
    expect(personViolations(ravi, res.roster.assignments.filter((a) => a.staffId === ravi.id), o)).toEqual([])
    expect(res.after.reasons.some((x) => x.factor === 'no-weekly-off')).toBe(false)
    expect(res.changes.length).toBeGreaterThan(0)
  })

  it("Meena's shift-pattern fix removes the short turnarounds", () => {
    const meena = by('Meena')
    const fix = recommendFix(meena, scoreRisk(meena, null).reasons).find((f) => f.kind === 'shift-pattern')!
    const res = applyFix(fix, meena, manual, { staff })
    expect(res.after.reasons.some((x) => x.factor === 'short-rest')).toBe(false)
    expect(res.after.reasons.some((x) => x.factor === 'late-nights')).toBe(false)
    // work moved to colleagues, so the rest of the roster still has no extra hard-rule breaks for them
    expect(res.roster.assignments.filter((a) => a.staffId === meena.id).length).toBeLessThanOrEqual(
      manual.assignments.filter((a) => a.staffId === meena.id).length,
    )
  })

  it('does not mutate the inputs', () => {
    const before = JSON.stringify(by('Arjun'))
    const arjun = by('Arjun')
    const fix = recommendFix(arjun, scoreRisk(arjun, null).reasons)[0]
    const res = applyFix(fix, arjun, manual, { staff })
    expect(JSON.stringify(arjun)).toBe(before)
    expect(res.person.plan).toBeDefined()
  })
})

describe('computeSavings', () => {
  const fake = (cost: number, hours = 0) => ({ totalOvertimeCost: cost, totalOvertimeHours: hours }) as Roster

  it('has the agreed default assumptions', () => {
    expect(DEFAULT_ASSUMPTIONS).toMatchObject({
      baselineOvertimeMonthly: 20_000,
      exitsPerYear: 8,
      costPerExit: 30_000,
      exitsPrevented: 3,
      subscriptionMonthly: 2_499,
    })
    expect(lastSeasonTotal).toBe(8 * DEFAULT_ASSUMPTIONS.costPerExit)
  })

  it('does the maths exactly on synthetic rosters', () => {
    // new roster has 40% of the manual overtime cost -> 60% roster reduction, 45% attributable
    const s = computeSavings(fake(10_000), fake(4_000))
    expect(s.overtime.rosterReductionPct).toBe(60)
    expect(s.overtime.savedMonthly).toBeCloseTo(20_000 * 0.6 * 0.45, 6)
    expect(s.overtime.savedAnnual).toBeCloseTo(20_000 * 0.6 * 0.45 * 12, 6)
    expect(s.turnover.savedAnnual).toBe(90_000)
    expect(s.totalAnnual).toBeCloseTo(s.overtime.savedAnnual + 90_000, 6)
    expect(s.subscriptionAnnual).toBe(2_499 * 12)
    expect(s.netGain).toBeCloseTo(s.totalAnnual - 29_988, 6)
    expect(s.ratio).toBeCloseTo(s.totalAnnual / 29_988, 6)
  })

  it('honours edited assumptions and labels everything as an assumption', () => {
    const s = computeSavings(fake(10_000), fake(0), {
      rosterAttributableShare: 1,
      baselineOvertimeMonthly: 30_000,
      exitsPrevented: 2,
      costPerExit: 35_000,
      subscriptionMonthly: 3_000,
    })
    expect(s.overtime.savedAnnual).toBe(360_000)
    expect(s.turnover.savedAnnual).toBe(70_000)
    expect(s.netGain).toBe(360_000 + 70_000 - 36_000)
    expect(s.basis).toBe('assumption')
    expect(s.disclaimer).toMatch(/assumption/)
    expect(s.disclaimer).toMatch(/never tied to savings/)
  })

  it('saves nothing on overtime when there was none to start with', () => {
    const s = computeSavings(fake(0), fake(0))
    expect(s.overtime.savedAnnual).toBe(0)
    expect(s.totalAnnual).toBe(90_000)
  })

  it('lands near the calibrated targets on the real sample rosters', () => {
    const s = computeSavings(manual, roster)
    expect(s.overtime.savedAnnual).toBeGreaterThan(65_000)
    expect(s.overtime.savedAnnual).toBeLessThan(80_000)
    expect(s.turnover.savedAnnual).toBe(90_000)
    expect(s.totalAnnual).toBeGreaterThan(155_000)
    expect(s.totalAnnual).toBeLessThan(170_000)
    expect(s.netGain).toBeGreaterThan(125_000)
    expect(s.netGain).toBeLessThan(140_000)
    expect(s.ratio).toBeGreaterThan(5)
  })
})
