import { motion, useReducedMotion } from 'framer-motion'
import { memo, useCallback, useRef, useState, type KeyboardEvent } from 'react'
import type { Department, OccupancyDay, Staff } from '../../data/types'
import { fmtDate, type Roster } from '../../engine'
import { cellKey, cellKind, neededOn, type CellKind, type RosterIndex, type RosterMode, type WeekStats } from '../../lib/rosterView'
import { DeodarIcon, StatusDot } from '../Marks'
import { CHIP, CHIP_RADII, ChipFace } from './ShiftChip'

export type PeekHow = 'hover' | 'focus' | 'pin'
export type AnimKind = 'swap' | 'settle'

export interface GridProps {
  groups: { dept: Department; people: Staff[] }[]
  mode: RosterMode
  roster: Roster
  index: RosterIndex
  stats: WeekStats
  weekDates: string[]
  /** index of weekDates[0] inside the full 14 days */
  weekOffset: number
  forecast: OccupancyDay[]
  /** engine view of a week that has not been generated yet */
  pending: boolean
  working: boolean
  /** bumps on every toggle/generate so chips replay their entrance */
  play: number
  anim: AnimKind
  focusDate: string | null
  /** cells (`staffId|date`) moved by a manager fix or a swap */
  changed: Set<string>
  openCell: string | null
  onPeek: (staffId: string, date: string, el: HTMLElement, how: PeekHow) => void
  onLeave: () => void
}

const dayShort = (iso: string) => fmtDate(iso).slice(0, 3)
const dayNum = (iso: string) => Number(iso.slice(8, 10))

function cellLabel(p: Staff, date: string, kind: CellKind | 'ghost', warn: string | undefined, changed: boolean): string {
  const what =
    kind === 'ghost' ? 'not generated yet' : kind === 'X' ? 'day off' : kind === 'L' ? 'approved leave' : `${CHIP[kind].label} shift`
  return `${p.name}, ${fmtDate(date)}: ${what}.${changed ? ' Updated by a manager change.' : ''}${warn ? ` Warning: ${warn}` : ''} Press Enter for the reason.`
}

/* ---------------- Cell ---------------- */

interface CellProps {
  r: number
  c: number
  person: Staff
  date: string
  kind: CellKind | 'ghost'
  warn: string | undefined
  tab: boolean
  open: boolean
  focusCol: boolean
  changed: boolean
  anim: AnimKind
  delay: number
  play: number
  pulse: boolean
  describedBy: string | undefined
  register: (r: number, c: number, el: HTMLButtonElement | null) => void
  onFocusCell: (r: number, c: number) => void
  onPeek: GridProps['onPeek']
  onLeave: () => void
  compact?: boolean
}

const Cell = memo(function Cell(p: CellProps) {
  const reduce = useReducedMotion()
  const radius = CHIP_RADII[(p.r + p.c * 2) % 4]
  const settle = p.anim === 'settle'
  const tilt = ((p.r * 7 + p.c * 3) % 5) - 2
  const initial = reduce
    ? false
    : settle
      ? { opacity: 0, y: -22, rotate: tilt * 3, scale: 0.9 }
      : { opacity: 0, scale: 0.78, y: 5 }
  return (
    <div role="gridcell" className={`relative ${p.focusCol ? 'rounded-xl bg-saffron/[0.13]' : ''} ${p.compact ? 'h-11' : 'h-[46px]'} p-[2px]`}>
      <button
        type="button"
        ref={(el) => p.register(p.r, p.c, el)}
        tabIndex={p.tab ? 0 : -1}
        aria-label={cellLabel(p.person, p.date, p.kind, p.warn, p.changed)}
        aria-haspopup="dialog"
        aria-expanded={p.open}
        aria-describedby={p.describedBy}
        onMouseEnter={(e) => p.onPeek(p.person.id, p.date, e.currentTarget, 'hover')}
        onMouseLeave={p.onLeave}
        onFocus={(e) => {
          p.onFocusCell(p.r, p.c)
          if (e.currentTarget.matches(':focus-visible')) p.onPeek(p.person.id, p.date, e.currentTarget, 'focus')
        }}
        onBlur={p.onLeave}
        onClick={(e) => p.onPeek(p.person.id, p.date, e.currentTarget, 'pin')}
        className={`group relative block h-full w-full cursor-pointer outline-none transition-transform duration-150 hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 focus-visible:ring-offset-paper ${p.changed ? 'ring-[3px] ring-saffron ring-offset-2 ring-offset-paper' : ''}`}
        style={{ borderRadius: radius }}
      >
        <motion.span
          key={p.play}
          className={`block h-full w-full ${p.pulse ? 'animate-pulse' : ''}`}
          style={{ borderRadius: radius }}
          initial={initial}
          animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
          transition={
            settle
              ? { type: 'spring', stiffness: 300, damping: 15, mass: 0.7, delay: p.delay }
              : { type: 'spring', stiffness: 380, damping: 26, delay: p.delay }
          }
        >
          <ChipFace kind={p.kind} compact={p.compact} />
        </motion.span>
        {p.changed && <span className="pointer-events-none absolute -left-1.5 -top-1.5 z-10 h-3.5 w-3.5 rounded-full border-2 border-pine bg-saffron" aria-hidden="true" />}
        {p.warn && (
          <span className="pointer-events-none absolute -right-1 -top-1.5 z-10 drop-shadow-[0_1px_0_rgba(251,248,241,1)]" aria-hidden="true">
            <StatusDot tone="risk" size={15} />
          </span>
        )}
      </button>
    </div>
  )
})

/* ---------------- Demand strip ---------------- */

export function DemandStrip({
  roster,
  index,
  weekDates,
  pending,
  compact,
}: {
  roster: Roster
  index: RosterIndex
  weekDates: string[]
  pending: boolean
  compact?: boolean
}) {
  return (
    <div role="group" aria-label="Staff needed against staff scheduled, per day" className={compact ? 'grid grid-cols-7 gap-1' : 'grid grid-cols-[176px_repeat(7,minmax(78px,1fr))] gap-1.5'}>
      {!compact && (
        <div className="flex flex-col justify-center pr-2 leading-tight">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-teal">Demand strip</p>
          <p className="text-xs text-stone">needed · scheduled</p>
        </div>
      )}
      {weekDates.map((d) => {
        const need = neededOn(roster, d)
        const have = pending ? 0 : (index.perDay.get(d) ?? 0)
        const short = !pending && (have < need || index.unmetDates.has(d))
        const fill = pending ? 0 : Math.min(1, have / Math.max(1, need))
        return (
          <div
            key={d}
            className={`relative px-1.5 py-1.5 text-center ${short ? 'bg-saffron/25' : 'bg-forest/[0.06]'}`}
            style={{ borderRadius: '10px 5px 11px 6px' }}
          >
            <p className="flex items-center justify-center gap-1 leading-none">
              <span className="font-num text-lg font-bold">{pending ? '–' : have}</span>
              <span className="text-[11px] text-stone">/ {need}</span>
              {!pending && (
                <span title={short ? 'Short of the demand' : 'Covered'}>
                  <StatusDot tone={short ? 'watch' : 'ok'} size={13} label={short ? `${fmtDate(d)}: short of demand` : `${fmtDate(d)}: covered`} />
                </span>
              )}
            </p>
            <span className="mt-1.5 block h-[3px] overflow-hidden rounded-full bg-pine/10">
              <span className={`block h-full rounded-full ${short ? 'bg-saffron' : 'bg-teal'}`} style={{ width: `${fill * 100}%` }} />
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* ---------------- Day header ---------------- */

function DayHead({ date, forecast, focus }: { date: string; forecast: OccupancyDay[]; focus: boolean }) {
  const f = forecast.find((x) => x.date === date)
  const peak = (f?.occupancyPct ?? 0) >= 85
  return (
    <div role="columnheader" className={`relative px-1 pb-1 pt-2 text-center leading-none ${focus ? 'rounded-t-xl bg-saffron/[0.13]' : ''}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone">{dayShort(date)}</p>
      <p className="font-num mt-1 text-[26px] font-black leading-none">{dayNum(date)}</p>
      <p className="mt-1 text-[10.5px] font-medium text-pine/70">{f?.occupancyPct ?? 0}% full</p>
      {peak && (
        <span
          className="absolute -top-1.5 right-0.5 rotate-[5deg] bg-saffron px-1.5 py-[3px] text-[9px] font-black uppercase tracking-[0.1em] text-pine shadow-warm"
          style={{ borderRadius: '5px 2px 5px 3px' }}
        >
          Peak
        </span>
      )}
    </div>
  )
}

/* ---------------- Desktop grid ---------------- */

export function RosterGrid(props: GridProps) {
  const { groups, mode, index, weekDates, weekOffset, pending, working, play, anim, focusDate, stats } = props
  const refs = useRef(new Map<string, HTMLButtonElement>())
  const [pos, setPos] = useState({ r: 0, c: 0 })
  const total = groups.reduce((n, g) => n + g.people.length, 0)

  const register = useCallback((r: number, c: number, el: HTMLButtonElement | null) => {
    if (el) refs.current.set(`${r}:${c}`, el)
    else refs.current.delete(`${r}:${c}`)
  }, [])
  const onFocusCell = useCallback((r: number, c: number) => setPos((p) => (p.r === r && p.c === c ? p : { r, c })), [])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const t = e.target as HTMLElement
    if (t.dataset.nav === undefined && !t.closest('[data-nav]')) return
    let { r, c } = pos
    if (e.key === 'ArrowRight') c = Math.min(6, c + 1)
    else if (e.key === 'ArrowLeft') c = Math.max(0, c - 1)
    else if (e.key === 'ArrowDown') r = Math.min(total - 1, r + 1)
    else if (e.key === 'ArrowUp') r = Math.max(0, r - 1)
    else if (e.key === 'Home') c = 0
    else if (e.key === 'End') c = 6
    else return
    e.preventDefault()
    refs.current.get(`${r}:${c}`)?.focus()
  }

  let row = -1
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <div className="min-w-[740px]">
        <DemandStrip roster={props.roster} index={index} weekDates={weekDates} pending={pending && mode === 'engine'} />

        <div role="grid" aria-label={`${mode === 'engine' ? 'RosterIQ' : 'Manual'} roster, ${fmtDate(weekDates[0])} to ${fmtDate(weekDates[6])}`} aria-rowcount={total + 1} onKeyDown={onKeyDown} className="mt-3">
          <div role="row" className="grid grid-cols-[176px_repeat(7,minmax(78px,1fr))] gap-1.5">
            <div role="columnheader" className="self-end pb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-stone">
              Team
            </div>
            {weekDates.map((d) => (
              <DayHead key={d} date={d} forecast={props.forecast} focus={focusDate === d} />
            ))}
          </div>

          {groups.map((g) => (
            <div role="rowgroup" aria-label={g.dept} key={g.dept}>
              <div className="mb-1 mt-4 flex items-center gap-2 border-b-2 border-dotted border-pine/20 pb-1">
                <DeodarIcon size={15} className="text-forest" />
                <h3 className="font-display text-[17px] font-black tracking-[-0.01em]">{g.dept}</h3>
                <span className="text-xs text-stone">{g.people.length} people</span>
              </div>
              {g.people.map((p) => {
                row++
                const r = row
                const ot = stats.overtime.get(p.id) ?? 0
                return (
                  <div role="row" aria-rowindex={r + 2} key={p.id} className="grid grid-cols-[176px_repeat(7,minmax(78px,1fr))] items-center gap-1.5">
                    <div role="rowheader" className="flex min-w-0 items-center justify-between gap-1.5 pr-1 leading-tight">
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] font-bold text-pine">{p.name}</span>
                        <span className="block truncate text-[11.5px] text-stone">{p.role}</span>
                      </span>
                      {!(pending && mode === 'engine') && (
                        <span
                          className={`shrink-0 rotate-[-2deg] px-1.5 py-[3px] text-[10.5px] font-bold ${ot > 0 ? 'bg-saffron/35 text-pine' : 'bg-forest/[0.08] text-forest'}`}
                          style={{ borderRadius: '6px 3px 6px 4px' }}
                          title={`${stats.hours.get(p.id) ?? 0} hours this week of ${p.weeklyHours} contracted`}
                        >
                          {ot > 0 ? `+${ot}h OT` : `${stats.hours.get(p.id) ?? 0}h`}
                        </span>
                      )}
                    </div>
                    {weekDates.map((d, c) => {
                      const ghost = mode === 'engine' && pending
                      const kind = ghost ? 'ghost' : cellKind(p, d, index)
                      const w = index.violations.get(cellKey(p.id, d))?.[0]?.text
                      const key = cellKey(p.id, d)
                      const settle = anim === 'settle' && weekOffset + c >= 7
                      return (
                        <div role="presentation" key={d} data-nav className="contents">
                          <Cell
                            r={r}
                            c={c}
                            person={p}
                            date={d}
                            kind={kind}
                            warn={mode === 'manual' ? w : undefined}
                            tab={pos.r === r && pos.c === c}
                            open={props.openCell === key}
                            focusCol={focusDate === d}
                            changed={props.changed.has(key)}
                            anim={settle ? 'settle' : 'swap'}
                            delay={settle ? c * 0.07 + r * 0.022 : c * 0.018 + r * 0.008}
                            play={play}
                            pulse={ghost && working}
                            describedBy={props.openCell === key ? 'cell-popover' : undefined}
                            register={register}
                            onFocusCell={onFocusCell}
                            onPeek={props.onPeek}
                            onLeave={props.onLeave}
                          />
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ---------------- Phone: per-person list ---------------- */

export function PersonList(props: GridProps) {
  const { groups, mode, index, weekDates, weekOffset, pending, working, play, anim, focusDate, stats } = props
  const noop = useCallback(() => {}, [])
  const noReg = useCallback(() => {}, [])
  let row = -1
  return (
    <div>
      <DemandStrip roster={props.roster} index={index} weekDates={weekDates} pending={pending && mode === 'engine'} compact />
      <div className="mt-1 grid grid-cols-7 gap-1 text-center" aria-hidden="true">
        {weekDates.map((d) => (
          <div key={d} className="pt-1.5 leading-none">
            <p className="text-[10px] font-bold uppercase tracking-wide text-stone">{dayShort(d).slice(0, 2)}</p>
            <p className="font-num text-base font-black">{dayNum(d)}</p>
          </div>
        ))}
      </div>
      {groups.map((g) => (
        <section key={g.dept} aria-label={g.dept} className="mt-5">
          <div className="mb-2 flex items-center gap-2 border-b-2 border-dotted border-pine/20 pb-1">
            <DeodarIcon size={15} className="text-forest" />
            <h3 className="font-display text-lg font-black">{g.dept}</h3>
          </div>
          <ul className="space-y-3">
            {g.people.map((p) => {
              row++
              const r = row
              const ot = stats.overtime.get(p.id) ?? 0
              const ghost = mode === 'engine' && pending
              return (
                <li key={p.id} className="border border-pine/10 bg-white/60 p-2 shadow-warm" style={{ borderRadius: r % 2 ? '16px 7px 16px 9px' : '8px 16px 9px 16px' }}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-2 px-1">
                    <p className="min-w-0 truncate text-[15px] font-bold">
                      {p.name} <span className="text-xs font-normal text-stone">{p.role}</span>
                    </p>
                    {!ghost && <span className={`shrink-0 text-[11px] font-bold ${ot > 0 ? 'text-terracotta' : 'text-forest'}`}>{ot > 0 ? `+${ot}h overtime` : `${stats.hours.get(p.id) ?? 0}h`}</span>}
                  </div>
                  <div role="row" className="grid grid-cols-7 gap-1">
                    {weekDates.map((d, c) => {
                      const kind = ghost ? 'ghost' : cellKind(p, d, index)
                      const key = cellKey(p.id, d)
                      const settle = anim === 'settle' && weekOffset + c >= 7
                      return (
                        <Cell
                          key={d}
                          r={r}
                          c={c}
                          person={p}
                          date={d}
                          kind={kind}
                          warn={mode === 'manual' ? index.violations.get(key)?.[0]?.text : undefined}
                          tab
                          open={props.openCell === key}
                          focusCol={focusDate === d}
                            changed={props.changed.has(key)}
                          anim={settle ? 'settle' : 'swap'}
                          delay={settle ? c * 0.06 + r * 0.02 : c * 0.02}
                          play={play}
                          pulse={ghost && working}
                          describedBy={props.openCell === key ? 'cell-popover' : undefined}
                          register={noReg}
                          onFocusCell={noop}
                          onPeek={props.onPeek}
                          onLeave={props.onLeave}
                          compact
                        />
                      )
                    })}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
