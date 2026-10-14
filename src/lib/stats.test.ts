import { describe, expect, it } from 'vitest'
import { staff, occupancyForecast, lastSeason, lastSeasonTotal } from '../data'
import { currentStreak, hoursInLast, shortestRest } from './stats'

const by = (name: string) => staff.find((s) => s.name.startsWith(name))!

describe('seed data', () => {
  it('has 20 staff, 6 departments, 42 days of history each', () => {
    expect(staff).toHaveLength(20)
    expect(new Set(staff.map((s) => s.department)).size).toBe(6)
    staff.forEach((s) => expect(s.history).toHaveLength(42))
  })

  it('Ravi has worked 21 days straight with heavy overtime', () => {
    const ravi = by('Ravi')
    expect(currentStreak(ravi.history)).toBe(21)
    expect(hoursInLast(ravi.history, 7)).toBeGreaterThan(ravi.weeklyHours + 15)
  })

  it('Meena has a short rest between a late close and an early open', () => {
    expect(shortestRest(by('Meena').history)).toBeLessThan(6)
  })

  it('Arjun has not learned a skill in 18 months; healthy staff have', () => {
    const latest = (s: (typeof staff)[number]) => s.skills.map((k) => k.since).sort().at(-1)!
    expect(latest(by('Arjun'))! <= '2025-04').toBe(true)
    expect(by('Arjun').feedback[3].score).toBeLessThan(by('Arjun').feedback[0].score)
    staff.filter((s) => s.seedTag === 'healthy').forEach((s) => expect(latest(s) >= '2026-04').toBe(true))
  })

  it('has 3 healthy contrast staff with a weekly off every week', () => {
    const healthy = staff.filter((s) => s.seedTag === 'healthy')
    expect(healthy).toHaveLength(3)
    healthy.forEach((s) => expect(currentStreak(s.history)).toBeLessThanOrEqual(6))
  })

  it('forecast peaks on the weekend and is quiet midweek', () => {
    expect(occupancyForecast).toHaveLength(14)
    const sat = occupancyForecast.find((d) => d.weekday === 'Sat')!
    const wed = occupancyForecast.find((d) => d.weekday === 'Wed')!
    expect(sat.occupancyPct).toBeGreaterThan(85)
    expect(wed.occupancyPct).toBeLessThan(45)
  })

  it('last season has 8 resignations at about ₹30,000 each', () => {
    expect(lastSeason.resignations).toHaveLength(8)
    expect(lastSeasonTotal / 8).toBe(30000)
  })
})
