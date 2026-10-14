import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { departments, occupancyForecast, staff } from '../data'
import { fmtDate, resolveOptions, validateRoster } from '../engine'
import { Topo } from '../components/Marks'
import CellPopover, { type PopoverAnchor } from '../components/roster/CellPopover'
import { BeforeAfterToggle, DaySelector, GenerateSummary, OvertimeMeter, type GenSummary } from '../components/roster/Controls'
import { PersonList, RosterGrid, type AnimKind, type GridProps, type PeekHow } from '../components/roster/RosterGrid'
import ChangesPanel from '../components/roster/ChangesPanel'
import { ChipLegend } from '../components/roster/ShiftChip'
import { Button, Card, SectionTitle, Tag } from '../components/ui'
import { getDemo, regenerateWithFixes } from '../lib/demo'
import { cellKey, explainCell, indexRoster, weekStats, type RosterMode } from '../lib/rosterView'
import { useApp } from '../store/useApp'

const GROUPS = departments.map((dept) => ({ dept, people: staff.filter((s) => s.department === dept) }))
const STEPS = ['Reading the forecast…', 'Placing certified people first…', 'Checking 11-hour rests and weekly offs…', 'Settling the last few shifts…']
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches)
  useEffect(() => {
    const q = window.matchMedia('(max-width: 767px)')
    const on = () => setM(q.matches)
    q.addEventListener('change', on)
    return () => q.removeEventListener('change', on)
  }, [])
  return m
}

export default function Roster() {
  const epoch = useApp((s) => s.epoch)
  return <RosterScreen key={epoch} />
}

function RosterScreen() {
  const fixVersion = useApp((s) => s.fixVersion)
  const demo = useMemo(() => getDemo(), [fixVersion])
  const reduce = useReducedMotion()
  const mobile = useIsMobile()
  const dates = demo.manual.dates

  const [mode, setMode] = useState<RosterMode>('engine')
  const [week, setWeek] = useState(0)
  const [focusDate, setFocusDate] = useState<string | null>(null)
  const [engineRoster, setEngineRoster] = useState(demo.roster)
  /** days of the 14 that the engine has laid out so far (the first week is already live) */
  const [genThrough, setGenThrough] = useState(7)
  const [phase, setPhase] = useState<'idle' | 'working' | 'done'>('idle')
  const [step, setStep] = useState(0)
  const [summary, setSummary] = useState<GenSummary | null>(null)
  const [play, setPlay] = useState(0)
  const [anim, setAnim] = useState<AnimKind>('swap')

  // A fix applied on the At-risk screen swaps the roster underneath; pick it up and let the chips resettle.
  const seenRoster = useRef(demo.roster)
  useEffect(() => {
    if (seenRoster.current === demo.roster) return
    seenRoster.current = demo.roster
    setEngineRoster(demo.roster)
    setSummary(null)
    setPop(null)
    setAnim('swap')
    setPlay((p) => p + 1)
  }, [demo.roster])

  const manualIdx = useMemo(() => indexRoster(staff, demo.manual), [demo.manual])
  const engineIdx = useMemo(() => indexRoster(staff, engineRoster), [engineRoster])
  const roster = mode === 'engine' ? engineRoster : demo.manual
  const index = mode === 'engine' ? engineIdx : manualIdx

  const weekDates = useMemo(() => dates.slice(week * 7, week * 7 + 7), [dates, week])
  // Changes a manager made to next week must be visible, so that week counts as laid out once a fix has touched it.
  const changes = demo.changes
  const changeKeys = useMemo(() => new Set(changes.map((c) => cellKey(c.staffId, c.date))), [changes])
  const noChanges = useMemo(() => new Set<string>(), [])
  const effGen = changes.some((c) => dates.indexOf(c.date) >= 7) ? 14 : genThrough
  const weekPending = week === 1 && effGen < 14
  const manualStats = useMemo(() => weekStats(staff, manualIdx, weekDates), [manualIdx, weekDates])
  const engineStats = useMemo(() => weekStats(staff, engineIdx, weekDates), [engineIdx, weekDates])
  const stats = mode === 'engine' ? engineStats : manualStats
  const weekLabel = `${fmtDate(weekDates[0])} to ${fmtDate(weekDates[6])}`

  /* ---------- popover ---------- */
  const [pop, setPop] = useState<{ staffId: string; date: string; anchor: PopoverAnchor } | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const peek = useCallback((staffId: string, date: string, el: HTMLElement, how: PeekHow) => {
    window.clearTimeout(timer.current)
    const rect = el.getBoundingClientRect()
    if (how === 'hover') {
      timer.current = window.setTimeout(() => setPop((prev) => (prev?.anchor.pinned ? prev : { staffId, date, anchor: { rect, pinned: false } })), 130)
    } else if (how === 'focus') {
      setPop((prev) => (prev?.anchor.pinned ? prev : { staffId, date, anchor: { rect, pinned: false } }))
    } else {
      setPop((prev) => (prev?.anchor.pinned && prev.staffId === staffId && prev.date === date ? null : { staffId, date, anchor: { rect, pinned: true } }))
    }
  }, [])
  const leave = useCallback(() => {
    window.clearTimeout(timer.current)
    setPop((prev) => (prev?.anchor.pinned ? prev : null))
  }, [])
  const closePop = useCallback(() => setPop(null), [])

  useEffect(() => {
    if (!pop) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPop(null)
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement
      if (!t.closest('#cell-popover') && !t.closest('[role="gridcell"]')) setPop(null)
    }
    const onMove = () => !mobile && setPop(null)
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('scroll', onMove, true)
    window.addEventListener('resize', onMove)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('scroll', onMove, true)
      window.removeEventListener('resize', onMove)
    }
  }, [pop, mobile])

  const explanation = useMemo(() => {
    if (!pop) return null
    const person = staff.find((s) => s.id === pop.staffId)
    if (!person) return null
    return explainCell({ mode, person, date: pop.date, roster, index, weekDates, staff, change: mode === 'engine' ? changes.find((c) => c.staffId === pop.staffId && c.date === pop.date) : undefined })
  }, [pop, mode, roster, index, weekDates, changes])

  /* ---------- actions ---------- */
  const replay = (a: AnimKind) => {
    setAnim(a)
    setPlay((p) => p + 1)
    setPop(null)
  }
  const changeMode = (m: RosterMode) => {
    if (m === mode) return
    setMode(m)
    replay('swap')
  }
  const goWeek = (w: number) => {
    if (w === week) return
    setWeek(w)
    replay('swap')
  }
  const pickDay = (iso: string) => {
    setFocusDate(iso)
    goWeek(dates.indexOf(iso) >= 7 ? 1 : 0)
  }
  const peaks = useMemo(
    () => [0, 7].map((o) => occupancyForecast.slice(o, o + 7).reduce((best, f) => (f.occupancyPct > best.occupancyPct ? f : best)).date),
    [],
  )
  const jumpPeak = () => pickDay(peaks.find((d) => d > (focusDate ?? '')) ?? peaks[0])

  // links from other screens ("see it on the roster") open this screen on the changed day
  const rosterFocus = useApp((s) => s.rosterFocus)
  useEffect(() => {
    if (!rosterFocus) return
    setMode('engine')
    pickDay(rosterFocus.date)
    useApp.getState().focusRoster(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rosterFocus])

  useEffect(() => {
    if (phase !== 'working') return
    const id = window.setInterval(() => setStep((s) => (s + 1) % STEPS.length), 380)
    return () => window.clearInterval(id)
  }, [phase])

  const generate = async () => {
    if (phase === 'working') return
    setPhase('working')
    setSummary(null)
    setStep(0)
    setMode('engine')
    setWeek(1)
    setGenThrough(7)
    replay('swap')
    const t0 = performance.now()
    await sleep(140) // let the empty week paint before the solver blocks the thread
    const r = regenerateWithFixes()
    await sleep(Math.max(0, (reduce ? 250 : 1500) - (performance.now() - t0)))

    const wk = new Set(r.dates.slice(7))
    const nextIdx = indexRoster(staff, r)
    const wkStats = weekStats(staff, nextIdx, r.dates.slice(7))
    const paperStats = weekStats(staff, manualIdx, r.dates.slice(7))
    let paperViolations = 0
    manualIdx.violations.forEach((v, k) => {
      if (wk.has(k.split('|')[1])) paperViolations += v.length
    })
    setSummary({
      weekLabel: `${fmtDate(r.dates[7])} to ${fmtDate(r.dates[13])}`,
      unmet: r.unmet.filter((u) => wk.has(u.date)).reduce((n, u) => n + u.missing, 0),
      violations: validateRoster(staff, r.assignments, r.demand, resolveOptions()).filter((v) => wk.has(v.date)).length,
      paperViolations,
      paperOtHours: paperStats.totalOvertimeHours,
      otHours: wkStats.totalOvertimeHours,
      paperOtCost: paperStats.totalOvertimeCost,
      otCost: wkStats.totalOvertimeCost,
    })
    setEngineRoster(r)
    setGenThrough(14)
    replay('settle')
    setPhase('done')
  }

  const gridProps: GridProps = {
    groups: GROUPS,
    mode,
    roster,
    index,
    stats,
    weekDates,
    weekOffset: week * 7,
    forecast: occupancyForecast,
    pending: weekPending,
    working: phase === 'working',
    play,
    anim,
    focusDate,
    changed: mode === 'engine' ? changeKeys : noChanges,
    openCell: pop ? cellKey(pop.staffId, pop.date) : null,
    onPeek: peek,
    onLeave: leave,
  }

  const weekUnmet = mode === 'engine' && !weekPending ? engineRoster.unmet.filter((u) => weekDates.includes(u.date)) : []

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* ---------- title + generate ---------- */}
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <SectionTitle eyebrow="Fourteen days, shift by shift">Roster</SectionTitle>
        </div>
        <div className="mb-6 flex flex-col items-start gap-2 sm:items-end">
          <Button variant="saffron" onClick={generate} disabled={phase === 'working'} aria-busy={phase === 'working'} className="!min-h-12 !px-6 text-base font-bold disabled:cursor-wait">
            {phase === 'working' ? (
              <>
                <motion.span aria-hidden="true" animate={reduce ? undefined : { rotate: [0, -8, 8, 0] }} transition={{ repeat: Infinity, duration: 0.9 }} className="inline-block">
                  <svg width="16" height="20" viewBox="0 0 32 40" fill="currentColor"><path d="M16 2 9.5 12.5c1.6-.3 3-.1 4.2.4L6 24c2-.5 3.9-.3 5.5.3L3.5 34.5c3.6-1.2 7.6-1.4 12.5-1.4s8.9.2 12.5 1.4L20.5 24.3c1.6-.6 3.5-.8 5.5-.3l-7.7-11.1c1.2-.5 2.6-.7 4.2-.4z" /></svg>
                </motion.span>
                Fitting shifts…
              </>
            ) : effGen < 14 ? (
              'Generate next week'
            ) : (
              'Generate again'
            )}
          </Button>
          <p className="min-h-4 text-xs text-stone" role="status">
            {phase === 'working' ? STEPS[step] : effGen < 14 ? `Week of ${fmtDate(dates[7])} is waiting for a roster.` : 'Both weeks are laid out.'}
          </p>
        </div>
      </div>

      {/* ---------- toggle + meter ---------- */}
      <div data-tour="compare" className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)] lg:gap-10">
        <div className="lg:pt-4">
          <BeforeAfterToggle mode={mode} onChange={changeMode} />
          <p className="mt-4 max-w-md border-l-[3px] border-saffron pl-3 text-sm leading-relaxed text-pine/80">
            {mode === 'engine'
              ? 'Every cell here keeps 11 hours of rest, a weekly off, approved leave and the right skills. Hover or tap a cell to see why.'
              : 'The paper roster repeats fixed offs and usual shifts. Terracotta marks show where it breaks a rule or is plainly unfair.'}
          </p>
        </div>
        <OvertimeMeter mode={mode} manual={manualStats} engine={engineStats} engineReady={!weekPending} label={`Week of ${fmtDate(weekDates[0])}`} />
      </div>

      {mode === 'engine' && changes.length > 0 && <ChangesPanel changes={changes} people={demo.people} onShow={pickDay} />}

      <AnimatePresence initial={false}>
        {summary && phase === 'done' && (
          <motion.div initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ type: 'spring', stiffness: 220, damping: 24 }}>
            <GenerateSummary s={summary} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- day selector ---------- */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="min-w-0 flex-1">
          <DaySelector forecast={occupancyForecast} selected={focusDate} onSelect={pickDay} generatedThrough={effGen} />
        </div>
        <Button variant="ghost" onClick={jumpPeak} className="mb-2 !min-h-10 !px-4 text-sm">
          <svg width="18" height="14" viewBox="0 0 24 18" fill="none" aria-hidden="true"><path d="M1.5 16.5 9 4l4.2 6.2L16 7l6.5 9.5z" fill="var(--teal)" /><circle cx="18.5" cy="3.6" r="2.4" fill="var(--saffron)" /></svg>
          Peak weekend
        </Button>
      </div>

      {/* ---------- grid ---------- */}
      <Card className="relative !p-3 sm:!p-5" style={{ borderRadius: '30px 12px 34px 14px' }}>
        <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ borderRadius: 'inherit' }}>
          <Topo opacity={0.1} />
        </div>
        <div className="relative">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => goWeek(0)} disabled={week === 0} aria-label="Previous week" className="grid h-8 w-8 place-items-center rounded-full ring-1 ring-pine/20 hover:bg-pine/5 disabled:opacity-30">
                <span aria-hidden="true">←</span>
              </button>
              <h2 className="font-display text-xl font-black tracking-[-0.02em] sm:text-2xl" aria-live="polite">
                {weekLabel}
              </h2>
              <button type="button" onClick={() => goWeek(1)} disabled={week === 1} aria-label="Next week" className="grid h-8 w-8 place-items-center rounded-full ring-1 ring-pine/20 hover:bg-pine/5 disabled:opacity-30">
                <span aria-hidden="true">→</span>
              </button>
            </div>
            <Tag tone={mode === 'engine' ? 'teal' : 'terracotta'} tilt={-1.5}>
              {mode === 'engine' ? 'RosterIQ roster · sample data' : 'On paper · sample data'}
            </Tag>
          </div>

          {mobile ? <PersonList {...gridProps} /> : <RosterGrid {...gridProps} />}

          {weekUnmet.length > 0 && (
            <ul className="mt-4 space-y-1 border-l-[3px] border-saffron bg-saffron/15 px-3 py-2 text-sm" style={{ borderRadius: '4px 12px 12px 4px' }}>
              {weekUnmet.map((u) => (
                <li key={u.text}>
                  <strong>Still open:</strong> {u.text} Nobody certified and rested is free, so the engine leaves it for you rather than break a rule.
                </li>
              ))}
            </ul>
          )}
          {weekPending && mode === 'engine' && (
            <p className="mt-4 text-sm text-stone">This week has no RosterIQ roster yet. Press “Generate next week” and the shifts will settle into place.</p>
          )}
        </div>
      </Card>

      <ChipLegend />

      {pop && explanation && <CellPopover id="cell-popover" anchor={pop.anchor} content={explanation} mobile={mobile} onClose={closePop} />}
    </div>
  )
}
