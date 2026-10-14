import { beforeEach, describe, expect, it } from 'vitest'
import { recommendFix } from '../engine'
import { applyDemoFix, canUndo, clearDemo, getDemo } from '../lib/demo'
import { rankPeople } from '../lib/riskView'
import { TOUR_STEPS, useTour } from './useTour'
import { useApp } from './useApp'

beforeEach(() => {
  clearDemo()
  useTour.setState({ active: false, step: 0, welcomeOpen: true })
})

describe('guided tour', () => {
  it('starts at step one and dismisses the welcome screen', () => {
    useTour.getState().start()
    const s = useTour.getState()
    expect(s.active).toBe(true)
    expect(s.step).toBe(0)
    expect(s.welcomeOpen).toBe(false)
  })

  it('walks forward and back, never below the first step, and closes after the last', () => {
    const t = useTour.getState()
    t.start()
    useTour.getState().back()
    expect(useTour.getState().step).toBe(0)
    for (let i = 1; i < TOUR_STEPS; i++) useTour.getState().next()
    expect(useTour.getState().step).toBe(TOUR_STEPS - 1)
    expect(useTour.getState().active).toBe(true)
    useTour.getState().next()
    expect(useTour.getState().active).toBe(false)
  })

  it('exit stops the tour', () => {
    useTour.getState().start()
    useTour.getState().exit()
    expect(useTour.getState().active).toBe(false)
  })

  it('starting the tour restores the original demo, even after a fix was applied', () => {
    const ravi = rankPeople(getDemo()).find((r) => r.person.name.startsWith('Ravi'))!
    const originalScore = ravi.risk.score
    applyDemoFix(recommendFix(ravi.person, ravi.risk.reasons)[0])
    expect(canUndo()).toBe(true)
    useApp.setState({ lang: 'hi', staffPersonId: 'st-01' })

    useTour.getState().start()

    expect(canUndo()).toBe(false)
    expect(getDemo().applied).toHaveLength(0)
    expect(rankPeople(getDemo()).find((r) => r.person.name.startsWith('Ravi'))!.risk.score).toBe(originalScore)
    expect(useApp.getState().lang).toBe('en')
    expect(useApp.getState().staffPersonId).toBe('st-05')
  })

  it('reset is instant because the base rosters stay cached', () => {
    getDemo()
    const t0 = performance.now()
    clearDemo()
    getDemo()
    expect(performance.now() - t0).toBeLessThan(150) // the solver alone takes about 330 ms
  })
})
