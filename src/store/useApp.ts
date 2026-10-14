import { create } from 'zustand'
import type { Department } from '../data'
import { clearDemo } from '../lib/demo'

export interface Season {
  id: string
  label: string
  note: string
  /** only the live season has a forecast in this sample build */
  live: boolean
}

export const seasons: Season[] = [
  { id: 'autumn-2026', label: 'Autumn 2026', note: 'Oct to Nov, now', live: true },
  { id: 'summer-2026', label: 'Summer 2026', note: 'Apr to Jun, closed', live: false },
]

interface AppState {
  department: Department | 'All'
  setDepartment: (d: Department | 'All') => void
  seasonId: string
  setSeason: (id: string) => void
  /** bumps on every reset so screens recompute from the engine */
  epoch: number
  resetDemo: () => void
  /** bumps whenever a fix is applied or undone, so every screen re-reads the demo */
  fixVersion: number
  bumpFix: () => void
  /** staff-app preview: whose phone, and which language */
  staffPersonId: string
  setStaffPerson: (id: string) => void
  lang: 'en' | 'hi'
  setLang: (l: 'en' | 'hi') => void
  /** the guided tour can ask the At-risk screen to open someone (id plus a counter so asking twice works) */
  riskFocus: { id: string; n: number } | null
  focusRisk: (id: string) => void
  /** ask the Roster to open on a date (set by links from other screens, cleared once used) */
  rosterFocus: { date: string; n: number } | null
  focusRoster: (date: string | null) => void
}

export const useApp = create<AppState>((set) => ({
  department: 'All',
  setDepartment: (department) => set({ department }),
  seasonId: seasons[0].id,
  setSeason: (seasonId) => set({ seasonId }),
  epoch: 0,
  fixVersion: 0,
  resetDemo: () => {
    clearDemo()
    set((s) => ({ department: 'All', seasonId: seasons[0].id, epoch: s.epoch + 1, fixVersion: s.fixVersion + 1, staffPersonId: 'st-05', lang: 'en', riskFocus: null }))
  },
  bumpFix: () => set((s) => ({ fixVersion: s.fixVersion + 1 })),
  staffPersonId: 'st-05',
  setStaffPerson: (staffPersonId) => set({ staffPersonId }),
  lang: 'en',
  setLang: (lang) => set({ lang }),
  riskFocus: null,
  focusRisk: (id) => set((s) => ({ riskFocus: { id, n: (s.riskFocus?.n ?? 0) + 1 } })),
  rosterFocus: null,
  focusRoster: (date) => set((s) => ({ rosterFocus: date ? { date, n: (s.rosterFocus?.n ?? 0) + 1 } : null })),
}))
