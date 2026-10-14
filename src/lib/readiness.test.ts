import { beforeAll, describe, expect, it } from 'vitest'
import { staff } from '../data'
import { clearDemo, getDemo, type Demo } from './demo'
import { leaveStats } from './readiness'

let demo: Demo
beforeAll(() => {
  clearDemo()
  demo = getDemo()
})

describe('Season Readiness', () => {
  it('is a 0–100 weighted blend of five sub-scores', () => {
    const { score, subScores } = demo.readiness
    expect(subScores.map((s) => s.key).sort()).toEqual(['coverage', 'leave', 'overtime', 'rest', 'skills'])
    expect(subScores.reduce((n, s) => n + s.weight, 0)).toBe(100)
    subScores.forEach((s) => {
      expect(s.value).toBeGreaterThanOrEqual(0)
      expect(s.value).toBeLessThanOrEqual(100)
    })
    expect(score).toBe(Math.round(subScores.reduce((n, s) => n + (s.value * s.weight) / 100, 0)))
  })

  it('reflects real engine data: a known gap, high-risk staff, leave that could not be kept', () => {
    const r = demo.readiness
    expect(r.subScores.find((s) => s.key === 'coverage')!.value).toBeLessThan(100)
    expect(r.subScores.find((s) => s.key === 'rest')!.value).toBeLessThan(90)
    expect(r.score).toBeGreaterThan(70)
    expect(r.score).toBeLessThan(95)
  })

  it('counts leave requests the roster keeps', () => {
    const l = leaveStats(staff, demo.roster)
    expect(l.total).toBe(5)
    expect(l.honoured + l.conflicts.length).toBe(l.total)
    expect(l.conflicts.every((c) => c.status === 'pending')).toBe(true)
  })

  it('writes three needs-attention cards that link to Roster or At-risk', () => {
    expect(demo.attention).toHaveLength(3)
    demo.attention.forEach((a) => expect(['/roster', '/at-risk']).toContain(a.to))
    expect(demo.attention.find((a) => a.id === 'risk')!.title).toMatch(/2 people are at high workload risk/)
  })
})
