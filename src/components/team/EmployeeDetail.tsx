import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { COURSES, COURSE_BY_ID } from '../../lib/courses'
import { getOverlay, type Demo } from '../../lib/demo'
import { DEPT_COLOUR, orgStats, tenureLabel, type PersonStats } from '../../lib/employees'
import { formatINR } from '../../lib/format'
import { KIND_LABEL, buildTimeline, dominantKind, evidenceFor, headline, scoredRoster } from '../../lib/riskView'
import { managerUpdates } from '../../lib/staffApp'
import { useApp } from '../../store/useApp'
import { Donut, Lines, WeeklyBars } from '../charts/Charts'
import { DeodarIcon, Topo } from '../Marks'
import RiskRing, { BandChip } from '../risk/RiskRing'
import Timeline from '../risk/Timeline'
import { Tag } from '../ui'

const SHIFT_WORD = { O: 'early mornings', D: 'day shifts', E: 'evenings', C: 'late closes', X: 'days off', LV: 'leave' } as const
const dateShort = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const dateLong = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

function Block({ title, sub, children, className = '' }: { title: string; sub?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`border border-pine/10 bg-white/70 p-4 shadow-warm sm:p-5 ${className}`} style={{ borderRadius: '20px 8px 22px 10px' }}>
      <h3 className="font-display text-xl font-black leading-tight tracking-[-0.02em]">{title}</h3>
      {sub && <p className="mt-0.5 text-[12.5px] text-stone">{sub}</p>}
      <div className="mt-3">{children}</div>
    </section>
  )
}

function Fact({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
  return (
    <div className="border-b border-dotted border-pine/25 pb-2">
      <dt className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-stone">{label}</dt>
      <dd className="mt-0.5 text-[16px] font-bold leading-tight">{value}</dd>
      {note && <p className="text-[11.5px] text-stone">{note}</p>}
    </div>
  )
}

/**
 * Everything a manager wants to know about one person, in one panel.
 * It reads the same shared state as the roster, risk screen and phone, so a fix applied elsewhere shows here.
 */
export default function EmployeeDetail({ s, demo, onClose }: { s: PersonStats; demo: Demo; onClose: () => void }) {
  const reduce = useReducedMotion()
  const navigate = useNavigate()
  const closeRef = useRef<HTMLButtonElement>(null)
  const p = s.person
  const kind = dominantKind(s.risk.reasons)
  const org = useMemo(() => orgStats(demo), [demo])

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const weeks = useMemo(() => buildTimeline(p, demo.roster), [p, demo.roster])
  const changed = useMemo(() => new Set(demo.changes.filter((c) => c.staffId === p.id).map((c) => c.date)), [demo.changes, p.id])
  const updates = managerUpdates(demo, p.id)
  const basis = scoredRoster(demo, p.id)
  const overlay = getOverlay()
  const mood = overlay.moods[p.id]
  const progress = overlay.progress[p.id] ?? {}
  const learning = COURSES.filter((c) => (progress[c.id] ?? 0) > 0 && (progress[c.id] ?? 0) < c.lessons)
  const fixes = demo.applied.filter((a) => a.fix.staffId === p.id)
  const swaps = demo.swaps.filter((w) => w.aId === p.id || w.bId === p.id)
  const preferred = p.preferredShifts.map((c) => SHIFT_WORD[c]).join(', ')
  const nextLeave = p.leave.filter((l) => l.to >= demo.roster.dates[0])

  const go = (path: string, before?: () => void) => {
    before?.()
    navigate(path)
  }

  return (
    <>
      <motion.div className="fixed inset-0 z-[70] bg-pine/55 print:hidden" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} aria-hidden="true" />
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label={`${p.name}, employee profile`}
        className="fixed inset-y-0 right-0 z-[75] flex w-full max-w-[860px] flex-col overflow-hidden bg-paper shadow-lift print:hidden md:rounded-l-[34px]"
        initial={reduce ? false : { x: '100%' }}
        animate={{ x: 0 }}
        exit={reduce ? undefined : { x: '100%' }}
        transition={{ type: 'spring', stiffness: 230, damping: 30 }}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <Topo opacity={0.08} />
        </div>
        {/* header */}
        <header className="relative flex items-start gap-4 border-b-[3px] border-double border-pine/50 px-5 pb-4 pt-5 sm:px-7">
          <span className="grid h-16 w-16 shrink-0 place-items-center bg-pine font-display text-3xl font-black text-saffron" style={{ borderRadius: '20px 8px 22px 10px' }}>
            {p.name.charAt(0)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: DEPT_COLOUR[p.department] === 'var(--pine)' ? 'var(--forest)' : 'var(--stone)' }}>
                <DeodarIcon size={12} className="text-forest" /> {p.department}
              </span>
              <Tag tone="saffron" tilt={2}>Sample person</Tag>
              {s.onLeaveNow && <Tag tone="stone">On leave now</Tag>}
              {s.updated && <Tag tone="teal">Updated by a manager</Tag>}
            </div>
            <h2 className="mt-1 text-[clamp(1.9rem,4vw,2.8rem)] font-black leading-[0.98] tracking-[-0.03em]">{p.name}</h2>
            <p className="mt-0.5 text-[14px] text-pine/75">{p.role}</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-pine/70 outline-none hover:bg-pine/10 focus-visible:ring-2 focus-visible:ring-saffron" aria-label="Close profile (Esc)">
            <svg width="14" height="14" viewBox="0 0 12 12" aria-hidden="true" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M2 2l8 8M10 2l-8 8" />
            </svg>
          </button>
        </header>

        <div className="relative min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 pb-8 pt-5 sm:px-7">
          {/* risk summary */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <RiskRing score={s.risk.score} id={p.id} size={104} />
            <div className="min-w-0 flex-1 basis-64">
              <div className="flex flex-wrap items-center gap-2">
                <BandChip band={s.risk.band} big />
                {kind && <Tag tone="stone">{KIND_LABEL[kind]}</Tag>}
              </div>
              <p className="mt-2 font-display text-[18px] font-semibold leading-snug">{headline(p, s.risk, kind)}</p>
            </div>
          </div>

          {/* facts */}
          <Block title="The basics" sub="Contract, pay and the next two weeks. Rates are sample figures; pay lines are assumptions.">
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              <Fact label="Joined" value={dateLong(p.joinDate)} note={`${tenureLabel(s.tenure)} with us`} />
              <Fact label="Contract" value={`${p.weeklyHours} hours a week`} note="Overtime starts past this" />
              <Fact label="Hourly rate" value={formatINR(p.hourlyRate)} note="Sample figure" />
              <Fact label="Base pay, a month" value={formatINR(s.monthlyBase)} note="Assumption: hours × rate × 52 ÷ 12" />
              <Fact label="Overtime, last 6 weeks" value={`${s.ot6} h`} note={`${formatINR(s.otCost6)} at 2× the rate (assumption)`} />
              <Fact label="Overtime, next 2 weeks" value={`${s.otNext} h`} note="From the live roster" />
              <Fact label="Shifts, next 14 days" value={`${s.next14.shifts}`} note={`${s.next14.nights} nights · ${s.next14.weekendShifts} on weekends`} />
              <Fact label="Longest run without a day off" value={`${s.longestRun} days`} note="Across history and plan" />
              <Fact label="Likes" value={<span className="text-[14px]">{preferred || 'No preference'}</span>} />
            </dl>
          </Block>

          {/* charts */}
          <div className="grid gap-5 lg:grid-cols-2">
            <Block title="Hours each week" sub="Dashed line is the contract. Red is overtime. Hatched weeks are planned." className="lg:col-span-2">
              <WeeklyBars
                caption={`${p.name}, hours each week`}
                data={s.weeks.map((w) => ({ label: dateShort(w.start), value: w.hours, ref: w.contracted, planned: w.planned }))}
              />
            </Block>
            <Block title="How six weeks were spent" sub={`${s.daysWorked} days worked, ${s.daysOff} days off`}>
              <Donut
                caption={`${p.name}, last six weeks`}
                unit=" days"
                size={136}
                stack
                slices={s.mix.filter((m) => m.value > 0).map((m) => ({ label: m.label, value: m.value, colour: m.colour }))}
                centre={
                  <span>
                    <span className="font-num block text-[30px] font-black">42</span>
                    <span className="text-[11px] font-semibold text-stone">days</span>
                  </span>
                }
              />
            </Block>
            <Block title="Feedback" sub={`${s.feedback.first.toFixed(1)} to ${s.feedback.latest.toFixed(1)} (${s.feedback.delta >= 0 ? '+' : ''}${s.feedback.delta.toFixed(1)}), against the team average`}>
              <Lines
                caption={`${p.name}, feedback`}
                labels={p.feedback.map((f) => f.period.replace('Check-in ', 'Now'))}
                min={1}
                max={5}
                width={340}
                height={210}
                series={[
                  { name: 'Team average', colour: 'var(--stone)', dashed: true, values: org.feedback.map((f) => f.overall) },
                  { name: p.name, colour: s.feedback.delta < -0.2 ? 'var(--terracotta)' : 'var(--teal)', bold: true, values: p.feedback.map((f) => f.score) },
                ]}
              />
              {mood && <p className="mt-1 text-[12.5px] text-pine/75">Latest weekly check-in: {mood.score} of 5.</p>}
            </Block>
          </div>

          {/* pattern */}
          <Block title="The pattern" sub="Six weeks as worked, two weeks as planned.">
            <Timeline weeks={weeks} changed={changed} flow={0} working={false} />
          </Block>

          {/* reasons */}
          <Block title="Why the workload score is what it is" sub="Every point comes from a visible rule, with its dates.">
            {s.risk.reasons.length === 0 ? (
              <p className="text-[14.5px] text-pine/80">Nothing flagged. Regular offs, sensible hours, steady feedback.</p>
            ) : (
              <ol className="space-y-3">
                {s.risk.reasons.map((r, i) => (
                  <li key={r.factor} className="flex gap-3">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center bg-pine font-display text-[13px] font-black text-saffron" style={{ borderRadius: i % 2 ? '8px 3px 8px 4px' : '3px 8px 4px 8px' }}>
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-display text-[16px] font-bold leading-snug">
                        {r.text} <span className="text-xs font-bold text-stone">+{r.points}</span>
                      </p>
                      {evidenceFor(p, basis, r, s.risk.asOf).slice(0, 2).map((line, k) => (
                        <p key={k} className="text-[13px] leading-snug text-pine/75">
                          {line}
                        </p>
                      ))}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Block>

          <div className="grid gap-5 sm:grid-cols-2">
            <Block title="Skills" sub={`${p.skills.length} on the profile`}>
              <ul className="space-y-1.5">
                {[...p.skills]
                  .sort((a, b) => b.since.localeCompare(a.since))
                  .map((k) => (
                    <li key={k.label} className="flex items-baseline justify-between gap-2 text-[14px]">
                      <span className="font-semibold">{k.label}</span>
                      <span className="shrink-0 text-xs text-stone">{k.since}</span>
                    </li>
                  ))}
              </ul>
              {learning.length > 0 && (
                <p className="mt-3 border-t border-dotted border-pine/25 pt-2 text-[13px] text-pine/80">
                  Learning now: {learning.map((c) => `${c.title.en} (${progress[c.id]} of ${COURSE_BY_ID.get(c.id)!.lessons})`).join(', ')}
                </p>
              )}
            </Block>
            <Block title="Leave" sub={`${p.leave.length} on record`}>
              {nextLeave.length === 0 ? (
                <p className="text-[14px] text-pine/75">No leave coming up.</p>
              ) : (
                <ul className="space-y-2">
                  {nextLeave.map((l) => (
                    <li key={l.from + l.to} className="text-[14px] leading-snug">
                      <span className="font-semibold">{l.from === l.to ? dateShort(l.from) : `${dateShort(l.from)} to ${dateShort(l.to)}`}</span>{' '}
                      <span className={`ml-1 px-1.5 py-0.5 text-[11px] font-bold ${l.status === 'approved' ? 'bg-teal/15 text-forest' : 'bg-saffron/40 text-pine'}`} style={{ borderRadius: '5px 2px 5px 3px' }}>
                        {l.status}
                      </span>
                      <span className="block text-[12.5px] text-stone">{l.reason}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Block>
          </div>

          <Block title="What a manager has done" sub="Fixes and swaps recorded in this session.">
            {fixes.length === 0 && swaps.length === 0 && updates.length === 0 ? (
              <p className="text-[14px] text-pine/75">Nothing yet. Fixes are applied on the People at risk screen.</p>
            ) : (
              <ul className="space-y-1.5 text-[14px]">
                {fixes.map((f) => (
                  <li key={f.fix.kind}>
                    <strong>{f.fix.title}</strong>
                    <span className="text-pine/75">: risk {f.result.before.score} to {f.result.after.score}</span>
                  </li>
                ))}
                {swaps.map((w) => (
                  <li key={w.id}>
                    <strong>Shift swap</strong>
                    <span className="text-pine/75"> approved: {dateShort(w.aDate)} for {dateShort(w.bDate)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Block>

          {/* jumps */}
          <div className="flex flex-wrap gap-3 border-t-[3px] border-double border-pine/40 pt-4">
            <button type="button" onClick={() => go('/at-risk', () => useApp.getState().focusRisk(p.id))} className="min-h-11 bg-pine px-4 text-sm font-bold text-paper" style={{ borderRadius: '14px 6px 14px 8px' }}>
              Open in People at risk
            </button>
            <button type="button" onClick={() => go('/staff-app', () => useApp.getState().setStaffPerson(p.id))} className="min-h-11 px-4 text-sm font-bold ring-1 ring-inset ring-pine/25 hover:bg-pine/5" style={{ borderRadius: '14px 6px 14px 8px' }}>
              See their phone
            </button>
            <button type="button" onClick={() => go('/roster', () => useApp.getState().focusRoster(demo.roster.dates[0]))} className="min-h-11 px-4 text-sm font-bold ring-1 ring-inset ring-pine/25 hover:bg-pine/5" style={{ borderRadius: '14px 6px 14px 8px' }}>
              Find them on the roster
            </button>
          </div>
        </div>
      </motion.aside>
    </>
  )
}
