import { animate, motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useInViewOnce } from '../lib/useInViewOnce'
import { HandUnderline } from './Marks'

export const spring = { type: 'spring', stiffness: 220, damping: 26, mass: 0.9 } as const

/* ---------------- Highlight ---------------- */

/** Saffron highlighter swipe that draws itself behind key numbers. */
export function Highlight({ children, className = '' }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInViewOnce(ref)
  return (
    <motion.span
      ref={ref}
      className={`highlight ${className}`}
      initial={false}
      animate={{ backgroundSize: reduce || inView ? '100% 0.55em' : '0% 0.55em' }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
    >
      {children}
    </motion.span>
  )
}

/* ---------------- Card ---------------- */

type CardTone = 'paper' | 'mist' | 'pine'
const toneClass: Record<CardTone, string> = {
  paper: 'bg-white/70 text-pine border-pine/10',
  mist: 'bg-mist text-pine border-forest/10',
  pine: 'bg-pine text-paper border-pine',
}

interface CardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  tone?: CardTone
  /** slight sticker-like tilt in degrees (keep within ±2) */
  tilt?: number
  alt?: boolean
  lift?: boolean
  children?: ReactNode
}

export function Card({ tone = 'paper', tilt = 0, alt = false, lift = false, className = '', children, ...rest }: CardProps) {
  return (
    <motion.div
      initial={false}
      style={{ rotate: tilt }}
      whileHover={lift ? { y: -4, rotate: tilt / 2, transition: spring } : undefined}
      className={`relative border p-5 shadow-warm sm:p-6 ${alt ? 'rounded-card-alt' : 'rounded-card'} ${toneClass[tone]} ${className}`}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

/* ---------------- Count-up + Stat ---------------- */

export function CountUp({ value, format = (n: number) => Math.round(n).toLocaleString('en-IN') }: { value: number; format?: (n: number) => string }) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInViewOnce(ref)
  const [v, setV] = useState(reduce ? value : 0)
  /** where the last tween ended, so an edited value glides from the old number instead of restarting at zero */
  const from = useRef(reduce ? value : 0)
  useEffect(() => {
    if (reduce) {
      from.current = value
      setV(value)
      return
    }
    if (!inView) return
    const first = from.current === 0
    const c = animate(from.current, value, {
      duration: first ? 1.4 : 0.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (x) => {
        from.current = x
        setV(x)
      },
    })
    return () => c.stop()
  }, [value, reduce, inView])
  // paper never shows a half-counted number: jump to the final figure when printing
  useEffect(() => {
    const done = () => {
      from.current = value
      setV(value)
    }
    const q = window.matchMedia('print')
    const onMedia = (e: MediaQueryListEvent) => e.matches && done()
    window.addEventListener('beforeprint', done)
    q.addEventListener('change', onMedia)
    return () => {
      window.removeEventListener('beforeprint', done)
      q.removeEventListener('change', onMedia)
    }
  }, [value])
  return <span ref={ref}>{format(v)}</span>
}

interface StatProps {
  label: string
  value: number
  format?: (n: number) => string
  /** every figure must be labelled as a sample or assumption */
  basis: 'sample' | 'assumption'
  note?: string
  highlight?: boolean
  tone?: CardTone
  tilt?: number
}

export function Stat({ label, value, format, basis, note, highlight = false, tone = 'paper', tilt = 0 }: StatProps) {
  const dark = tone === 'pine'
  const num = (
    <span className="font-num text-5xl font-semibold leading-none sm:text-6xl">
      <CountUp value={value} format={format} />
    </span>
  )
  return (
    <Card tone={tone} tilt={tilt} className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <p className={`text-sm font-medium ${dark ? 'text-mist/80' : 'text-stone'}`}>{label}</p>
        <Tag tone={basis === 'sample' ? 'teal' : 'saffron'} dark={dark}>
          {basis === 'sample' ? 'Sample' : 'Assumption'}
        </Tag>
      </div>
      {/* on a dark card the highlighter would hide paper-coloured digits, so the number itself turns saffron */}
      <div className={dark ? (highlight ? 'text-saffron' : 'text-paper') : 'text-pine'}>
        {highlight && !dark ? <Highlight>{num}</Highlight> : num}
      </div>
      {note && <p className={`text-sm leading-snug ${dark ? 'text-mist/70' : 'text-stone'}`}>{note}</p>}
    </Card>
  )
}

/* ---------------- Tag ---------------- */

type TagTone = 'teal' | 'saffron' | 'terracotta' | 'stone' | 'pine'
const tagClass: Record<TagTone, string> = {
  teal: 'bg-teal/12 text-forest ring-teal/30',
  saffron: 'bg-saffron/25 text-pine ring-saffron/50',
  terracotta: 'bg-terracotta/12 text-terracotta ring-terracotta/35',
  stone: 'bg-stone/12 text-pine/75 ring-stone/30',
  pine: 'bg-pine text-paper ring-pine',
}

export function Tag({
  tone = 'stone',
  dark = false,
  tilt = 0,
  children,
  className = '',
}: {
  tone?: TagTone
  dark?: boolean
  tilt?: number
  children: ReactNode
  className?: string
}) {
  return (
    <span
      style={tilt ? { transform: `rotate(${tilt}deg)` } : undefined}
      className={`inline-flex shrink-0 items-center rounded-chip px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ring-1 ring-inset ${
        dark && tone !== 'pine' ? 'bg-paper/10 text-paper ring-paper/25' : tagClass[tone]
      } ${className}`}
    >
      {children}
    </span>
  )
}

/* ---------------- Button ---------------- */

type Variant = 'primary' | 'saffron' | 'ghost'
const btnClass: Record<Variant, string> = {
  primary: 'bg-pine text-paper hover:bg-forest shadow-warm',
  saffron: 'bg-saffron text-pine hover:brightness-105 shadow-warm',
  ghost: 'bg-transparent text-pine ring-1 ring-inset ring-pine/25 hover:bg-pine/5',
}

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: Variant
  children?: ReactNode
}

export function Button({ variant = 'primary', className = '', children, ...rest }: ButtonProps) {
  return (
    <motion.button
      whileHover={{ y: -2, transition: spring }}
      whileTap={{ scale: 0.97, y: 0, transition: spring }}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px_6px_14px_8px] px-5 py-2.5 text-[15px] font-semibold transition-colors ${btnClass[variant]} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  )
}

/* ---------------- Section title ---------------- */

export function SectionTitle({ eyebrow, children }: { eyebrow?: string; children: ReactNode }) {
  return (
    <div className="mb-6">
      {eyebrow && <p className="mb-1 text-xs font-bold uppercase tracking-[0.22em] text-teal">{eyebrow}</p>}
      <h2 className="text-4xl font-black leading-[0.95] tracking-[-0.03em] sm:text-5xl">{children}</h2>
      <HandUnderline className="mt-1.5 w-32 sm:w-40" />
    </div>
  )
}
