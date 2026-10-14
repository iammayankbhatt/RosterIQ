import { motion, useReducedMotion } from 'framer-motion'
import { useMemo, type ReactNode } from 'react'

/** A slightly wobbly full circle from twelve o'clock, so the ring reads as pen rather than vector. */
function loop(seed: number): string {
  let d = ''
  for (let i = 0; i <= 60; i++) {
    const a = -Math.PI / 2 + (i / 60) * Math.PI * 2
    const r = 40 + 1.1 * Math.sin(a * 3 + seed) + 0.6 * Math.sin(a * 5 + seed * 2.1)
    d += `${i ? 'L' : 'M'}${(50 + Math.cos(a) * r).toFixed(1)} ${(50 + Math.sin(a) * r).toFixed(1)}`
  }
  return d
}

export default function ProgressRing({ progress, size = 64, seed = 1, done = false, children }: { progress: number; size?: number; seed?: number; done?: boolean; children?: ReactNode }) {
  const reduce = useReducedMotion()
  const d = useMemo(() => loop(seed), [seed])
  const p = Math.max(0, Math.min(1, progress))
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} className="absolute inset-0" aria-hidden="true">
        <path d={d} fill="none" stroke="var(--forest)" strokeOpacity="0.14" strokeWidth="9" strokeLinecap="round" />
        <motion.path
          d={d}
          fill="none"
          stroke={done ? 'var(--forest)' : 'var(--saffron)'}
          strokeWidth="9"
          strokeLinecap="round"
          initial={false}
          animate={{ pathLength: p, opacity: p > 0 ? 1 : 0 }}
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 90, damping: 18 }}
        />
      </svg>
      <span className="relative">{children}</span>
    </span>
  )
}
