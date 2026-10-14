import type { Department, OccupancyDay, Staff } from '../data/types'
import { personViolations, timelineFor } from './constraints'
import { finalizeRoster, reassignSlot } from './roster'
import { fmtDate, resolveOptions, weekdayOf, dayNumber } from './shifts'
import { scoreRisk, type RiskFactor, type RiskReason, type RiskResult } from './risk'
import type { Assignment, Decision, Roster, RosterOptions } from './types'

export type FixKind = 'weekly-off' | 'shift-pattern' | 'honour-leave' | 'skill-course' | 'recognition'

export interface Fix {
  kind: FixKind
  staffId: string
  title: string
  /** what the manager should do, in plain English */
  action: string
  addresses: RiskFactor[]
}

const COURSES: Record<Department, string> = {
  Kitchen: 'FSSAI level 2 food-safety course, then a new station (continental grill)',
  Housekeeping: 'Laundry-chemistry and floor-supervisor short course',
  'Front Desk': 'Channel-manager and revenue basics course',
  'F&B Service': 'Barista and mocktail-service course',
  Maintenance: 'Boiler and solar water-heater servicing course',
  Security: 'Fire-safety and CCTV analytics course',
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** The specific actions for the manager, most useful first. */
export function recommendFix(person: Staff, reasons: RiskReason[]): Fix[] {
  const has = (...f: RiskFactor[]) => reasons.filter((r) => f.includes(r.factor))
  const weight = (f: RiskFactor[]) => has(...f).reduce((s, r) => s + r.points, 0)
  const first = person.name.split(' ')[0]
  const fixes: (Fix & { w: number })[] = []

  if (has('no-weekly-off', 'overtime').length) {
    fixes.push({
      kind: 'weekly-off',
      staffId: person.id,
      title: `Give ${first} a fixed weekly off`,
      action: `Fix ${first}'s weekly off on the quietest weekday, start it now, and never roster more than 6 days in a row. Colleagues in ${person.department} cover the gaps.`,
      addresses: ['no-weekly-off', 'overtime'],
      w: weight(['no-weekly-off', 'overtime']),
    })
  }
  if (has('short-rest', 'late-nights').length) {
    fixes.push({
      kind: 'shift-pattern',
      staffId: person.id,
      title: `Change ${first}'s shift pattern`,
      action: `Stop closing then opening: allow at least 11 hours between shifts, and no more than 2 late nights in a row for ${first}. Rotate the extra closes to colleagues.`,
      addresses: ['short-rest', 'late-nights'],
      w: weight(['short-rest', 'late-nights']),
    })
  }
  if (has('leave-ignored').length) {
    fixes.push({
      kind: 'honour-leave',
      staffId: person.id,
      title: `Honour ${first}'s leave request`,
      action: `Take ${first} off the roster on the requested leave days and arrange cover.`,
      addresses: ['leave-ignored'],
      w: weight(['leave-ignored']),
    })
  }
  if (has('no-skill-growth').length) {
    fixes.push({
      kind: 'skill-course',
      staffId: person.id,
      title: `Book a skill course for ${first}`,
      action: `Enrol ${first} in: ${COURSES[person.department]}.`,
      addresses: ['no-skill-growth'],
      w: weight(['no-skill-growth']),
    })
  }
  if (has('feedback-falling').length) {
    fixes.push({
      kind: 'recognition',
      staffId: person.id,
      title: `Recognise ${first} and talk`,
      action: `Hold a 1:1 with ${first} this week, name something they do well in front of the team, and agree one growth goal for the season.`,
      addresses: ['feedback-falling'],
      w: weight(['feedback-falling']),
    })
  }
  return fixes.sort((a, b) => b.w - a.w).map(({ w: _w, ...f }) => f)
}

export interface ApplyContext {
  staff: Staff[]
  forecast?: OccupancyDay[]
  options?: RosterOptions
}

export interface ApplyResult {
  roster: Roster
  person: Staff
  /** score today, from shift history alone */
  before: RiskResult
  /** projected score once the fix is applied (history plus the fixed roster) */
  after: RiskResult
  /** shifts that could not be moved to a colleague */
  uncovered: number
  changes: string[]
}

function rebuild(roster: Roster, staff: Staff[], assignments: Assignment[], extra: Decision[], options?: RosterOptions): Roster {
  const o = resolveOptions(options)
  return finalizeRoster(roster.kind, staff, roster.demand, assignments, [...roster.decisions.filter((d) => d.kind === 'note' || d.kind === 'overtime'), ...extra], o)
}

/** Apply one fix. Roster fixes move shifts to colleagues; skill/recognition fixes update the person's plan. */
export function applyFix(fix: Fix, person: Staff, roster: Roster, ctx: ApplyContext): ApplyResult {
  const o = resolveOptions(ctx.options)
  const before = scoreRisk(person, null)
  const mine = roster.assignments.filter((a) => a.staffId === person.id)
  const changes: string[] = []
  let updated = person
  let nextRoster = roster

  const moveAway = (toRemove: Assignment[], why: string) => {
    changes.push(why)
    if (!toRemove.length) return
    const { assignments, notes } = reassignSlot(ctx.staff, roster, toRemove, o)
    nextRoster = rebuild(roster, ctx.staff, assignments, notes, ctx.options)
    changes.push(...notes.map((n) => n.text))
  }

  if (fix.kind === 'weekly-off') {
    // Quietest weekday across the roster for this department.
    const load = new Array(7).fill(0)
    for (const d of roster.demand) {
      load[weekdayOf(d.date)] += d.slots.filter((s) => s.department === person.department).reduce((n, s) => n + s.count, 0)
    }
    const wd = [1, 2, 3, 4, 5, 6, 0].reduce((best, w) => (load[w] < load[best] ? w : best), 1)
    const entries = timelineFor(person.history, [])
    const day0 = dayNumber(roster.dates[0])
    let streak = 0
    while (entries.some((e) => e.day === day0 - 1 - streak)) streak++
    const remove: Assignment[] = []
    const byDate = new Map(mine.map((m) => [m.date, m]))
    for (const date of roster.dates) {
      const a = byDate.get(date)
      if (!a) {
        streak = 0
        continue
      }
      if (streak >= o.maxConsecutiveDays || weekdayOf(date) === wd) {
        remove.push(a)
        streak = 0
      } else streak++
    }
    moveAway(remove, `${person.name} now has ${WEEKDAYS[wd]} as a fixed weekly off${remove[0] ? ` (first off ${fmtDate(remove[0].date)})` : ''}.`)
  } else if (fix.kind === 'shift-pattern') {
    const kept: Assignment[] = []
    const remove: Assignment[] = []
    const rule = { ...o, rules: { ...o.rules, [person.id]: { ...o.rules[person.id], maxConsecutiveNights: 2 } } }
    for (const a of mine) {
      const test = [...kept, a]
      if (personViolations(person, test, rule).length > 0) remove.push(a)
      else kept.push(a)
    }
    moveAway(remove, `${person.name} now has at least ${o.minRestHours} hours between shifts and at most 2 late nights in a row.`)
  } else if (fix.kind === 'honour-leave') {
    const remove = mine.filter((a) => person.leave.some((l) => a.date >= l.from && a.date <= l.to))
    moveAway(remove, `${person.name} is off on the requested leave days.`)
  } else if (fix.kind === 'skill-course') {
    const course = COURSES[person.department]
    updated = { ...person, plan: { ...person.plan, skillCourse: course } }
    changes.push(`${person.name} is booked on: ${course}.`)
  } else {
    updated = { ...person, plan: { ...person.plan, recognition: true } }
    changes.push(`A recognition conversation with ${person.name} is planned.`)
  }

  const rosterFix = fix.kind === 'weekly-off' || fix.kind === 'shift-pattern' || fix.kind === 'honour-leave'
  // Course / recognition do not change the plan, so they are judged on the same history-only basis as `before`.
  const after = scoreRisk(updated, rosterFix ? nextRoster : null)
  const uncovered = nextRoster.unmet.length - roster.unmet.length
  return { roster: nextRoster, person: updated, before, after, changes, uncovered: Math.max(0, uncovered) }
}
