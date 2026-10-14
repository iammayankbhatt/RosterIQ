import type { Staff } from '../data/types'
import type { Assignment, EngineShift, ResolvedOptions, RosterOptions, SkillKey } from './types'

export const SHIFT_LIST: EngineShift[] = ['M', 'E', 'N']
export const SHIFT_INFO: Record<EngineShift, { label: string; start: number; end: number }> = {
  M: { label: 'Morning', start: 6, end: 14 },
  E: { label: 'Evening', start: 14, end: 22 },
  N: { label: 'Night', start: 22, end: 30 },
}
export const SHIFT_LEN = 8

/** Overtime is paid at 2× the hourly rate (assumption, in line with Indian labour-law norms). */
export const OVERTIME_MULTIPLIER = 2

export interface Span {
  start: number
  end: number
}

export function dayNumber(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000)
}

export function addDays(iso: string, n: number): string {
  return new Date((dayNumber(iso) + n) * 86_400_000).toISOString().slice(0, 10)
}

/** 0 = Sunday */
export function weekdayOf(iso: string): number {
  return new Date(dayNumber(iso) * 86_400_000).getUTCDay()
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "Tue 13 Oct" (hand-rolled: Intl is far too slow to call in the solver's inner loop) */
export function fmtDate(iso: string): string {
  return `${DAY_NAMES[weekdayOf(iso)]} ${Number(iso.slice(8, 10))} ${MONTH_NAMES[Number(iso.slice(5, 7)) - 1]}`
}

export function spanOf(date: string, shift: EngineShift): Span {
  const base = dayNumber(date) * 24
  return { start: base + SHIFT_INFO[shift].start, end: base + SHIFT_INFO[shift].end }
}

export function resolveOptions(o: RosterOptions = {}): ResolvedOptions {
  return {
    rooms: o.rooms ?? 25,
    minRestHours: o.minRestHours ?? 11,
    maxConsecutiveDays: o.maxConsecutiveDays ?? 6,
    maxOvertimePerWeek: o.maxOvertimePerWeek ?? 8,
    rules: o.rules ?? {},
  }
}

export function hasSkill(p: Staff, key: SkillKey): boolean {
  return p.skills.some((s) => {
    const l = s.label.toLowerCase()
    if (key === 'front-desk') return l.includes('front-desk certified')
    if (key === 'cook') return l === 'cook'
    return l.includes('first-aid')
  })
}

export function sortAssignments(a: Assignment[]): Assignment[] {
  return [...a].sort((x, y) => x.date.localeCompare(y.date) || x.staffId.localeCompare(y.staffId))
}
