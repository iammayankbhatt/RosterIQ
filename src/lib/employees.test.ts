import { beforeEach, describe, expect, it } from 'vitest'
import { staff } from '../data'
import { recommendFix } from '../engine'
import { advanceCourse, applyDemoFix, clearDemo, getDemo, setMood } from './demo'
import { SORTS, orgStats, personStats, sortValue, tenureLabel, toCsv, weeklyHours } from './employees'
import { rankPeople } from './riskView'

beforeEach(() => clearDemo())

const stats = (name: string) => {
  const d = getDemo()
  const i = d.people.findIndex((p) => p.name.startsWith(name))
  return personStats(d.people[i], d.risks[i], d)
}

describe('team overview', () => {
  it('counts add up everywhere', () => {
    const o = orgStats(getDemo())
    expect(o.headcount).toBe(20)
    expect(o.byDept.reduce((s, d) => s + d.count, 0)).toBe(20)
    expect(Object.values(o.bands).reduce((a, b) => a + b, 0)).toBe(20)
    expect(o.tenureBuckets.reduce((s, b) => s + b.count, 0)).toBe(20)
    expect(o.shiftMix.reduce((s, x) => s + x.value, 0)).toBe(getDemo().roster.assignments.length)
    expect(o.weeks).toHaveLength(8)
  })

  it('matches the risk screen: two high, one watch', () => {
    const o = orgStats(getDemo())
    expect(o.bands.high).toBe(2)
    expect(o.bands.watch).toBe(1)
    const top = rankPeople(getDemo()).slice(0, 2).map((r) => r.risk.band)
    expect(top).toEqual(['high', 'high'])
  })

  it("shows Ravi's overtime and the leave coming up", () => {
    expect(stats('Ravi').ot6).toBeGreaterThan(30)
    const o = orgStats(getDemo())
    expect(o.leave.approvedUpcoming + o.leave.pending).toBeGreaterThan(0)
    expect(o.attrition.total).toBe(8)
    expect(o.attrition.byDept.reduce((s, d) => s + d.count, 0)).toBe(8)
  })

  it('reports who can cover the critical skills', () => {
    const skills = Object.fromEntries(orgStats(getDemo()).skills.map((s) => [s.key, s.holders]))
    expect(skills['first-aid']).toBeGreaterThanOrEqual(3)
    expect(skills['front-desk']).toBeGreaterThanOrEqual(3)
    expect(skills.cook).toBeGreaterThanOrEqual(2)
  })
})

describe('one person', () => {
  it('hours: six worked weeks then two planned weeks, overtime is hours past contract', () => {
    const d = getDemo()
    const ravi = d.people.find((p) => p.name.startsWith('Ravi'))!
    const w = weeklyHours(ravi, d)
    expect(w).toHaveLength(8)
    expect(w.filter((x) => x.planned)).toHaveLength(2)
    for (const x of w) expect(x.overtime).toBe(Math.max(0, x.hours - ravi.weeklyHours))
    expect(w.slice(0, 6).reduce((s, x) => s + x.hours, 0)).toBe(ravi.history.reduce((s, r) => s + r.hours, 0))
  })

  it('the shift mix covers every one of the 42 days', () => {
    expect(stats('Meena').mix.reduce((s, x) => s + x.value, 0)).toBe(42)
  })

  it('money is built from the sample rate and the stated assumptions', () => {
    const s = stats('Ravi')
    expect(s.monthlyBase).toBe(Math.round((s.person.weeklyHours * s.person.hourlyRate * 52) / 12))
    expect(s.otCost6).toBe(Math.round(s.ot6 * s.person.hourlyRate * 2))
  })

  it('tenure reads naturally', () => {
    expect(tenureLabel(0.4)).toBe('5 mo')
    expect(tenureLabel(2)).toBe('2 yr')
    expect(tenureLabel(7.5)).toBe('7 yr 6 mo')
  })
})

describe('the dashboard stays in step with everything else', () => {
  it("a manager fix lowers Ravi's risk here, and marks him updated", () => {
    expect(stats('Ravi').updated).toBe(false)
    const r = rankPeople(getDemo()).find((x) => x.person.name.startsWith('Ravi'))!
    applyDemoFix(recommendFix(r.person, r.risk.reasons)[0])
    const after = stats('Ravi')
    expect(after.risk.score).toBeLessThan(r.risk.score)
    expect(after.updated).toBe(true)
    expect(orgStats(getDemo()).bands.high).toBe(1)
    expect(orgStats(getDemo()).updatedCount).toBeGreaterThanOrEqual(1)
  })

  it('a check-in and a finished course show up in the profile', () => {
    const d = getDemo()
    const arjun = d.people.find((p) => p.name.startsWith('Arjun'))!
    const before = stats('Arjun')
    setMood(arjun.id, 5)
    expect(stats('Arjun').feedback.latest).toBe(5)
    expect(stats('Arjun').feedback.series.length).toBe(before.feedback.series.length + 1)
    for (let i = 0; i < 4; i++) advanceCourse(arjun.id, 'fssai-2')
    expect(stats('Arjun').person.skills.length).toBe(before.person.skills.length + 1)
  })
})

describe('directory', () => {
  it('has a sort value for every column and a CSV with one row per person', () => {
    const d = getDemo()
    const rows = d.people.map((p, i) => personStats(p, d.risks[i], d))
    for (const s of SORTS) expect(sortValue(rows[0], s.key)).toBeDefined()
    const csv = toCsv(rows).split('\r\n')
    expect(csv).toHaveLength(staff.length + 1)
    expect(csv[0]).toContain('Workload risk')
    expect(csv.find((l) => l.startsWith('"Ravi Kumar"'))).toContain('"high"')
  })
})
