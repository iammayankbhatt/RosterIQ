import { beforeEach, describe, expect, it } from 'vitest'
import { recommendFix } from '../engine'
import { COURSES, coursesFor, holdsCourseSkill } from './courses'
import { advanceCourse, applyDemoFix, clearDemo, getDemo, requestSwap, setMood, undoSwap } from './demo'
import { rankPeople } from './riskView'
import { DEMO_NOW, evaluateSwap, fixedOffWeekday, managerUpdates, myAssignments, nextShift, nextSeason, seasonsFor, swapPeers } from './staffApp'
import { TEXT_KEYS, countdown, dateLabel, makeT, nameL, shiftTime, skillL } from './staffText'

beforeEach(() => clearDemo())

const person = (name: string) => getDemo().people.find((p) => p.name.startsWith(name))!
const riskOf = (name: string) => {
  const d = getDemo()
  return d.risks[d.people.findIndex((p) => p.name.startsWith(name))]
}

describe('my shifts', () => {
  it('finds the next shift after the sample clock', () => {
    const d = getDemo()
    for (const name of ['Ravi', 'Meena', 'Arjun']) {
      const n = nextShift(d, person(name).id, DEMO_NOW)
      expect(n).not.toBeNull()
      expect(Date.parse(`${n!.date}T00:00:00+05:30`)).toBeGreaterThanOrEqual(Date.parse('2026-10-13T00:00:00+05:30'))
    }
  })

  it("shows the manager's weekly-off fix on Ravi's phone", () => {
    const ravi = rankPeople(getDemo()).find((r) => r.person.name.startsWith('Ravi'))!
    expect(managerUpdates(getDemo(), ravi.person.id)).toEqual([])
    applyDemoFix(recommendFix(ravi.person, ravi.risk.reasons)[0])
    const updates = managerUpdates(getDemo(), ravi.person.id)
    expect(updates[0].kind).toBe('weekly-off')
    expect(fixedOffWeekday(updates)).toBe(2) // Tuesday, the quietest weekday for Housekeeping
    expect(updates[0].covers.length).toBeGreaterThan(0)
  })
})

describe('swaps', () => {
  it('only offers coworkers in the same department who share a skill', () => {
    const meena = person('Meena')
    const peers = swapPeers(getDemo(), meena)
    expect(peers.length).toBeGreaterThan(0)
    for (const p of peers) {
      expect(p.person.department).toBe('Front Desk')
      expect(p.shared).toMatch(/Front-desk certified|Property|Night|OTA|First-aid/)
    }
  })

  it('applies a fair swap to the shared roster and can undo it', () => {
    const d = getDemo()
    const ravi = person('Ravi')
    let found: { bId: string; aDate: string; bDate: string } | null = null
    outer: for (const a of myAssignments(d, ravi.id)) {
      for (const { person: b } of swapPeers(d, ravi)) {
        for (const x of myAssignments(d, b.id)) {
          if (evaluateSwap(d, ravi, a.date, b, x.date).ok && x.date !== a.date) {
            found = { bId: b.id, aDate: a.date, bDate: x.date }
            break outer
          }
        }
      }
    }
    expect(found).not.toBeNull()
    const before = myAssignments(d, ravi.id).find((a) => a.date === found!.aDate)!
    const rec = requestSwap({ aId: ravi.id, ...found! })
    expect(rec).not.toBeNull()
    const after = getDemo()
    expect(after.swaps).toHaveLength(1)
    expect(myAssignments(after, ravi.id).some((a) => a.date === found!.aDate)).toBe(false)
    expect(myAssignments(after, found!.bId).find((a) => a.date === found!.aDate)?.shift).toBe(before.shift)
    expect(after.roster.unmet.length).toBe(d.roster.unmet.length)
    undoSwap(rec!.id)
    expect(getDemo().swaps).toHaveLength(0)
    expect(myAssignments(getDemo(), ravi.id)).toEqual(myAssignments(d, ravi.id))
  })

  it('rejects a swap that would break the 11-hour rest', () => {
    const d = getDemo()
    // same person pair, scan every combination: at least one should fail a rule, and failures say which
    const meena = person('Meena')
    let sawFailure = false
    for (const a of myAssignments(d, meena.id)) {
      for (const { person: b } of swapPeers(d, meena)) {
        for (const x of myAssignments(d, b.id)) {
          const e = evaluateSwap(d, meena, a.date, b, x.date)
          if (!e.ok) {
            sawFailure = true
            expect(e.checks.some((c) => !c.ok)).toBe(true)
          }
        }
      }
    }
    expect(sawFailure).toBe(true)
  })
})

describe('mood and courses feed the stagnation signal', () => {
  it("a good check-in eases Arjun's feedback signal; a hard one worsens it", () => {
    const base = riskOf('Arjun').score
    setMood(person('Arjun').id, 5)
    expect(riskOf('Arjun').score).toBeLessThan(base)
    setMood(person('Arjun').id, 1)
    expect(riskOf('Arjun').score).toBeGreaterThanOrEqual(base)
    expect(getDemo().people.find((p) => p.name.startsWith('Arjun'))!.feedback.at(-1)!.score).toBe(1)
  })

  it('finishing a course adds the skill and lowers stagnation risk', () => {
    const arjun = person('Arjun')
    const before = riskOf('Arjun')
    expect(before.reasons.some((r) => r.factor === 'no-skill-growth')).toBe(true)
    const course = coursesFor(arjun).find((c) => c.id === 'fssai-2')!
    expect(holdsCourseSkill(arjun, course)).toBe(false)
    for (let i = 0; i < course.lessons; i++) {
      advanceCourse(arjun.id, course.id)
      if (i < course.lessons - 1) expect(holdsCourseSkill(person('Arjun'), course)).toBe(false)
    }
    expect(holdsCourseSkill(person('Arjun'), course)).toBe(true)
    const after = riskOf('Arjun')
    expect(after.reasons.some((r) => r.factor === 'no-skill-growth')).toBe(false)
    expect(after.score).toBeLessThan(before.score)
  })

  it('first aid is a real engine skill once earned', async () => {
    const { hasSkill } = await import('../engine')
    const ravi = person('Ravi')
    expect(hasSkill(ravi, 'first-aid')).toBe(false)
    for (let i = 0; i < COURSES.find((c) => c.id === 'first-aid')!.lessons; i++) advanceCourse(ravi.id, 'first-aid')
    expect(hasSkill(person('Ravi'), 'first-aid')).toBe(true)
  })
})

describe('seasons', () => {
  it('lists seasons since joining, newest first, with this season marked', () => {
    const rows = seasonsFor(person('Ravi'))
    expect(rows[0].current).toBe(true)
    expect(rows[0].kind).toBe('autumn')
    expect(rows.at(-1)!.year).toBe(2019)
    expect(rows.flatMap((r) => r.skills).length).toBe(person('Ravi').skills.length)
    expect(nextSeason(rows)).toEqual({ kind: 'summer', year: 2027 })
  })
})

describe('language', () => {
  const en = makeT('en')
  const hi = makeT('hi')
  const placeholders = (str: string) => [...str.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

  it('has real Hindi for every label, with the same placeholders as English', () => {
    expect(TEXT_KEYS.length).toBeGreaterThan(100)
    for (const k of TEXT_KEYS) {
      expect(hi(k), k).toMatch(/[ऀ-ॿ]/)
      expect(hi(k), k).not.toBe(en(k))
      expect(placeholders(hi(k)), k).toEqual(placeholders(en(k)))
    }
  })

  it('translates dates, names, shifts and countdowns', () => {
    expect(nameL('Ravi Kumar', 'hi')).toBe('रवि कुमार')
    expect(dateLabel('2026-10-13', 'hi')).toBe('मंगल 13 अक्टू॰')
    expect(dateLabel('2026-10-13', 'en')).toBe('Tue 13 Oct')
    expect(shiftTime('M', 'hi')).toContain('सुबह')
    expect(countdown(26 * 3_600_000, 'hi')).toBe('1 दिन 2 घंटे')
    expect(countdown(21 * 3_600_000, 'hi')).toBe('21 घंटे')
    expect(countdown(26 * 3_600_000, 'en')).toBe('1 day 2 h')
  })

  it('has a Hindi name for everyone and a Hindi title for every course', () => {
    for (const p of getDemo().people) expect(nameL(p.name, 'hi'), p.name).toMatch(/[ऀ-ॿ]/)
    for (const c of COURSES) expect(c.title.hi).toMatch(/[ऀ-ॿ]/)
    for (const p of getDemo().people) for (const s of p.skills) expect(skillL(s.label, 'hi'), s.label).toMatch(/[ऀ-ॿ]/)
  })
})
