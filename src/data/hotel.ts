import type { Hotel, OccupancyDay, Resignation } from './types'

export const hotel: Hotel = {
  name: 'Deodar Heights (sample hotel)',
  town: 'Mussoorie, Uttarakhand',
  rooms: 25,
}

/** 14-day forecast from Tue 13 Oct 2026. Percentages are sample assumptions. */
const pct = [38, 35, 40, 72, 96, 90, 48, 36, 33, 39, 70, 94, 88, 45]
const notes: Record<number, string> = {
  3: 'Early weekend arrivals',
  4: 'Peak: tour group of 18 arriving',
  5: 'Peak: heavy checkout after lunch',
  6: 'Midweek lull begins',
  10: 'Early weekend arrivals',
  11: 'Peak: wedding party of 14 rooms',
  12: 'Peak: checkout wave',
}

export const occupancyForecast: OccupancyDay[] = pct.map((p, i) => {
  const d = new Date('2026-10-13T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + i)
  return {
    date: d.toISOString().slice(0, 10),
    weekday: d.toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'UTC' }),
    occupancyPct: p,
    roomsOccupied: Math.round((p / 100) * hotel.rooms),
    note: notes[i],
  }
})

const resignations: Resignation[] = [
  { name: 'Anil Rawat', department: 'Housekeeping', month: '2026-04', reason: 'Left for a Dehradun hotel; wanted fixed offs', replacementCost: 28000 },
  { name: 'Sapna Negi', department: 'Front Desk', month: '2026-05', reason: 'Back-to-back late closes', replacementCost: 31500 },
  { name: 'Vikram Bisht', department: 'Kitchen', month: '2026-05', reason: 'No growth path', replacementCost: 29000 },
  { name: 'Mamta Devi', department: 'Housekeeping', month: '2026-05', reason: 'Overtime without a day off', replacementCost: 33000 },
  { name: 'Rohit Semwal', department: 'F&B Service', month: '2026-06', reason: 'Peak-weekend burnout', replacementCost: 30000 },
  { name: 'Gopal Panwar', department: 'Maintenance', month: '2026-06', reason: 'Better offer in Rishikesh', replacementCost: 27500 },
  { name: 'Nisha Gusain', department: 'F&B Service', month: '2026-06', reason: 'Unpredictable rosters', replacementCost: 32000 },
  { name: 'Tenzin Tamang', department: 'Security', month: '2026-06', reason: 'Long unbroken stretches', replacementCost: 29000 },
]

export const lastSeason = {
  label: 'Last season (Apr–Jun 2026, sample record)',
  resignations,
  /** assumption: recruiting + onboarding + lost productivity, per resignation */
  basis: 'Assumption: about ₹30,000 per resignation (recruiting, onboarding, lost productivity). Sample figures.',
}

export const lastSeasonTotal = resignations.reduce((s, r) => s + r.replacementCost, 0)
