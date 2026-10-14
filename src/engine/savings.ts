import type { Roster } from './types'

/** Every number here is an assumption the hotel can edit. Savings are proof of value, never used for billing. */
export interface SavingsAssumptions {
  /** ₹ per month the hotel currently spends on overtime (assumption) */
  baselineOvertimeMonthly: number
  /** resignations per year (assumption; sample hotel last season: 8) */
  exitsPerYear: number
  /** ₹ to replace one person: recruiting, onboarding, lost productivity (assumption) */
  costPerExit: number
  /** exits assumed prevented by fairer rosters and early fixes (assumption) */
  exitsPrevented: number
  /** ₹ per month, seasonal subscription (assumption) */
  subscriptionMonthly: number
  /** months the figures are annualised over (assumption) */
  months: number
  /**
   * share of overtime we assume is caused by how rosters are written (the rest is
   * unavoidable: demand spikes, sickness). A deliberate haircut on the roster comparison. (assumption)
   */
  rosterAttributableShare: number
}

export const DEFAULT_ASSUMPTIONS: SavingsAssumptions = {
  baselineOvertimeMonthly: 20_000,
  exitsPerYear: 8,
  costPerExit: 30_000,
  exitsPrevented: 3,
  subscriptionMonthly: 2_499,
  months: 12,
  rosterAttributableShare: 0.45,
}

export interface SavingsResult {
  assumptions: SavingsAssumptions
  basis: 'assumption'
  disclaimer: string
  overtime: {
    baselineHours: number
    newHours: number
    /** overtime cost removed by the new roster vs the manual one, before the attributable-share haircut */
    rosterReductionPct: number
    /** reduction actually applied to the baseline overtime bill (after the haircut) */
    reductionPct: number
    baselineMonthly: number
    newMonthly: number
    savedMonthly: number
    savedAnnual: number
  }
  turnover: {
    exitsBaseline: number
    exitsPrevented: number
    exitsRemaining: number
    savedAnnual: number
  }
  totalAnnual: number
  subscriptionAnnual: number
  netGain: number
  /** total saving ÷ subscription */
  ratio: number
}

/**
 * Overtime saved = baseline monthly overtime × attributable share × (1 − new overtime cost ÷ manual overtime cost),
 * where the cost ratio comes from the two real rosters. Turnover saved = exits prevented × cost per exit.
 */
export function computeSavings(baseline: Roster, next: Roster, overrides: Partial<SavingsAssumptions> = {}): SavingsResult {
  const a = { ...DEFAULT_ASSUMPTIONS, ...overrides }
  const rosterReduction = baseline.totalOvertimeCost > 0 ? Math.min(1, 1 - next.totalOvertimeCost / baseline.totalOvertimeCost) : 0
  const reduction = rosterReduction * a.rosterAttributableShare
  const savedMonthly = a.baselineOvertimeMonthly * reduction
  const savedOvertime = savedMonthly * a.months
  const savedTurnover = a.exitsPrevented * a.costPerExit
  const total = savedOvertime + savedTurnover
  const subscription = a.subscriptionMonthly * a.months
  return {
    assumptions: a,
    basis: 'assumption',
    disclaimer:
      'Estimates built on the assumptions shown, using sample data. Shown as proof of value only; the subscription is never tied to savings.',
    overtime: {
      baselineHours: baseline.totalOvertimeHours,
      newHours: next.totalOvertimeHours,
      rosterReductionPct: Math.round(rosterReduction * 1000) / 10,
      reductionPct: Math.round(reduction * 1000) / 10,
      baselineMonthly: a.baselineOvertimeMonthly,
      newMonthly: a.baselineOvertimeMonthly - savedMonthly,
      savedMonthly,
      savedAnnual: savedOvertime,
    },
    turnover: {
      exitsBaseline: a.exitsPerYear,
      exitsPrevented: a.exitsPrevented,
      exitsRemaining: a.exitsPerYear - a.exitsPrevented,
      savedAnnual: savedTurnover,
    },
    totalAnnual: total,
    subscriptionAnnual: subscription,
    netGain: total - subscription,
    ratio: subscription > 0 ? total / subscription : 0,
  }
}
