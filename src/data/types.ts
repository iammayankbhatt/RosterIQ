export type Department =
  | 'Front Desk'
  | 'Housekeeping'
  | 'Kitchen'
  | 'F&B Service'
  | 'Maintenance'
  | 'Security'

/** O open 05:30–13:30 · D day 09:00–17:00 · E evening 14:00–22:00 · C late close 16:00–00:30 · X weekly off · LV leave */
export type ShiftCode = 'O' | 'D' | 'E' | 'C' | 'X' | 'LV'

export interface ShiftRecord {
  /** ISO date, e.g. 2026-09-14 */
  date: string
  shift: ShiftCode
  /** decimal hours; end may exceed 24 for shifts finishing after midnight */
  start: number | null
  end: number | null
  hours: number
}

export interface Skill {
  label: string
  /** ISO month the skill was gained, e.g. 2023-06 */
  since: string
}

export interface LeaveRequest {
  from: string
  to: string
  reason: string
  status: 'approved' | 'pending'
}

export interface FeedbackPoint {
  period: string
  /** 1–5 guest + supervisor blended score (sample) */
  score: number
}

export type SeedTag = 'overwork' | 'rest-gap' | 'stagnation' | 'healthy'

export interface Staff {
  id: string
  name: string
  department: Department
  role: string
  skills: Skill[]
  weeklyHours: number
  /** ₹ per hour (sample) */
  hourlyRate: number
  joinDate: string
  leave: LeaveRequest[]
  preferredShifts: ShiftCode[]
  feedback: FeedbackPoint[]
  history: ShiftRecord[]
  /** manager actions already agreed (set by applyFix); they earn mitigation credit in the risk score */
  plan?: { skillCourse?: string; recognition?: boolean }
  seedTag?: SeedTag
  seedNote?: string
}

export interface OccupancyDay {
  date: string
  weekday: string
  /** % of 25 rooms (assumption) */
  occupancyPct: number
  roomsOccupied: number
  note?: string
}

export interface Resignation {
  name: string
  department: Department
  month: string
  reason: string
  /** ₹ — recruiting, onboarding and lost-productivity estimate (assumption) */
  replacementCost: number
}

export interface Hotel {
  name: string
  town: string
  rooms: number
}
