import { departments } from '../data/staff'
import type { OccupancyDay, Staff } from '../data/types'
import { computeDemand } from './demand'
import { finalizeRoster } from './roster'
import { resolveOptions, weekdayOf } from './shifts'
import type { Assignment, EngineShift, Roster, RosterOptions } from './types'

const ORDER: EngineShift[] = ['N', 'M', 'E']

/** Shift a person usually works on paper, from their first stated preference (nights go to whoever is first on the list). */
function usualShift(p: Staff): EngineShift {
  const first = p.preferredShifts[0]
  return first === 'E' || first === 'C' ? 'E' : 'M'
}

/**
 * "A manager writing it on paper": every person has one fixed weekday off and one usual
 * shift, the same every week. Each slot is filled from whoever is not off, usual-shift
 * people first, then the first name on the list; if nobody is free someone is called in
 * on their day off. It respects approved leave and nothing else: no rest check, no cap on
 * days in a row, no overtime awareness, no night fairness, no skills. Its rule-breaks and
 * overtime are real results, not staged ones.
 */
export function generateManualBaseline(staff: Staff[], forecast: OccupancyDay[], options: RosterOptions = {}): Roster {
  const o = resolveOptions(options)
  const demand = computeDemand(forecast, o.rooms)
  const assignments: Assignment[] = []
  // Fixed weekly off, midweek (Mon–Thu), staggered inside each department.
  const offDay = new Map<string, number>()
  departments.forEach((dept, di) => {
    staff.filter((p) => p.department === dept).forEach((p, i) => offDay.set(p.id, 1 + ((i + di) % 4)))
  })
  for (const d of demand) {
    const taken = new Set<string>()
    const wd = weekdayOf(d.date)
    for (const shift of ORDER) {
      for (const dept of departments) {
        const slot = d.slots.find((s) => s.shift === shift && s.department === dept)
        if (!slot) continue
        const free = staff.filter(
          (p) =>
            p.department === dept &&
            !taken.has(p.id) &&
            !p.leave.some((l) => l.status === 'approved' && d.date >= l.from && d.date <= l.to),
        )
        const working = free.filter((p) => offDay.get(p.id) !== wd)
        const ranked = [...working.filter((p) => usualShift(p) === shift), ...working.filter((p) => usualShift(p) !== shift)]
        const callIn = free.filter((p) => offDay.get(p.id) === wd)
        for (const p of [...ranked, ...callIn].slice(0, slot.count)) {
          taken.add(p.id)
          assignments.push({ staffId: p.id, date: d.date, shift })
        }
      }
    }
  }
  return finalizeRoster(
    'manual',
    staff,
    demand,
    assignments,
    [{ kind: 'note', text: 'Manual baseline: fixed offs and usual shifts, same every week, with no rest, streak or overtime checks.' }],
    o,
  )
}
