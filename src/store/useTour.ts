import { create } from 'zustand'
import { useApp } from './useApp'

const KEY = 'rosteriq-welcomed'

function alreadyWelcomed(): boolean {
  try {
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export const TOUR_STEPS = 6

interface TourState {
  /** the first-load welcome screen */
  welcomeOpen: boolean
  dismissWelcome: () => void
  active: boolean
  /** 0-based */
  step: number
  /** restores the original demo state, then begins at step one */
  start: () => void
  next: () => void
  back: () => void
  exit: () => void
}

export const useTour = create<TourState>((set, get) => ({
  welcomeOpen: !alreadyWelcomed(),
  dismissWelcome: () => {
    try {
      sessionStorage.setItem(KEY, '1')
    } catch {
      /* private mode: the welcome simply shows again next load */
    }
    set({ welcomeOpen: false })
  },
  active: false,
  step: 0,
  start: () => {
    get().dismissWelcome()
    useApp.getState().resetDemo()
    set({ active: true, step: 0 })
  },
  next: () => {
    const { step } = get()
    if (step >= TOUR_STEPS - 1) set({ active: false })
    else set({ step: step + 1 })
  },
  back: () => set((s) => ({ step: Math.max(0, s.step - 1) })),
  exit: () => set({ active: false }),
}))
