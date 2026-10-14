import { motion, useReducedMotion } from 'framer-motion'
import { useId, useMemo, useState } from 'react'
import { occupancyForecast } from '../data'
import type { Roster } from '../engine'
import { fmtDate, headcountFor } from '../engine'
import { Topo } from './Marks'

const W = 700
const H = 250
const COL = W / 14
const BASE = 214
const TOP = 56

const xOf = (i: number) => COL * i + COL / 2
const yOf = (pct: number) => BASE - ((pct - 20) / 80) * (BASE - TOP)

/** Smooth monotone-ish curve through points (Catmull-Rom to Bézier, tension lowered so it never overshoots much). */
function smooth(pts: [number, number][]): string {
  let d = `M${pts[0][0]} ${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const t = 0.16
    const c1 = [p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t]
    const c2 = [p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t]
    d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0]} ${p2[1].toFixed(1)}`
  }
  return d
}

const TREE = 'M16 2 9.5 12.5c1.6-.3 3-.1 4.2.4L6 24c2-.5 3.9-.3 5.5.3L3.5 34.5c3.6-1.2 7.6-1.4 12.5-1.4s8.9.2 12.5 1.4L20.5 24.3c1.6-.6 3.5-.8 5.5-.3l-7.7-11.1c1.2-.5 2.6-.7 4.2-.4z'

interface Props {
  roster: Roster
}

/** The 14-day forecast as a mountain ridge. Weekend peaks rise; short-staffed days carry saffron flags. */
export default function SeasonRibbon({ roster }: Props) {
  const reduce = useReducedMotion()
  const uid = useId().replace(/:/g, '')
  const days = roster.demand
  const short = useMemo(() => {
    const m = new Map<string, number>()
    for (const u of roster.unmet.filter((x) => x.kind === 'headcount')) m.set(u.date, (m.get(u.date) ?? 0) + u.missing)
    return m
  }, [roster])
  const stretched = useMemo(() => new Set(roster.decisions.filter((d) => d.kind === 'overtime' && d.date).map((d) => d.date!)), [roster])

  const peakIdx = days.reduce((b, d, i) => (d.occupancyPct > days[b].occupancyPct ? i : b), 0)
  const [active, setActive] = useState(peakIdx)

  const pts = days.map((d, i) => [xOf(i), yOf(d.occupancyPct)] as [number, number])
  const ridge = smooth([[0, pts[0][1] + 6], ...pts, [W, pts[pts.length - 1][1] + 6]])
  const area = `${ridge}L${W} ${BASE + 10}L0 ${BASE + 10}Z`
  // two far ridges, drawn from the same data but softened and shifted, for depth
  const far1 = smooth(
    [[0, 150], ...days.map((d, i) => [xOf(i), yOf(d.occupancyPct * 0.62 + 24) - 4 + Math.sin(i * 1.7) * 7] as [number, number]), [W, 130]],
  )
  const far2 = smooth([[0, 118], ...days.map((_, i) => [xOf(i), 96 + Math.sin(i * 0.9 + 1) * 16 + Math.cos(i * 2.3) * 7] as [number, number]), [W, 104]])

  const a = days[active]
  const note = occupancyForecast.find((f) => f.date === a.date)?.note
  const needed = headcountFor(a)
  const flagState = short.has(a.date) ? 'short' : stretched.has(a.date) ? 'stretched' : null

  return (
    <div className="relative overflow-hidden bg-pine text-paper shadow-lift" style={{ borderRadius: '30px 12px 34px 14px' }}>
      <Topo stroke="var(--teal)" opacity={0.45} />
      <div className="relative px-4 pb-5 pt-5 sm:px-7 sm:pt-7">
        <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-saffron">Season ribbon · sample forecast</p>
            <h2 className="mt-1 text-2xl font-semibold text-paper sm:text-3xl">The next two weeks, as a ridge line</h2>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-mist/75">
            <span className="inline-flex items-center gap-1.5">
              <svg width="14" height="16" viewBox="0 0 14 16" aria-hidden="true"><path d="M2 1v14" stroke="var(--paper)" strokeWidth="1.5" strokeLinecap="round" /><path d="M2 2h10l-3 3 3 3H2z" fill="var(--saffron)" /></svg>
              Short-staffed
            </span>
            <span className="inline-flex items-center gap-1.5">
              <svg width="14" height="16" viewBox="0 0 14 16" aria-hidden="true"><path d="M2 1v14" stroke="var(--paper)" strokeWidth="1.5" strokeLinecap="round" /><path d="M2 2h10l-3 3 3 3H2z" fill="none" stroke="var(--saffron)" strokeWidth="1.4" strokeLinejoin="round" /></svg>
              Leaning on overtime
            </span>
          </div>
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Occupancy forecast for the next 14 days drawn as a mountain ridge">
          <defs>
            <linearGradient id={`${uid}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--teal)" stopOpacity="0.95" />
              <stop offset="1" stopColor="var(--forest)" stopOpacity="0.9" />
            </linearGradient>
            <clipPath id={`${uid}-clip`}>
              <motion.rect x="0" y="0" height={H} initial={{ width: reduce ? W : 0 }} animate={{ width: W }} transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }} />
            </clipPath>
          </defs>

          {/* weekend bands */}
          {days.map((d, i) =>
            d.weekday === 'Sat' || d.weekday === 'Sun' ? <rect key={d.date} x={COL * i} y="10" width={COL} height={BASE} fill="var(--saffron)" opacity="0.07" /> : null,
          )}
          <path d={far2} fill="none" stroke="var(--teal)" strokeOpacity="0.35" strokeWidth="1.3" />
          <path d={`${far2}L${W} ${H}L0 ${H}Z`} fill="var(--forest)" opacity="0.22" />
          <path d={far1} fill="none" stroke="var(--teal)" strokeOpacity="0.5" strokeWidth="1.3" />
          <path d={`${far1}L${W} ${H}L0 ${H}Z`} fill="var(--forest)" opacity="0.3" />

          <g clipPath={`url(#${uid}-clip)`}>
            <path d={area} fill={`url(#${uid}-fill)`} />
            {/* contour hatching on the ridge */}
            {[18, 36, 54].map((o) => (
              <path key={o} d={ridge} transform={`translate(0 ${o})`} fill="none" stroke="var(--mist)" strokeOpacity={0.16 - o / 500} strokeWidth="1.1" />
            ))}
            <path d={ridge} fill="none" stroke="var(--paper)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </g>

          {/* deodars on the high ground */}
          {days.map((d, i) =>
            d.occupancyPct >= 85 ? (
              <motion.g
                key={`t${d.date}`}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0 + i * 0.04, type: 'spring', stiffness: 160, damping: 16 }}
              >
                <path d={TREE} transform={`translate(${xOf(i) - 8 + (i % 2 ? 11 : -11)} ${yOf(d.occupancyPct) - 17}) scale(0.5)`} fill="var(--pine)" stroke="var(--paper)" strokeOpacity="0.35" strokeWidth="1" />
                <path d={TREE} transform={`translate(${xOf(i) - 8 + (i % 2 ? -9 : 9)} ${yOf(d.occupancyPct) - 12}) scale(0.38)`} fill="var(--pine)" stroke="var(--paper)" strokeOpacity="0.3" strokeWidth="1" />
              </motion.g>
            ) : null,
          )}

          {/* flags */}
          {days.map((d, i) => {
            const kind = short.has(d.date) ? 'short' : stretched.has(d.date) ? 'stretched' : null
            if (!kind) return null
            const x = xOf(i)
            const y = yOf(d.occupancyPct)
            const dir = x > W - 40 ? -1 : 1 // flags on the far edge point inward
            return (
              <motion.g
                key={`f${d.date}`}
                initial={reduce ? false : { opacity: 0, y: -16, rotate: -8 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                style={{ originX: `${x}px`, originY: `${y}px` }}
                transition={{ delay: 1.5 + i * 0.05, type: 'spring', stiffness: 200, damping: 12 }}
              >
                <path d={`M${x} ${y} V${y - 36}`} stroke="var(--paper)" strokeWidth="2" strokeLinecap="round" />
                <path
                  d={`M${x} ${y - 36} h${22 * dir} l${-6.5 * dir} 7 ${6.5 * dir} 7 h${-22 * dir}z`}
                  fill={kind === 'short' ? 'var(--saffron)' : 'var(--pine)'}
                  stroke="var(--saffron)"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </motion.g>
            )
          })}

          {/* active day marker */}
          <line x1={xOf(active)} x2={xOf(active)} y1={yOf(a.occupancyPct)} y2={BASE + 10} stroke="var(--paper)" strokeOpacity="0.5" strokeDasharray="3 4" />
          <circle cx={xOf(active)} cy={yOf(a.occupancyPct)} r="6" fill="var(--saffron)" stroke="var(--paper)" strokeWidth="2.5" />
        </svg>

        {/* day buttons: real HTML so they stay readable on a phone */}
        <div className="-mt-1 grid gap-0" style={{ gridTemplateColumns: 'repeat(14, minmax(0, 1fr))' }} role="group" aria-label="Pick a day">
          {days.map((d, i) => {
            const weekend = d.weekday === 'Sat' || d.weekday === 'Sun'
            return (
              <button
                key={d.date}
                onClick={() => setActive(i)}
                onPointerEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                aria-label={`${fmtDate(d.date)}, ${d.occupancyPct}% occupancy`}
                aria-pressed={i === active}
                className={`flex flex-col items-center rounded-[8px_4px_8px_5px] py-1.5 text-[10px] leading-tight transition-colors sm:text-[11px] ${
                  i === active ? 'bg-paper/15 text-paper' : weekend ? 'text-saffron' : 'text-mist/60 hover:text-paper'
                }`}
              >
                <span className="font-semibold">{d.weekday.slice(0, 1)}</span>
                <span className="font-num text-[12px] sm:text-[13px]">{d.date.slice(8)}</span>
              </button>
            )
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-1 border-t border-paper/10 pt-3" aria-live="polite">
          <p className="font-display text-xl font-semibold text-paper">{fmtDate(a.date)}</p>
          <p className="text-sm text-mist/85">
            <span className="font-num text-lg font-semibold text-saffron">{a.occupancyPct}%</span> full · {a.occupiedRooms} of 25 rooms · about{' '}
            <span className="font-semibold text-paper">{needed}</span> people on shift
          </p>
          {note && <p className="text-sm italic text-mist/70">{note}</p>}
          {flagState === 'short' && <p className="text-sm font-medium text-saffron">Short by {short.get(a.date)}. See the roster.</p>}
          {flagState === 'stretched' && <p className="text-sm font-medium text-saffron">Covered, but someone is stretching with overtime.</p>}
        </div>
      </div>
    </div>
  )
}
