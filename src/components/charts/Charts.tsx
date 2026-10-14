import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useId, useState, type ReactNode } from 'react'

/* Hand-drawn style charts in plain SVG: uneven bar corners, hatched "planned" fills, dotted guides. */

const font = { fontFamily: 'Instrument Sans, system-ui, sans-serif' } as const
const display = { fontFamily: 'Fraunces, Georgia, serif', fontVariantNumeric: 'lining-nums' } as const

/* ---------------- Donut ---------------- */

export interface Slice {
  label: string
  value: number
  colour: string
  note?: string
}

/**
 * A donut with its own legend. Hover or focus a legend row to lift that slice.
 * The legend is real text, so the numbers never depend on seeing the chart.
 */
export function Donut({ slices, centre, caption, size = 176, unit = '', stack = false }: { slices: Slice[]; centre: ReactNode; caption: string; size?: number; unit?: string; stack?: boolean }) {
  const reduce = useReducedMotion()
  const [hot, setHot] = useState<number | null>(null)
  const total = slices.reduce((s, x) => s + x.value, 0) || 1
  let acc = 0
  const gap = 0.012
  return (
    <div className={`flex gap-x-5 gap-y-3 ${stack ? 'flex-col items-start' : 'flex-wrap items-center'}`}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={`${caption}: ${slices.map((s) => `${s.label} ${s.value}${unit}`).join(', ')}`}>
          <circle cx="50" cy="50" r="38" fill="none" stroke="var(--forest)" strokeOpacity=".08" strokeWidth="15" />
          {slices.map((s, i) => {
            const frac = s.value / total
            const start = acc
            acc += frac
            if (frac <= 0) return null
            return (
              <g key={s.label} transform={`rotate(${-90 + start * 360} 50 50)`}>
                <motion.circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke={s.colour}
                  strokeWidth={hot === i ? 18 : 15}
                  strokeLinecap="butt"
                  initial={reduce ? false : { pathLength: 0 }}
                  animate={{ pathLength: Math.max(0.001, frac - gap), opacity: hot === null || hot === i ? 1 : 0.35 }}
                  transition={reduce ? { duration: 0 } : { duration: 0.9, delay: 0.1 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                />
              </g>
            )
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center leading-none">{centre}</div>
      </div>
      <ul className={`space-y-1 ${stack ? 'w-full' : 'min-w-[150px] flex-1'}`} aria-label={`${caption}, legend`}>
        {slices.map((s, i) => (
          <li key={s.label}>
            <button
              type="button"
              onMouseEnter={() => setHot(i)}
              onMouseLeave={() => setHot(null)}
              onFocus={() => setHot(i)}
              onBlur={() => setHot(null)}
              className="flex min-h-8 w-full items-center gap-2 px-1 text-left text-[13.5px] outline-none focus-visible:ring-2 focus-visible:ring-saffron"
              style={{ borderRadius: '8px 3px 8px 4px' }}
            >
              <span className="h-3 w-3 shrink-0" style={{ background: s.colour, borderRadius: '4px 2px 4px 2px' }} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate font-medium">{s.label}</span>
              <span className="font-bold tabular-nums">{s.value}</span>
              <span className="w-9 text-right text-xs tabular-nums text-stone">{Math.round((s.value / total) * 100)}%</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ---------------- Weekly bars ---------------- */

/** True on phone-width screens, so charts can draw tighter with bigger type. */
function useNarrow(): boolean {
  const q = '(max-width: 639px)'
  const [n, setN] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const on = () => setN(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return n
}

export interface BarDatum {
  label: string
  value: number
  /** the contracted amount; anything above it is drawn in terracotta as overtime */
  ref: number
  planned?: boolean
}

function slab(x: number, y: number, w: number, h: number, i: number): string {
  const hh = Math.max(h, 0)
  const q = Math.min(7, hh / 2, w / 2)
  const [a, b] = i % 2 ? [q, q * 0.4] : [q * 0.4, q]
  return `M${x + a} ${y}H${x + w - b}Q${x + w} ${y} ${x + w} ${y + b}V${y + hh}H${x}V${y + a}Q${x} ${y} ${x + a} ${y}Z`
}

/** Hours worked per week against the contract. The part past the contract line is overtime. */
export function WeeklyBars({ data, unit = 'h', height = 230, caption }: { data: BarDatum[]; unit?: string; height?: number; caption: string }) {
  const reduce = useReducedMotion()
  const uid = useId().replace(/:/g, '')
  const narrow = useNarrow()
  const W = narrow ? 400 : 600
  const f = narrow ? 1.18 : 1
  const top = 28
  const base = height - 34
  const max = Math.max(...data.map((d) => Math.max(d.value, d.ref)), 1) * 1.1
  const k = (base - top) / max
  const step = (W - 40) / data.length
  const bw = Math.min(54, step * 0.62)
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" role="img" aria-label={`${caption}: ${data.map((d) => `${d.label} ${Math.round(d.value)}${unit}${d.value > d.ref ? `, ${Math.round(d.value - d.ref)} overtime` : ''}${d.planned ? ' planned' : ''}`).join('; ')}`}>
      <defs>
        <pattern id={`${uid}-h`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-52)">
          <path d="M0 0V8" stroke="var(--paper)" strokeOpacity=".5" strokeWidth="2" />
        </pattern>
      </defs>
      {[0.5, 1].map((f) => (
        <path key={f} d={`M24 ${base - max * f * k * 0.9}H${W - 8}`} stroke="var(--forest)" strokeOpacity=".1" strokeDasharray="2 6" />
      ))}
      {data.map((d, i) => {
        const x = 28 + i * step + (step - bw) / 2
        const normal = Math.min(d.value, d.ref)
        const over = Math.max(0, d.value - d.ref)
        const hN = normal * k
        const hO = over * k
        const t = reduce ? { duration: 0 } : { type: 'spring' as const, stiffness: 110, damping: 20, delay: i * 0.06 }
        return (
          <g key={d.label + i}>
            <motion.path d={slab(x, base - hN, bw, hN, i)} fill="var(--teal)" fillOpacity={d.planned ? 0.55 : 1} initial={reduce ? false : { d: slab(x, base, bw, 0, i) }} animate={{ d: slab(x, base - hN, bw, hN, i) }} transition={t} />
            {hO > 0 && <motion.path d={slab(x, base - hN - hO, bw, hO, i + 1)} fill="var(--terracotta)" fillOpacity={d.planned ? 0.7 : 1} initial={reduce ? false : { d: slab(x, base - hN, bw, 0, i + 1) }} animate={{ d: slab(x, base - hN - hO, bw, hO, i + 1) }} transition={t} />}
            {d.planned && <rect x={x} y={base - (hN + hO)} width={bw} height={hN + hO} fill={`url(#${uid}-h)`} rx="3" />}
            {/* the contract mark for this week */}
            <path d={`M${x - 5} ${base - d.ref * k}H${x + bw + 5}`} stroke="var(--pine)" strokeWidth="2" strokeDasharray="4 3" />
            <text x={x + bw / 2} y={base - (hN + hO) - 8} textAnchor="middle" fontSize={13.5 * f} fontWeight="800" fill="var(--pine)" style={display}>
              {Math.round(d.value)}
            </text>
            <text x={x + bw / 2} y={base + 18} textAnchor="middle" fontSize={11.5 * (narrow ? 1.05 : 1)} fill="var(--stone)" style={font}>
              {d.label}
            </text>
            {d.planned && (
              <text x={x + bw / 2} y={base + 30} textAnchor="middle" fontSize={narrow ? 8 : 9.5} fontWeight="700" fill="var(--teal)" style={font}>
                PLANNED
              </text>
            )}
          </g>
        )
      })}
      <path d={`M20 ${base + 1}C${W * 0.3} ${base - 1} ${W * 0.6} ${base + 2} ${W - 6} ${base}`} stroke="var(--pine)" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </svg>
  )
}

/* ---------------- Lines ---------------- */

export interface LineSeries {
  name: string
  colour: string
  values: number[]
  dashed?: boolean
  bold?: boolean
}

export function Lines({ series, labels, min, max, caption, height = 210, width = 560 }: { series: LineSeries[]; labels: string[]; min: number; max: number; caption: string; height?: number; width?: number }) {
  const reduce = useReducedMotion()
  const W = width
  const L = 34
  const R = 18
  const T = 16
  const B = height - 34
  const x = (i: number) => L + (i * (W - L - R)) / Math.max(1, labels.length - 1)
  const y = (v: number) => B - ((v - min) / (max - min)) * (B - T)
  const ticks = [min, (min + max) / 2, max]
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" role="img" aria-label={`${caption}: ${series.map((s) => `${s.name} ${s.values.map((v) => v.toFixed(1)).join(', ')}`).join('; ')}`}>
      {ticks.map((t) => (
        <g key={t}>
          <path d={`M${L} ${y(t)}H${W - R}`} stroke="var(--forest)" strokeOpacity=".12" strokeDasharray="2 6" />
          <text x={L - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--stone)" style={font}>
            {t.toFixed(1)}
          </text>
        </g>
      ))}
      {labels.map((l, i) => (
        <text key={l} x={x(i)} y={height - 12} textAnchor="middle" fontSize="11.5" fill="var(--stone)" style={font}>
          {l}
        </text>
      ))}
      {series.map((s, si) => {
        const d = s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i)} ${y(v)}`).join('')
        return (
          <g key={s.name}>
            <motion.path d={d} fill="none" stroke={s.colour} strokeWidth={s.bold ? 3.4 : 2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={s.dashed ? '5 5' : undefined} initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={reduce ? { duration: 0 } : { duration: 1, delay: si * 0.1 }} />
            {s.values.map((v, i) => (
              <circle key={i} cx={x(i)} cy={y(v)} r={s.bold ? 4 : 2.6} fill={s.colour} stroke="var(--paper)" strokeWidth="1.5" />
            ))}
          </g>
        )
      })}
    </svg>
  )
}

/* ---------------- Horizontal bars ---------------- */

export interface HRow {
  label: string
  value: number
  colour?: string
  /** a short note at the end of the row */
  note?: string
  /** draw this row in warning colours */
  warn?: boolean
}

export function HBars({ rows, max, unit = '', marker, markerLabel }: { rows: HRow[]; max?: number; unit?: string; marker?: number; markerLabel?: string }) {
  const reduce = useReducedMotion()
  const m = max ?? Math.max(...rows.map((r) => r.value), 1)
  return (
    <ul className="space-y-2.5">
      {rows.map((r, i) => (
        <li key={r.label} className="grid grid-cols-[minmax(92px,0.9fr)_minmax(0,2fr)_auto] items-center gap-x-3 text-[13.5px]">
          <span className="truncate font-medium">{r.label}</span>
          <span className="hatch relative block h-3.5 bg-forest/[0.07]" style={{ borderRadius: '9px 3px 8px 4px' }}>
            <motion.span
              className="block h-full"
              style={{ background: r.warn ? 'var(--terracotta)' : (r.colour ?? 'var(--teal)'), borderRadius: '9px 5px 8px 4px', boxShadow: 'inset 0 -3px 0 rgba(18,48,43,.15)' }}
              initial={reduce ? false : { width: 0 }}
              animate={{ width: `${(r.value / m) * 100}%` }}
              transition={reduce ? { duration: 0 } : { duration: 0.8, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            />
            {marker !== undefined && <span className="absolute -bottom-1 -top-1 w-0 border-l-2 border-dashed border-pine/60" style={{ left: `${(marker / m) * 100}%` }} aria-hidden="true" title={markerLabel} />}
          </span>
          <span className="min-w-[44px] text-right font-bold tabular-nums">
            {r.value}
            {unit}
            {r.note && <span className="ml-1 text-xs font-normal text-stone">{r.note}</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}
