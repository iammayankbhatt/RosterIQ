import { beforeEach, describe, expect, it } from 'vitest'
import { recommendFix } from '../engine'
import { applyDemoFix, clearDemo, getDemo, undoDemoFix } from './demo'
import { buildTimeline, describeOutcome, dominantKind, evidenceFor, matchesFilter, rankPeople, scoredRoster } from './riskView'

beforeEach(() => clearDemo())

const find = (name: string) => rankPeople(getDemo()).find((r) => r.person.name.startsWith(name))!

describe('ranking', () => {
  it('puts Ravi, Meena and Arjun on top with three different kinds of risk', () => {
    const top = rankPeople(getDemo()).slice(0, 3)
    expect(top.map((r) => r.person.name.split(' ')[0])).toEqual(['Ravi', 'Meena', 'Arjun'])
    expect(top.map((r) => r.kind)).toEqual(['burnout', 'rest', 'stagnation'])
    expect(top.map((r) => r.risk.band)).toEqual(['high', 'high', 'watch'])
  })

  it('filters burnout against stagnation', () => {
    const ravi = find('Ravi').risk.reasons
    const arjun = find('Arjun').risk.reasons
    expect(matchesFilter(ravi, 'burnout')).toBe(true)
    expect(matchesFilter(arjun, 'burnout')).toBe(false)
    expect(matchesFilter(arjun, 'stagnation')).toBe(true)
    expect(dominantKind([])).toBeNull()
  })
})

describe('evidence and timeline', () => {
  it("shows the dates behind Ravi's missing weekly off", () => {
    const { person, risk } = find('Ravi')
    const reason = risk.reasons.find((r) => r.factor === 'no-weekly-off')!
    const lines = evidenceFor(person, null, reason, risk.asOf)
    expect(lines[0]).toMatch(/Worked every day from .* to Mon 12 Oct, 2\d days/)
  })

  it('lays out six weeks of history and two planned weeks', () => {
    const weeks = buildTimeline(find('Ravi').person, getDemo().roster)
    expect(weeks).toHaveLength(8)
    expect(weeks.filter((w) => w.planned)).toHaveLength(2)
    expect(weeks.every((w) => w.cells.length === 7)).toBe(true)
    expect(weeks.flatMap((w) => w.cells).some((c) => c.streak)).toBe(true)
  })
})

describe('applying a fix', () => {
  it("lowers Ravi's score and band, and changes the roster the rest of the app reads", () => {
    const ravi = find('Ravi')
    const before = getDemo()
    const fix = recommendFix(ravi.person, ravi.risk.reasons)[0]
    expect(fix.kind).toBe('weekly-off')

    const out = applyDemoFix(fix)
    const after = getDemo()
    expect(after.roster).not.toBe(before.roster)
    expect(out.after.score).toBeLessThan(out.before.score)
    expect(out.before.band).toBe('high')
    expect(out.after.band).not.toBe('high')
    expect(after.risks[after.people.findIndex((p) => p.id === ravi.person.id)].score).toBe(out.after.score)
    // the home screen's readiness reads the same state
    expect(after.readiness.subScores.find((s) => s.key === 'rest')!.value).toBeGreaterThan(before.readiness.subScores.find((s) => s.key === 'rest')!.value)
    // Ravi works fewer planned shifts and nobody's cover leaves a hole
    const o = describeOutcome(out)
    expect(o.shiftsAfter).toBeLessThan(o.shiftsBefore)
    expect(o.changedDates.length).toBeGreaterThan(0)
    expect(out.result.uncovered).toBe(0)
    expect(scoredRoster(after, ravi.person.id)).toBe(after.roster)
  })

  it('undo puts everything back so the demo can be repeated', () => {
    const before = getDemo()
    const ravi = find('Ravi')
    applyDemoFix(recommendFix(ravi.person, ravi.risk.reasons)[0])
    expect(undoDemoFix()).not.toBeNull()
    expect(getDemo().roster.assignments).toEqual(before.roster.assignments)
    expect(getDemo().risks).toEqual(before.risks)
    expect(undoDemoFix()).toBeNull()
  })

  it("lowers Arjun's stagnation score with a recognition conversation", () => {
    const arjun = find('Arjun')
    const out = applyDemoFix(recommendFix(arjun.person, arjun.risk.reasons)[0])
    expect(out.after.score).toBeLessThan(out.before.score)
    expect(out.after.band).toBe('steady')
  })
})
