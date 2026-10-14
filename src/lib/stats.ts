import type { ShiftRecord } from '../data/types'

/** Longest current run of working days, counted back from the most recent record. */
export function currentStreak(history: ShiftRecord[]): number {
  let n = 0
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].shift === 'X' || history[i].shift === 'LV') break
    n++
  }
  return n
}

export function hoursInLast(history: ShiftRecord[], days: number): number {
  return history.slice(-days).reduce((s, r) => s + r.hours, 0)
}

/** Shortest rest (hours) between the end of one shift and the start of the next worked day. */
export function shortestRest(history: ShiftRecord[]): number | null {
  let min: number | null = null
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1]
    const cur = history[i]
    if (prev.end == null || cur.start == null) continue
    const rest = 24 - prev.end + cur.start
    if (min === null || rest < min) min = rest
  }
  return min
}
