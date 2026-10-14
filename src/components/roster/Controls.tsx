import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'
import type { OccupancyDay } from '../../data/types'
import { fmtDate } from '../../engine'
import { formatINR } from '../../lib/format'
import type { RosterMode, WeekStats } from '../../lib/rosterView'
import { Topo } from '../Marks'
import { Card, CountUp, Highlight, Tag, spring } from '../ui'

/* ---------------- Before / After ---------------- */

const OPTIONS: { id: RosterMode; word: string; sub: string; bg: string }[] = [
  { id: 'manual', word: 'Before', sub: 'Manager on paper', bg: 'var(--terracotta)' },
  { id: 'engine', word: 'After', sub: 'RosterIQ', bg: 'var(--forest)' },
]

export function BeforeAfterToggle({ mode, onChange }: { mode: RosterMode; onChange: (m: RosterMode) => void }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-teal">Compare the two rosters</p>
      <div
        role="radiogroup"
        aria-label="Which roster to show"
        className="relative inline-flex w-full max-w-[460px] gap-1 border-2 border-pine/15 bg-white/70 p-1.5 shadow-warm"
        style={{ borderRadius: '26px 10px 28px 12px' }}
      >
        {OPTIONS.map((o) => {
          const on = mode === o.id
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(o.id)}
              className="relative flex-1 px-4 py-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2"
              style={{ borderRadius: '20px 7px 22px 9px' }}
            >
              {on && <motion.span layoutId="mode-pill" transition={spring} className="absolute inset-0" style={{ background: o.bg, borderRadius: 'inherit' }} />}
              <span className={`relative block font-display text-[28px] font-black leading-none tracking-[-0.03em] sm:text-[34px] ${on ? 'text-paper' : 'text-pine'}`}>{o.word}</span>
              <span className={`relative mt-1 block text-xs font-semibold ${on ? 'text-paper/85' : 'text-stone'}`}>{o.sub}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ---------------- Overtime meter ---------------- */

function MeterRow({ label, hours, cost, max, colour, active, ready, hatch }: { label: string; hours: number; cost: number; max: number; colour: string; active: boolean; ready: boolean; hatch?: boolean }) {
  const reduce = useReducedMotion()
  return (
    <div className={`transition-opacity ${active ? 'opacity-100' : 'opacity-70'}`}>
      <div className="flex items-baseline justify-between gap-3">
        <p className={`text-sm ${active ? 'font-bold' : 'font-medium'} text-pine`}>{label}</p>
        {ready ? (
          <p className="text-right leading-none">
            <span className="font-num text-[28px] font-black">
              <CountUp value={hours} /> <span className="text-sm font-semibold">h</span>
            </span>
            <span className="ml-2 text-sm font-semibold text-pine/75">{formatINR(cost)}</span>
          </p>
        ) : (
          <p className="text-xs font-medium text-stone">Not generated yet</p>
        )}
      </div>
      <div className="hatch mt-1.5 h-3.5 overflow-hidden bg-forest/[0.07]" style={{ borderRadius: '9px 3px 8px 4px' }} role="img" aria-label={ready ? `${hours} overtime hours, ${formatINR(cost)}` : 'Not generated yet'}>
        <motion.div
          className="h-full"
          style={{ background: colour, borderRadius: '9px 5px 8px 4px', boxShadow: hatch ? 'none' : 'inset 0 -3px 0 rgba(18,48,43,.16)' }}
          initial={false}
          animate={{ width: ready ? `${Math.max(2, (hours / Math.max(1, max)) * 100)}%` : '0%' }}
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 22 }}
        />
      </div>
    </div>
  )
}

export function OvertimeMeter({ mode, manual, engine, engineReady, label }: { mode: RosterMode; manual: WeekStats; engine: WeekStats; engineReady: boolean; label: string }) {
  const max = Math.max(manual.totalOvertimeHours, engineReady ? engine.totalOvertimeHours : 0, 1)
  const savedH = manual.totalOvertimeHours - engine.totalOvertimeHours
  const savedCost = manual.totalOvertimeCost - engine.totalOvertimeCost
  return (
    <Card tilt={0.7} className="relative overflow-hidden !p-5">
      <Topo opacity={0.12} />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-teal">Overtime meter</p>
            <p className="text-xs text-stone">{label}</p>
          </div>
          <Tag tone="saffron" tilt={2}>Sample figures</Tag>
        </div>
        <div className="mt-3 space-y-3.5">
          <MeterRow label="On paper" hours={manual.totalOvertimeHours} cost={manual.totalOvertimeCost} max={max} colour="var(--terracotta)" active={mode === 'manual'} ready />
          <MeterRow label="RosterIQ" hours={engine.totalOvertimeHours} cost={engine.totalOvertimeCost} max={max} colour="var(--teal)" active={mode === 'engine'} ready={engineReady} />
        </div>
        <div className="mt-4 border-t-2 border-dotted border-pine/20 pt-3">
          {engineReady && savedH > 0 ? (
            <p className="text-[15px] leading-snug">
              <span className="font-display text-2xl font-black tracking-[-0.02em]">
                <Highlight>{formatINR(savedCost)} saved</Highlight>
              </span>{' '}
              <span className="font-semibold">and {savedH} fewer overtime hours</span> this week.
            </p>
          ) : (
            <p className="text-sm text-stone">{engineReady ? 'No overtime saved this week.' : 'Generate this week to see the saving.'}</p>
          )}
          <p className="mt-1.5 text-[11px] leading-snug text-stone">Assumption: overtime is paid at 2× the hourly rate, counted past each person's contracted weekly hours.</p>
        </div>
      </div>
    </Card>
  )
}

/* ---------------- Date selector ---------------- */

export function DaySelector({ forecast, selected, onSelect, generatedThrough }: { forecast: OccupancyDay[]; selected: string | null; onSelect: (iso: string) => void; generatedThrough: number }) {
  const groups = [forecast.slice(0, 7), forecast.slice(7)]
  return (
    <div className="flex gap-5 overflow-x-auto pb-2 pt-3 [scrollbar-width:thin]" role="group" aria-label="Pick a day from the 14-day forecast">
      {groups.map((g, gi) => (
        <div key={gi} className="shrink-0">
          <p className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-[0.18em] text-stone">
            {gi === 0 ? 'This week' : 'Next week'}
            {gi === 1 && generatedThrough < 14 && <span className="ml-1.5 font-semibold normal-case tracking-normal text-pine/70">· not generated</span>}
          </p>
          <div className="flex gap-1.5">
            {g.map((f, i) => {
              const on = selected === f.date
              const peak = f.occupancyPct >= 85
              return (
                <button
                  key={f.date}
                  type="button"
                  aria-pressed={on}
                  aria-label={`${fmtDate(f.date)}, ${f.occupancyPct}% occupancy${peak ? ', peak' : ''}${f.note ? `, ${f.note}` : ''}`}
                  title={f.note}
                  onClick={() => onSelect(f.date)}
                  className={`relative w-[58px] px-1 pb-2 pt-1.5 text-center outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 ${
                    on ? 'bg-pine text-paper shadow-warm' : 'border border-pine/10 bg-white/60 text-pine'
                  }`}
                  style={{ borderRadius: i % 2 ? '12px 6px 12px 7px' : '7px 12px 7px 12px', rotate: on ? '-1.5deg' : undefined }}
                >
                  <span className={`block text-[10px] font-bold uppercase tracking-wider ${on ? 'text-paper/75' : 'text-stone'}`}>{fmtDate(f.date).slice(0, 3)}</span>
                  <span className="font-num block text-[22px] font-black leading-tight">{Number(f.date.slice(8))}</span>
                  <span className={`mx-0.5 mt-0.5 block h-1 overflow-hidden rounded-full ${on ? 'bg-paper/25' : 'bg-pine/10'}`}>
                    <span className={`block h-full rounded-full ${peak ? 'bg-saffron' : on ? 'bg-paper/80' : 'bg-teal'}`} style={{ width: `${f.occupancyPct}%` }} />
                  </span>
                  <span className={`mt-1 block text-[10px] font-semibold ${on ? 'text-paper/85' : 'text-pine/70'}`}>{f.occupancyPct}%</span>
                  {peak && (
                    <svg className="absolute -right-1 -top-1.5" width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
                      <circle cx="8" cy="8" r="4" fill="var(--saffron)" stroke="var(--paper)" strokeWidth="1.5" />
                      <path d="M8 .8v2M8 13.2v2M.8 8h2M13.2 8h2" stroke="var(--saffron)" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ---------------- Generate summary ---------------- */

export interface GenSummary {
  weekLabel: string
  unmet: number
  violations: number
  paperViolations: number
  paperOtHours: number
  otHours: number
  paperOtCost: number
  otCost: number
}

function Tile({ label, children, note, tilt }: { label: string; children: ReactNode; note: string; tilt: number }) {
  return (
    <div className="bg-white/70 p-4 shadow-warm" style={{ transform: `rotate(${tilt}deg)`, borderRadius: '16px 7px 18px 9px' }}>
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-teal">{label}</p>
      <p className="font-num mt-1 text-[44px] font-black leading-none">{children}</p>
      <p className="mt-1.5 text-xs leading-snug text-stone">{note}</p>
    </div>
  )
}

export function GenerateSummary({ s }: { s: GenSummary }) {
  const dh = s.paperOtHours - s.otHours
  return (
    <section aria-label="Summary of the generated week" aria-live="polite" className="relative overflow-hidden border-2 border-teal/30 bg-mist p-5 sm:p-6" style={{ borderRadius: '30px 12px 34px 14px' }}>
      <Topo opacity={0.14} />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-display text-2xl font-black tracking-[-0.02em]">{s.weekLabel} is on the board.</p>
          <Tag tone="teal" tilt={-2}>Sample figures</Tag>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Tile label="Unmet demand" tilt={-0.8} note={s.unmet === 0 ? 'Every shift this week has its people.' : 'Shifts still short; see the demand strip.'}>
            <CountUp value={s.unmet} />
          </Tile>
          <Tile label="Hard-rule breaks" tilt={0.6} note={`Rest, days in a row, weekly off, leave. The paper version has ${s.paperViolations} this week.`}>
            <CountUp value={s.violations} />
          </Tile>
          <Tile
            label="Overtime change"
            tilt={-0.5}
            note={`${s.paperOtHours} h (${formatINR(s.paperOtCost)}) on paper down to ${s.otHours} h (${formatINR(s.otCost)}). Assumption: 2× hourly rate.`}
          >
            <Highlight>−{dh} h</Highlight>
          </Tile>
        </div>
      </div>
    </section>
  )
}
