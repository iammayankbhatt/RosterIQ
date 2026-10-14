import { animate, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { RISK_BANDS, type RiskBand } from '../../engine'
import { BAND_LABEL } from '../../lib/riskView'
import { StatusDot } from '../Marks'

export const bandOf = (score: number): RiskBand => (score >= RISK_BANDS.high ? 'high' : score >= RISK_BANDS.watch ? 'watch' : 'steady')

const COLOUR: Record<RiskBand, string> = { steady: 'var(--teal)', watch: 'var(--saffron)', high: 'var(--terracotta)' }

/** A slightly wobbly closed loop starting at twelve o'clock, drawn clockwise. */
function ringPath(seed: number): string {
  const n = 72
  let d = ''
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2
    const r = 41 + 1.2 * Math.sin(a * 3 + seed) + 0.7 * Math.sin(a * 5 + seed * 2.3)
    d += `${i ? 'L' : 'M'}${(50 + Math.cos(a) * r).toFixed(1)} ${(50 + Math.sin(a) * r).toFixed(1)}`
  }
  return d
}

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 997, 7) / 100

/**
 * Workload risk drawn as a pen ring. When `score` changes the ring walks to the new value,
 * and its colour follows the band it is passing through.
 */
export default function RiskRing({ score, id, size = 56, label = true }: { score: number; id: string; size?: number; label?: boolean }) {
  const reduce = useReducedMotion()
  const [v, setV] = useState(reduce ? score : 0)
  const from = useRef(reduce ? score : 0)
  useEffect(() => {
    if (reduce) {
      setV(score)
      from.current = score
      return
    }
    const c = animate(from.current, score, {
      duration: 1.3,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (x) => {
        from.current = x
        setV(x)
      },
    })
    return () => c.stop()
  }, [score, reduce])

  const path = useMemo(() => ringPath(hash(id)), [id])
  const shown = Math.round(v)
  const band = bandOf(v)
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={`Workload risk ${score} out of 100, ${BAND_LABEL[bandOf(score)]}`}
      className="shrink-0"
    >
      <path d={path} fill="none" stroke="var(--forest)" strokeOpacity="0.14" strokeWidth="9" strokeLinecap="round" />
      {v > 0.4 && (
        <path
          d={path}
          pathLength={1}
          strokeDasharray={`${Math.min(1, v / 100)} 1.02`}
          fill="none"
          stroke={COLOUR[band]}
          strokeWidth="9"
          strokeLinecap="round"
        />
      )}
      {label && (
        <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fontSize="34" fontWeight="800" fill="var(--pine)" style={{ fontFamily: 'Fraunces, Georgia, serif', fontVariantNumeric: 'lining-nums' }}>
          {shown}
        </text>
      )}
    </svg>
  )
}

const BAND_CLASS: Record<RiskBand, string> = {
  steady: 'bg-teal/12 text-forest ring-teal/35',
  watch: 'bg-saffron/30 text-pine ring-saffron/60',
  high: 'bg-terracotta/15 text-[#9a3b27] ring-terracotta/45',
}
const BAND_DOT = { steady: 'ok', watch: 'watch', high: 'risk' } as const

/** Band label with a status mark whose silhouette differs per band, so colour is never the only cue. */
export function BandChip({ band, big = false }: { band: RiskBand; big?: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 font-bold uppercase ring-1 ring-inset ${BAND_CLASS[band]} ${big ? 'px-3 py-1.5 text-[13px] tracking-[0.1em]' : 'px-2 py-[3px] text-[10.5px] tracking-[0.08em]'}`}
      style={{ borderRadius: '10px 4px 10px 5px' }}
    >
      <StatusDot tone={BAND_DOT[band]} size={big ? 15 : 12} />
      {BAND_LABEL[band]}
    </span>
  )
}
