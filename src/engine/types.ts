import type { Department } from '../data/types'

/** Morning 06:00–14:00 · Evening 14:00–22:00 · Night 22:00–06:00. All 8 h. */
export type EngineShift = 'M' | 'E' | 'N'

export type SkillKey = 'front-desk' | 'cook' | 'first-aid'

export interface Assignment {
  staffId: string
  date: string
  shift: EngineShift
}

export interface DemandSlot {
  date: string
  department: Department
  shift: EngineShift
  count: number
  /** at least one person on this slot must hold this skill */
  requiresSkill?: SkillKey
}

export interface DemandDay {
  date: string
  weekday: string
  occupancyPct: number
  occupiedRooms: number
  guests: number
  slots: DemandSlot[]
  /** at least one first-aid-trained person on site this day */
  firstAidRequired: boolean
}

export interface UnmetDemand {
  date: string
  kind: 'headcount' | 'skill' | 'first-aid'
  department?: Department
  shift?: EngineShift
  missing: number
  text: string
}

export type ViolationRule = 'rest' | 'weekly-off' | 'max-consecutive' | 'leave' | 'skill' | 'rule'

export interface Violation {
  rule: ViolationRule
  staffId?: string
  date: string
  text: string
}

export interface Decision {
  kind: 'rest' | 'leave' | 'overtime' | 'nights' | 'skill' | 'first-aid' | 'repair' | 'unmet' | 'note'
  staffId?: string
  date?: string
  text: string
}

export interface PersonHours {
  /** hours per 7-day block of the roster */
  weekHours: number[]
  overtimeByWeek: number[]
  totalHours: number
  overtimeHours: number
  overtimeCost: number
  shifts: number
  nights: number
}

export interface Roster {
  kind: 'engine' | 'manual'
  startDate: string
  dates: string[]
  assignments: Assignment[]
  demand: DemandDay[]
  hours: Record<string, PersonHours>
  totalOvertimeHours: number
  /** ₹, overtime paid at OVERTIME_MULTIPLIER × hourly rate (assumption) */
  totalOvertimeCost: number
  unmet: UnmetDemand[]
  decisions: Decision[]
}

export interface PersonRules {
  /** 0 = Sunday … 6 = Saturday: a fixed weekly off that is never rostered */
  fixedOffWeekday?: number
  maxConsecutiveNights?: number
}

export interface RosterOptions {
  rooms?: number
  /** hours */
  minRestHours?: number
  maxConsecutiveDays?: number
  /** overtime the repair pass may use per person per week, hours */
  maxOvertimePerWeek?: number
  rules?: Record<string, PersonRules>
}

export interface ResolvedOptions {
  rooms: number
  minRestHours: number
  maxConsecutiveDays: number
  maxOvertimePerWeek: number
  rules: Record<string, PersonRules>
}
