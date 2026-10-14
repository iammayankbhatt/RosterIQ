import { motion, useReducedMotion } from 'framer-motion'
import { DeodarIcon } from './Marks'

/** Shown for the instant the engine takes to write the first roster. */
export default function PageLoading({ label = 'Reading the forecast…' }: { label?: string }) {
  const reduce = useReducedMotion()
  return (
    <div role="status" aria-live="polite" className="grid min-h-[50vh] place-items-center">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex items-end gap-1.5 text-teal">
          {[0, 1, 2].map((i) => (
            <motion.span key={i} animate={reduce ? undefined : { y: [0, -8, 0], rotate: [0, i % 2 ? 4 : -4, 0] }} transition={{ repeat: Infinity, duration: 1.1, delay: i * 0.15 }}>
              <DeodarIcon size={i === 1 ? 34 : 24} />
            </motion.span>
          ))}
        </span>
        <p className="font-display text-xl font-bold text-pine">{label}</p>
        <p className="text-sm text-stone">Writing a fair roster from the sample forecast.</p>
      </div>
    </div>
  )
}
