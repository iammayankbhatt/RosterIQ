import { beforeEach, describe, expect, it } from 'vitest'
import { recommendFix } from '../engine'
import { applyDemoFix, clearDemo, getDemo, regenerateWithFixes, requestSwap, undoDemoFix, undoSwap } from './demo'
import { rankPeople } from './riskView'
import { evaluateSwap, managerUpdates, myAssignments, swapPeers } from './staffApp'

const person = (name: string) => getDemo().people.find((p) => p.name.startsWith(name))!

function applyFirstFix(name: string) {
  const r = rankPeople(getDemo()).find((x) => x.person.name.startsWith(name))!
  return applyDemoFix(recommendFix(r.person, r.risk.reasons)[0])
}

/** The roster exactly as first generated, captured before any change is made. */
let original: Map<string, string>

beforeEach(() => {
  clearDemo()
  original = new Map(getDemo().roster.assignments.map((a) => [`${a.staffId}|${a.date}`, a.shift]))
})

/** The one rule: `changes` is exactly the difference between that snapshot and the live roster. */
function expectChangesMatchRoster() {
  const d = getDemo()
  const now = new Map(d.roster.assignments.map((a) => [`${a.staffId}|${a.date}`, a.shift]))
  const expected = new Set<string>()
  for (const k of new Set([...original.keys(), ...now.keys()])) if (original.get(k) !== now.get(k)) expected.add(k)
  expect(new Set(d.changes.map((c) => `${c.staffId}|${c.date}`))).toEqual(expected)
  for (const c of d.changes) {
    expect(c.after).toBe(now.get(`${c.staffId}|${c.date}`) ?? null)
    expect(c.before).toBe(original.get(`${c.staffId}|${c.date}`) ?? null)
  }
}

describe('a manager fix shows up consistently', () => {
  it('starts with no changes anywhere', () => {
    expect(getDemo().changes).toEqual([])
  })

  it("records Ravi's moved shift and the colleague who covers it", () => {
    applyFirstFix('Ravi')
    const d = getDemo()
    const ravi = person('Ravi')
    expect(d.changes.length).toBeGreaterThanOrEqual(2)
    const mine = d.changes.find((c) => c.staffId === ravi.id)!
    expect(mine.before).not.toBeNull()
    expect(mine.after).toBeNull() // he is now off
    expect(mine.cause).toBe('fix')
    const cover = d.changes.find((c) => c.staffId !== ravi.id && c.date === mine.date)!
    expect(cover.after).toBe(mine.before) // someone else works the shift he gave up
    // the same facts are on the roster and on his phone
    expect(myAssignments(d, ravi.id).some((a) => a.date === mine.date)).toBe(false)
    expect(managerUpdates(d, ravi.id)[0].kind).toBe('weekly-off')
    expect(managerUpdates(d, ravi.id)[0].covers.length).toBeGreaterThan(0)
  })

  it("moves nobody else's cells and keeps every shift covered", () => {
    const before = getDemo().roster.unmet.length
    applyFirstFix('Ravi')
    const d = getDemo()
    expect(d.roster.unmet.length).toBe(before)
    expectChangesMatchRoster()
  })

  it('a fix that only adds a plan (Arjun) records no shift changes but is still on his phone', () => {
    applyFirstFix('Arjun')
    const d = getDemo()
    expect(d.changes).toEqual([])
    expect(managerUpdates(d, person('Arjun').id)[0].kind).toBe('recognition')
  })

  it('survives a regenerated roster', () => {
    applyFirstFix('Ravi')
    expect(regenerateWithFixes().assignments).toEqual(getDemo().roster.assignments)
  })

  it('undo removes every trace of it', () => {
    applyFirstFix('Ravi')
    undoDemoFix()
    const d = getDemo()
    expect(d.changes).toEqual([])
    expect(managerUpdates(d, person('Ravi').id)).toEqual([])
  })

  it('two fixes in a row stay consistent, and undoing one keeps the other', () => {
    applyFirstFix('Ravi')
    applyFirstFix('Meena')
    expectChangesMatchRoster()
    undoDemoFix()
    expect(managerUpdates(getDemo(), person('Meena').id)).toEqual([])
    expect(managerUpdates(getDemo(), person('Ravi').id)[0].kind).toBe('weekly-off')
    expectChangesMatchRoster()
  })
})

describe('swaps and fixes together', () => {
  it('a swap is recorded as a swap, and a later fix does not lose it or double count', () => {
    const d0 = getDemo()
    const ravi = person('Ravi')
    let swap: { bId: string; aDate: string; bDate: string } | null = null
    outer: for (const a of myAssignments(d0, ravi.id)) {
      for (const { person: b } of swapPeers(d0, ravi)) {
        for (const x of myAssignments(d0, b.id)) {
          if (x.date !== a.date && evaluateSwap(d0, ravi, a.date, b, x.date).ok) {
            swap = { bId: b.id, aDate: a.date, bDate: x.date }
            break outer
          }
        }
      }
    }
    expect(swap).not.toBeNull()
    const rec = requestSwap({ aId: ravi.id, ...swap! })!
    expect(getDemo().changes.every((c) => c.cause === 'swap')).toBe(true)
    expect(getDemo().changes).toHaveLength(4)
    expectChangesMatchRoster()
    applyFirstFix('Meena')
    expectChangesMatchRoster()
    undoSwap(rec.id)
    expect(getDemo().changes.some((c) => c.cause === 'swap')).toBe(false)
    expectChangesMatchRoster()
  })
})
