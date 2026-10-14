import type { OccupancyDay } from '../data/types'
import type { DemandDay, DemandSlot, EngineShift } from './types'

/**
 * Staffing ratios. All are sample assumptions a hotel can tune.
 * Occupied rooms = occupancy % × rooms. Covers (meals served) scale with guests.
 */
export const RATIOS = {
  guestsPerRoom: 2,
  /** meals eaten in-house per guest, as a share */
  breakfastShare: 0.85,
  lunchShare: 0.5,
  dinnerShare: 0.75,
  /** walk-in diners on top of in-house guests */
  walkInUplift: 1.1,
  housekeepingRoomsPerMorningAttendant: 6,
  /** an evening turn-down attendant is needed once this many rooms are occupied */
  housekeepingEveningThreshold: 12,
  kitchenCoversPerCook: 40,
  fbMorningCoversPerServer: 60,
  fbEveningCoversPerServer: 40,
  /** occupancy % at or above which extra people are added */
  /** a second front-desk person on the morning only at near-full occupancy */
  frontDeskSecondPct: 95,
  maintenanceEveningPct: 90,
  securityEveningPct: 70,
} as const

export function computeDemand(forecast: OccupancyDay[], rooms = 25): DemandDay[] {
  const R = RATIOS
  return forecast.map((f) => {
    const occupiedRooms = Math.round((f.occupancyPct / 100) * rooms)
    const guests = occupiedRooms * R.guestsPerRoom
    const coversMorning = Math.round(guests * (R.breakfastShare + R.lunchShare) * R.walkInUplift)
    const coversEvening = Math.round(guests * R.dinnerShare * R.walkInUplift)
    const slots: DemandSlot[] = []
    const push = (department: DemandSlot['department'], shift: EngineShift, count: number, requiresSkill?: DemandSlot['requiresSkill']) => {
      if (count > 0) slots.push({ date: f.date, department, shift, count, requiresSkill })
    }

    // Front desk: someone certified on every shift, round the clock; a second person on the busiest mornings.
    push('Front Desk', 'M', f.occupancyPct >= R.frontDeskSecondPct ? 2 : 1, 'front-desk')
    push('Front Desk', 'E', 1, 'front-desk')
    push('Front Desk', 'N', 1, 'front-desk')

    // Housekeeping: 1 attendant per 6 occupied rooms in the morning, turn-down in the evening.
    push('Housekeeping', 'M', Math.ceil(occupiedRooms / R.housekeepingRoomsPerMorningAttendant))
    push('Housekeeping', 'E', occupiedRooms >= R.housekeepingEveningThreshold ? 1 : 0)

    // Kitchen scales with covers; a cook is always on.
    push('Kitchen', 'M', Math.max(1, Math.ceil(coversMorning / R.kitchenCoversPerCook)), 'cook')
    push('Kitchen', 'E', Math.max(1, Math.ceil(coversEvening / R.kitchenCoversPerCook)), 'cook')

    // F&B service scales with covers too.
    push('F&B Service', 'M', Math.max(1, Math.ceil(coversMorning / R.fbMorningCoversPerServer)))
    push('F&B Service', 'E', Math.max(1, Math.ceil(coversEvening / R.fbEveningCoversPerServer)))

    // Maintenance: one technician by day, a second evening cover only on the busiest days.
    push('Maintenance', 'M', 1)
    push('Maintenance', 'E', f.occupancyPct >= R.maintenanceEveningPct ? 1 : 0)

    // Security: one guard overnight, another in the evening on busy days.
    push('Security', 'N', 1)
    push('Security', 'E', f.occupancyPct >= R.securityEveningPct ? 1 : 0)

    return {
      date: f.date,
      weekday: f.weekday,
      occupancyPct: f.occupancyPct,
      occupiedRooms,
      guests,
      slots,
      firstAidRequired: true,
    }
  })
}

export function headcountFor(d: DemandDay, shift?: EngineShift): number {
  return d.slots.filter((s) => !shift || s.shift === shift).reduce((n, s) => n + s.count, 0)
}
