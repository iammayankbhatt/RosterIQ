import { animate, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useInViewOnce } from '../lib/useInViewOnce'

const CX = 150
const CY = 150
const R = 112
const START = 210 // degrees, bottom-left
const SWEEP = 240 // clockwise to bottom-right

/** A point on the dial's slightly wobbly arc, t in [0,1]. `seed` shifts the wobble. */
function pointAt(t: number, seed: number, radius = R) {
  const a = ((START - SWEEP * t) * Math.PI) / 180
  const wobble = 1.8 * Math.sin(t * 17 + seed) + 1.1 * Math.sin(t * 31 + seed * 2.1) + 0.6 * Math.sin(t * 53 + seed * 0.7)
  const r = radius + wobble
  return { x: CX + Math.cos(a) * r, y: CY - Math.sin(a) * r }
}

function arcPath(seed: number, radius = R) {
  const pts = Array.from({ length: 73 }, (_, i) => pointAt(i / 72, seed, radius))
  return pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('')
}

interface DialProps {
  score: number
  /** CSS colour for the progress stroke */
  colour?: string
}

/** Hand-feeling arc dial: wobbly strokes, irregular ticks, a little sun riding the end of the arc. */
export default function Dial({ score, colour = 'var(--teal)' }: DialProps) {
  const reduce = useReducedMotion()
  const ref = useRef<SVGSVGElement>(null)
  const inView = useInViewOnce(ref)
  const [t, setT] = useState(reduce ? 1 : 0)
  useEffect(() => {
    if (reduce) {
      setT(1)
      return
    }
    if (!inView) return
    const c = animate(0, 1, { duration: 1.9, delay: 0.2, ease: [0.22, 1, 0.36, 1], onUpdate: setT })
    return () => c.stop()
  }, [reduce, inView])

  const track = useMemo(() => arcPath(1.3), [])
  const track2 = useMemo(() => arcPath(4.7, R - 7), [])
  const ticks = useMemo(
    () =>
      Array.from({ length: 21 }, (_, i) => {
        const f = i / 20
        const big = i % 5 === 0
        const len = (big ? 13 : 6) + ((i * 7) % 3)
        const a = pointAt(f, 1.3, R + 14)
        const b = pointAt(f, 1.3, R + 14 + len)
        return { a, b, big }
      }),
    [],
  )

  const shown = Math.round(score * t)
  const end = pointAt((score / 100) * t, 1.3)
  return (
    <svg ref={ref} viewBox="0 0 300 270" className="h-auto w-full" role="img" aria-label={`Season Readiness Score ${score} out of 100`}>
      {ticks.map((k, i) => (
        <line key={i} x1={k.a.x} y1={k.a.y} x2={k.b.x} y2={k.b.y} stroke="var(--pine)" strokeOpacity={k.big ? 0.4 : 0.2} strokeWidth={k.big ? 2 : 1.4} strokeLinecap="round" />
      ))}
      <path d={track2} fill="none" stroke="var(--forest)" strokeOpacity="0.14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={track} fill="none" stroke="var(--forest)" strokeOpacity="0.14" strokeWidth="17" strokeLinecap="round" strokeLinejoin="round" />
      {/* progress: two overlapping strokes so it reads as pen, not vector */}
      <path d={track} pathLength={1} strokeDasharray={`${(score / 100) * t} 1.01`} fill="none" stroke={colour} strokeWidth="17" strokeLinecap="round" strokeLinejoin="round" />
      <path d={arcPath(2.2, R + 2)} pathLength={1} strokeDasharray={`${(score / 100) * t} 1.01`} fill="none" stroke={colour} strokeOpacity="0.45" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {/* sun at the end of the arc */}
      <g transform={`translate(${end.x} ${end.y})`}>
        {Array.from({ length: 8 }, (_, i) => (
          <line key={i} x1="0" y1="-15" x2="0" y2={i % 2 ? -18.5 : -21} stroke="var(--saffron)" strokeWidth="2.4" strokeLinecap="round" transform={`rotate(${i * 45 + t * 40})`} />
        ))}
        <circle r="10.5" fill="var(--saffron)" stroke="var(--paper)" strokeWidth="3" />
      </g>
      <text x="22" y="236" fontSize="12" fill="var(--stone)" fontFamily="Instrument Sans">0</text>
      <text x="268" y="236" fontSize="12" fill="var(--stone)" fontFamily="Instrument Sans" textAnchor="end">100</text>
      <text x={CX} y={CY + 22} textAnchor="middle" className="font-num" fontSize="92" fontWeight="600" fill="var(--pine)" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>
        {shown}
      </text>
      <text x={CX} y={CY + 50} textAnchor="middle" fontSize="13" fill="var(--stone)" fontFamily="Instrument Sans" letterSpacing="1.4">
        OUT OF 100
      </text>
    </svg>
  )
}
