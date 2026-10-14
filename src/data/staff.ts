import type {
  Department,
  FeedbackPoint,
  LeaveRequest,
  SeedTag,
  ShiftCode,
  ShiftRecord,
  Skill,
  Staff,
} from './types'

/* ------------------------------------------------------------------ */
/* Shift history is generated deterministically (no randomness) so the */
/* sample data is identical on every load. 6 weeks: 1 Sep – 12 Oct 2026 */
/* ------------------------------------------------------------------ */

export const HISTORY_START = '2026-09-01'
export const HISTORY_DAYS = 42

const SHIFT_TIMES: Record<Exclude<ShiftCode, 'X' | 'LV'>, [number, number]> = {
  O: [5.5, 13.5],
  D: [9, 17],
  E: [14, 22],
  C: [16, 24.5],
}

function isoDay(offset: number): string {
  const d = new Date(`${HISTORY_START}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + offset)
  return d.toISOString().slice(0, 10)
}

function weekday(offset: number): number {
  return new Date(`${isoDay(offset)}T00:00:00Z`).getUTCDay()
}

function rec(i: number, shift: ShiftCode, endOverride?: number): ShiftRecord {
  const date = isoDay(i)
  if (shift === 'X' || shift === 'LV') return { date, shift, start: null, end: null, hours: 0 }
  const [start, end0] = SHIFT_TIMES[shift]
  const end = endOverride ?? end0
  return { date, shift, start, end, hours: end - start }
}

interface Build {
  /** shift rotation for the person's regular weeks */
  rotation: ShiftCode[]
  /** days off per week = 7 - contracted/8 */
  weeklyHours: number
  seed: number
  leaveDays?: number[]
  override?: (i: number) => ShiftRecord | null
}

function buildHistory({ rotation, weeklyHours, seed, leaveDays = [], override }: Build): ShiftRecord[] {
  const offCount = 7 - Math.round(weeklyHours / 8)
  const out: ShiftRecord[] = []
  for (let i = 0; i < HISTORY_DAYS; i++) {
    const custom = override?.(i)
    if (custom) {
      out.push(custom)
      continue
    }
    if (leaveDays.includes(i)) {
      out.push(rec(i, 'LV'))
      continue
    }
    const wd = weekday(i)
    const offs = Array.from({ length: offCount }, (_, k) => (seed + k) % 7)
    if (offs.includes(wd)) {
      out.push(rec(i, 'X'))
      continue
    }
    const week = Math.floor(i / 7)
    out.push(rec(i, rotation[(week + seed) % rotation.length]))
  }
  return out
}

const skill = (label: string, since: string): Skill => ({ label, since })
const fb = (scores: number[]): FeedbackPoint[] =>
  ['Q4 2025', 'Q1 2026', 'Q2 2026', 'Q3 2026'].map((period, k) => ({ period, score: scores[k] }))

interface Seed {
  id: string
  name: string
  department: Department
  role: string
  skills: Skill[]
  weeklyHours: number
  hourlyRate: number
  joinDate: string
  preferredShifts: ShiftCode[]
  feedback: number[]
  rotation: ShiftCode[]
  leaveDays?: number[]
  override?: Build['override']
  seedTag?: SeedTag
  seedNote?: string
}

const seeds: Seed[] = [
  /* ---------------- Front Desk ---------------- */
  {
    id: 'st-01',
    name: 'Meena Rawat',
    department: 'Front Desk',
    role: 'Front Desk Executive',
    skills: [skill('Front-desk certified', '2021-04'), skill('Hindi / English / Garhwali', '2020-01'), skill('Property-management software', '2023-02')],
    weeklyHours: 40,
    hourlyRate: 165,
    joinDate: '2020-01-13',
    preferredShifts: ['D', 'O'],
    feedback: [4.3, 4.2, 4.0, 3.8],
    rotation: ['D', 'O', 'D'],
    // From day 21 she cycles close, close, close, open, open, off: only 5 h between a close and the next open.
    override: (i) => {
      if (i < 21) return null
      const step = (i - 21) % 6
      return rec(i, (['C', 'C', 'C', 'O', 'O', 'X'] as ShiftCode[])[step])
    },
    seedTag: 'rest-gap',
    seedNote: 'Three late closes, then early opens, repeated for 3 weeks. 5 h rest between a 00:30 close and a 05:30 open.',
  },
  {
    id: 'st-02',
    name: 'Karan Negi',
    department: 'Front Desk',
    role: 'Night Auditor & Front Desk',
    skills: [skill('Front-desk certified', '2022-09'), skill('Night audit', '2024-03')],
    weeklyHours: 40,
    hourlyRate: 150,
    joinDate: '2022-08-01',
    preferredShifts: ['E', 'C'],
    feedback: [4.0, 4.1, 4.0, 4.2],
    rotation: ['E', 'D'],
    leaveDays: [11, 12],
  },
  {
    id: 'st-03',
    name: 'Pooja Bisht',
    department: 'Front Desk',
    role: 'Reservations Associate',
    skills: [skill('Front-desk certified', '2023-05'), skill('OTA channel manager', '2025-01')],
    weeklyHours: 40,
    hourlyRate: 140,
    joinDate: '2023-04-17',
    preferredShifts: ['D'],
    feedback: [3.9, 4.0, 4.1, 4.1],
    rotation: ['D', 'D', 'O'],
  },
  {
    id: 'st-04',
    name: 'Aditya Joshi',
    department: 'Front Desk',
    role: 'Guest Relations Executive',
    skills: [skill('Front-desk certified', '2021-11'), skill('First-aid', '2024-07')],
    weeklyHours: 40,
    hourlyRate: 175,
    joinDate: '2021-10-04',
    preferredShifts: ['O', 'D'],
    feedback: [4.2, 4.2, 4.3, 4.2],
    rotation: ['O', 'D', 'E'],
  },

  /* ---------------- Housekeeping ---------------- */
  {
    id: 'st-05',
    name: 'Ravi Kumar',
    department: 'Housekeeping',
    role: 'Room Attendant',
    skills: [skill('Room turnaround', '2019-06'), skill('Laundry operations', '2022-03')],
    weeklyHours: 48,
    hourlyRate: 100,
    joinDate: '2019-05-20',
    preferredShifts: ['O', 'D'],
    feedback: [4.1, 4.0, 3.7, 3.4],
    rotation: ['O'],
    // Last weekly off was Mon 21 Sep (day 20). Since then 21 days straight, 5:30–15:30.
    override: (i) => (i >= 21 ? rec(i, 'O', 15.5) : i === 20 ? rec(i, 'X') : null),
    seedTag: 'overwork',
    seedNote: '21 days without a weekly off; 10 h days (about 70 h/week against 48 h contracted).',
  },
  {
    id: 'st-06',
    name: 'Sunita Devi',
    department: 'Housekeeping',
    role: 'Floor Supervisor',
    skills: [skill('Room turnaround', '2018-03'), skill('Supervisor training', '2022-10'), skill('First-aid', '2025-02')],
    weeklyHours: 48,
    hourlyRate: 120,
    joinDate: '2018-02-26',
    preferredShifts: ['O', 'D'],
    feedback: [4.4, 4.3, 4.4, 4.5],
    rotation: ['O', 'D'],
    leaveDays: [26, 27, 28],
  },
  {
    id: 'st-07',
    name: 'Kavita Panwar',
    department: 'Housekeeping',
    role: 'Room Attendant',
    skills: [skill('Room turnaround', '2022-04'), skill('Public-area care', '2024-02'), skill('Laundry operations', '2026-06')],
    weeklyHours: 48,
    hourlyRate: 105,
    joinDate: '2022-03-28',
    preferredShifts: ['D', 'O'],
    feedback: [4.0, 4.2, 4.4, 4.6],
    rotation: ['D', 'O'],
    seedTag: 'healthy',
    seedNote: 'Steady weekly off, consistent shifts, a new skill in June, feedback rising.',
  },
  {
    id: 'st-08',
    name: 'Bimla Gusain',
    department: 'Housekeeping',
    role: 'Room Attendant',
    skills: [skill('Room turnaround', '2020-08')],
    weeklyHours: 48,
    hourlyRate: 100,
    joinDate: '2020-07-13',
    preferredShifts: ['D'],
    feedback: [3.9, 3.9, 4.0, 3.9],
    rotation: ['D', 'D', 'O'],
  },
  {
    id: 'st-09',
    name: 'Deepak Tamang',
    department: 'Housekeeping',
    role: 'Laundry & Linen Attendant',
    skills: [skill('Laundry operations', '2023-09'), skill('Room turnaround', '2024-10')],
    weeklyHours: 48,
    hourlyRate: 98,
    joinDate: '2023-09-04',
    preferredShifts: ['O'],
    feedback: [3.8, 3.9, 4.0, 4.0],
    rotation: ['O', 'D'],
  },

  /* ---------------- Kitchen ---------------- */
  {
    id: 'st-10',
    name: 'Arjun Thakur',
    department: 'Kitchen',
    role: 'Commis Chef (Tandoor & Grill)',
    skills: [skill('Cook', '2019-05'), skill('Tandoor', '2020-11'), skill('Food-safety (FSSAI) level 1', '2025-04')],
    weeklyHours: 48,
    hourlyRate: 135,
    joinDate: '2019-03-11',
    preferredShifts: ['E', 'D'],
    feedback: [4.2, 3.9, 3.5, 3.1],
    rotation: ['E', 'D', 'E'],
    seedTag: 'stagnation',
    seedNote: 'No new skill in 18 months (last: Apr 2025). Feedback has slid 4.2 to 3.1 over four quarters. Hours are fine; growth is stalled.',
  },
  {
    id: 'st-11',
    name: 'Mohan Bhandari',
    department: 'Kitchen',
    role: 'Head Chef',
    skills: [skill('Cook', '2008-01'), skill('Menu costing', '2016-05'), skill('Food-safety (FSSAI) level 2', '2024-12'), skill('First-aid', '2023-03')],
    weeklyHours: 48,
    hourlyRate: 260,
    joinDate: '2017-11-06',
    preferredShifts: ['D', 'E'],
    feedback: [4.5, 4.5, 4.4, 4.5],
    rotation: ['D', 'E'],
  },
  {
    id: 'st-12',
    name: 'Rekha Rana',
    department: 'Kitchen',
    role: 'Cook (Pahadi & North Indian)',
    skills: [skill('Cook', '2021-05'), skill('Pahadi regional menu', '2023-10')],
    weeklyHours: 48,
    hourlyRate: 125,
    joinDate: '2021-04-19',
    preferredShifts: ['O', 'D'],
    feedback: [4.1, 4.0, 4.2, 4.1],
    rotation: ['O', 'D'],
    leaveDays: [33, 34],
  },
  {
    id: 'st-13',
    name: 'Sanjay Gurung',
    department: 'Kitchen',
    role: 'Kitchen Helper & Dishwash Lead',
    skills: [skill('Prep & hygiene', '2024-05')],
    weeklyHours: 48,
    hourlyRate: 95,
    joinDate: '2024-04-22',
    preferredShifts: ['D', 'E'],
    feedback: [3.7, 3.8, 3.9, 4.0],
    rotation: ['D', 'E', 'E'],
  },

  /* ---------------- F&B Service ---------------- */
  {
    id: 'st-14',
    name: 'Neha Uniyal',
    department: 'F&B Service',
    role: 'Restaurant Captain',
    skills: [skill('Fine-dining service', '2021-03'), skill('Barista', '2024-08'), skill('Wine & mocktail service', '2026-05')],
    weeklyHours: 40,
    hourlyRate: 150,
    joinDate: '2021-02-15',
    preferredShifts: ['E', 'D'],
    feedback: [4.2, 4.4, 4.5, 4.7],
    rotation: ['E', 'D'],
    seedTag: 'healthy',
    seedNote: 'Two consecutive offs every week, shifts match her preference, new skill in May, feedback rising.',
  },
  {
    id: 'st-15',
    name: 'Imran Qureshi',
    department: 'F&B Service',
    role: 'Steward',
    skills: [skill('Banquet service', '2022-11'), skill('Barista', '2025-03')],
    weeklyHours: 40,
    hourlyRate: 120,
    joinDate: '2022-10-10',
    preferredShifts: ['E'],
    feedback: [3.9, 4.0, 4.0, 4.1],
    rotation: ['E', 'E', 'D'],
  },
  {
    id: 'st-16',
    name: 'Priya Semwal',
    department: 'F&B Service',
    role: 'Breakfast & Room-Service Associate',
    skills: [skill('Room service', '2023-07'), skill('First-aid', '2025-06')],
    weeklyHours: 40,
    hourlyRate: 115,
    joinDate: '2023-06-26',
    preferredShifts: ['O', 'D'],
    feedback: [4.0, 4.0, 4.1, 4.0],
    rotation: ['O', 'D'],
    leaveDays: [18],
  },

  /* ---------------- Maintenance ---------------- */
  {
    id: 'st-17',
    name: 'Dev Nautiyal',
    department: 'Maintenance',
    role: 'Maintenance Technician',
    skills: [skill('Electrical (ITI)', '2018-06'), skill('Plumbing', '2020-02'), skill('Geyser & boiler servicing', '2023-11'), skill('Solar water-heater maintenance', '2026-04')],
    weeklyHours: 40,
    hourlyRate: 165,
    joinDate: '2018-05-21',
    preferredShifts: ['D'],
    feedback: [4.3, 4.4, 4.5, 4.6],
    rotation: ['D', 'D', 'O'],
    seedTag: 'healthy',
    seedNote: 'Day shifts, two offs every week, a new skill in April, steady positive feedback.',
  },
  {
    id: 'st-18',
    name: 'Suresh Kandari',
    department: 'Maintenance',
    role: 'Maintenance Helper & Gardener',
    skills: [skill('Basic electrical', '2022-02'), skill('Garden & grounds', '2019-09')],
    weeklyHours: 40,
    hourlyRate: 120,
    joinDate: '2019-09-02',
    preferredShifts: ['D', 'O'],
    feedback: [3.9, 3.9, 3.8, 3.9],
    rotation: ['D', 'O'],
  },

  /* ---------------- Security ---------------- */
  {
    id: 'st-19',
    name: 'Bahadur Thapa',
    department: 'Security',
    role: 'Security Supervisor',
    skills: [skill('PSARA guard licence', '2016-04'), skill('Fire-safety & first-aid', '2025-08')],
    weeklyHours: 48,
    hourlyRate: 115,
    joinDate: '2016-03-14',
    preferredShifts: ['D', 'E'],
    feedback: [4.1, 4.1, 4.2, 4.1],
    rotation: ['D', 'E'],
  },
  {
    id: 'st-20',
    name: 'Ramesh Khanduri',
    department: 'Security',
    role: 'Security Guard',
    skills: [skill('PSARA guard licence', '2021-12'), skill('CCTV monitoring', '2023-06')],
    weeklyHours: 48,
    hourlyRate: 100,
    joinDate: '2021-11-22',
    preferredShifts: ['E', 'C'],
    feedback: [3.8, 3.9, 3.8, 3.9],
    rotation: ['E', 'C', 'E'],
  },
]

// Leave requests inside the 14-day forecast window (13–26 Oct 2026).
const futureLeave: Record<string, LeaveRequest[]> = {
  'st-02': [{ from: '2026-10-21', to: '2026-10-21', reason: 'Family function, Dehradun', status: 'approved' }],
  'st-06': [{ from: '2026-10-23', to: '2026-10-26', reason: 'Village visit for harvest festival', status: 'pending' }],
  'st-12': [{ from: '2026-10-19', to: '2026-10-19', reason: 'Medical check-up', status: 'approved' }],
  'st-15': [{ from: '2026-10-14', to: '2026-10-14', reason: 'Bank and document work', status: 'pending' }],
  'st-05': [{ from: '2026-10-18', to: '2026-10-19', reason: "Daughter's school event", status: 'pending' }],
}

export const staff: Staff[] = seeds.map((s, idx) => ({
  id: s.id,
  name: s.name,
  department: s.department,
  role: s.role,
  skills: s.skills,
  weeklyHours: s.weeklyHours,
  hourlyRate: s.hourlyRate,
  joinDate: s.joinDate,
  leave: futureLeave[s.id] ?? [],
  preferredShifts: s.preferredShifts,
  feedback: fb(s.feedback),
  history: buildHistory({
    rotation: s.rotation,
    weeklyHours: s.weeklyHours,
    seed: idx,
    leaveDays: s.leaveDays,
    override: s.override,
  }),
  seedTag: s.seedTag,
  seedNote: s.seedNote,
}))

export const departments: Department[] = [
  'Front Desk',
  'Housekeeping',
  'Kitchen',
  'F&B Service',
  'Maintenance',
  'Security',
]
