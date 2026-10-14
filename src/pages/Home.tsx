import { motion, useReducedMotion } from 'framer-motion'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { lastSeason, lastSeasonTotal } from '../data'
import Dial from '../components/Dial'
import { DeodarIcon, StatusDot, Topo } from '../components/Marks'
import SeasonRibbon from '../components/SeasonRibbon'
import { Card, CountUp, Highlight, SectionTitle, Tag, spring } from '../components/ui'
import { formatINR, formatLakh } from '../lib/format'
import { getDemo } from '../lib/demo'
import type { Attention, ReadinessBand, SubScore } from '../lib/readiness'
import { seasons, useApp } from '../store/useApp'

const HEADLINE: Record<ReadinessBand, { title: string; body: string; colour: string }> = {
  ready: {
    title: 'Deodar Heights is ready for the season.',
    body: 'Shifts are covered, people are rested, and the leave plan holds. Go and enjoy a quiet cup of chai.',
    colour: 'var(--teal)',
  },
  nearly: {
    title: 'Nearly there. A few things to tend before the rush.',
    body: 'The weekend is covered, but a couple of people are running hot and one shift is still open. Fix those and this is a calm season.',
    colour: 'var(--teal)',
  },
  'needs-work': {
    title: 'Some work to do before the rush arrives.',
    body: 'There are gaps and tired people. The good news: we can see exactly where, and each one has a fix.',
    colour: 'var(--terracotta)',
  },
}

function Bar({ s, i }: { s: SubScore; i: number }) {
  const reduce = useReducedMotion()
  const colour = s.value >= 85 ? 'var(--teal)' : s.value >= 70 ? 'var(--saffron)' : 'var(--terracotta)'
  return (
    // each row steps in a little further, like lines pinned up by hand
    <li
      className="grid grid-cols-[1fr_auto] items-end gap-x-4 gap-y-1.5 sm:grid-cols-[160px_1fr_auto] sm:ml-[var(--step)]"
      style={{ ['--step' as string]: `${(i % 2) * 22 + i * 6}px` }}
    >
      <div className="leading-tight">
        <p className="text-[15px] font-bold text-pine">{s.label}</p>
        <p className="hidden text-xs text-stone sm:block">{s.note}</p>
      </div>
      <div className="hatch order-3 col-span-2 h-4 overflow-hidden bg-forest/[0.07] sm:order-none sm:col-span-1" style={{ borderRadius: '10px 3px 9px 4px' }}>
        <motion.div
          className="h-full"
          style={{ background: colour, borderRadius: '10px 6px 9px 4px', boxShadow: 'inset 0 -3px 0 rgba(18,48,43,.16)' }}
          initial={{ width: reduce ? `${s.value}%` : 0 }}
          animate={{ width: `${s.value}%` }}
          transition={{ delay: 0.5 + i * 0.1, duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <p className="font-num text-3xl font-black leading-none text-pine sm:text-4xl">
        <CountUp value={s.value} />
      </p>
      <p className="col-span-2 -mt-0.5 text-xs text-stone sm:hidden">{s.note}</p>
    </li>
  )
}

const toneBg: Record<Attention['tone'], string> = { gap: 'bg-saffron/20', risk: 'bg-terracotta/12', leave: 'bg-teal/12' }

function AttentionCard({ a, i }: { a: Attention; i: number }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, x: 24 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ ...spring, delay: i * 0.08 }}
    >
      <Link to={a.to} className={`group block rounded-card focus-visible:outline-offset-4 ${i % 2 === 1 ? 'lg:ml-10' : 'lg:-ml-4'}`}>
        <Card lift alt={i % 2 === 1} tilt={i === 1 ? 0.8 : i === 2 ? -0.7 : 0} className="flex items-start gap-4 !p-4 sm:!p-5">
          <span className={`mt-0.5 grid h-11 w-11 shrink-0 place-items-center ${toneBg[a.tone]}`} style={{ borderRadius: '14px 6px 14px 8px' }}>
            <StatusDot tone={a.tone === 'risk' ? 'risk' : 'watch'} size={22} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-lg font-semibold leading-snug text-pine sm:text-xl">{a.title}</span>
            <span className="mt-1 block text-sm leading-relaxed text-stone">{a.body}</span>
            <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-forest">
              <span className="border-b-2 border-saffron pb-px">{a.cta}</span>
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
            </span>
          </span>
        </Card>
      </Link>
    </motion.div>
  )
}

export default function Home() {
  const epoch = useApp((s) => s.epoch)
  const seasonId = useApp((s) => s.seasonId)
  const fixVersion = useApp((s) => s.fixVersion)
  const demo = useMemo(() => getDemo(), [epoch, fixVersion])
  const { readiness, roster, attention } = demo
  const head = HEADLINE[readiness.band]
  // first sentence set huge, the rest as a quieter italic aside
  const cut = head.title.indexOf('. ')
  const headLead = cut === -1 ? head.title : head.title.slice(0, cut + 1)
  const headRest = cut === -1 ? '' : head.title.slice(cut + 2)
  const season = seasons.find((s) => s.id === seasonId)!
  const dialColour = readiness.band === 'needs-work' ? 'var(--terracotta)' : readiness.band === 'nearly' ? 'var(--teal)' : 'var(--forest)'

  return (
    <div key={epoch} className="space-y-12 sm:space-y-16">
      {!season.live && (
        <p className="rounded-[14px_6px_14px_8px] border border-saffron/50 bg-saffron/15 px-4 py-3 text-sm text-pine">
          <strong>{season.label} has closed.</strong> This sample build only has a live forecast for Autumn 2026, so the numbers below are Autumn's.
        </p>
      )}

      {/* ---------- Hero ---------- */}
      <section aria-labelledby="hero-title">
        <div className="relative shadow-lift" style={{ borderRadius: '38px 14px 64px 16px' }}>
          {/* clipped backdrop: paper, contours, grain, halftone */}
          <div className="grain-heavy absolute inset-0 overflow-hidden border border-pine/10 bg-white/70" style={{ borderRadius: 'inherit' }}>
            <Topo opacity={0.2} />
            <div className="halftone absolute -bottom-6 -left-6 h-56 w-72" aria-hidden="true" />
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-saffron/25" aria-hidden="true" />
            <div className="hatch absolute inset-y-0 right-0 hidden w-10 lg:block" aria-hidden="true" />
          </div>

          {/* verdict stamp, hanging off the corner like a sticker */}
          <span
            className="absolute -top-4 right-6 z-10 rotate-[4deg] bg-pine px-4 py-1.5 font-display text-sm font-black uppercase tracking-[0.14em] text-saffron shadow-warm sm:right-14"
            style={{ borderRadius: '10px 4px 10px 5px' }}
          >
            {readiness.band === 'ready' ? 'Ready' : readiness.band === 'nearly' ? 'Nearly' : 'Needs work'}
          </span>

          <div className="relative z-10 grid items-center gap-8 px-5 py-10 sm:px-10 md:grid-cols-[minmax(280px,380px)_1fr] md:gap-8 lg:gap-12 lg:pr-16">
            {/* the dial is oversized and breaks out of the card's left edge */}
            <div data-tour="readiness" className="relative mx-auto w-full max-w-[360px] md:-ml-14 md:max-w-none md:w-[calc(100%+3.5rem)] md:-translate-y-3">
              <Dial score={readiness.score} colour={dialColour} />
              <div className="-mt-3 flex justify-center md:justify-start md:pl-16">
                <Tag tone="saffron" tilt={-3}>Sample data · live from the engine</Tag>
              </div>
            </div>
            <div>
              <p className="inline-block -rotate-1 bg-pine px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-paper" style={{ borderRadius: '6px 2px 6px 3px' }}>
                Season Readiness Score
              </p>
              <h1
                id="hero-title"
                className="mt-4 text-[clamp(2.5rem,6.2vw,4.9rem)] font-black leading-[0.92] tracking-[-0.035em]"
                style={{ fontVariationSettings: "'opsz' 144" }}
              >
                {headLead}
                {headRest && (
                  <span className="mt-2 block text-[0.62em] font-bold italic leading-[1] tracking-[-0.02em] text-forest md:ml-10">{headRest}</span>
                )}
              </h1>
              <p className="mt-5 max-w-md border-l-[3px] border-saffron pl-4 text-base leading-relaxed text-pine/75 md:ml-10">{head.body}</p>
              <ul className="mt-8 space-y-4" aria-label="What makes up the score">
                {readiness.subScores.map((s, i) => (
                  <Bar key={s.key} s={s} i={i} />
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Ribbon ---------- */}
      <section aria-label="Season ribbon">
        <SeasonRibbon roster={roster} />
      </section>

      {/* ---------- Cost of quitting + attention ---------- */}
      <section className="grid items-start gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-10">
        <div className="lg:mt-16">
          <SectionTitle eyebrow="What leaving costs">Cost of quitting</SectionTitle>
          <Card tilt={-1} className="relative overflow-hidden">
            <Topo opacity={0.12} />
            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-stone">Last season, {lastSeason.resignations.length} people left us.</p>
                <Tag tone="teal">Sample figure</Tag>
              </div>
              <p className="mt-3 text-sm text-pine">Finding, training and settling their replacements cost about</p>
              <p className="mt-1 text-[clamp(3.2rem,9vw,4.6rem)] leading-none">
                <Highlight>
                  <span className="font-num font-semibold">
                    <CountUp value={lastSeasonTotal} format={formatLakh} />
                  </span>
                </Highlight>
              </p>
              <div className="mt-5 flex items-end gap-1.5" aria-hidden="true">
                {lastSeason.resignations.map((r, i) => (
                  <span key={r.name} title={`${r.name}, ${r.department}`} style={{ transform: `rotate(${(i % 3) * 3 - 3}deg)` }}>
                    <DeodarIcon size={22} className="text-terracotta/70" />
                  </span>
                ))}
                <span className="ml-1 pb-0.5 text-xs text-stone">one for every goodbye</span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-stone">
                That is roughly {formatINR(lastSeasonTotal / lastSeason.resignations.length)} each (an assumption, covering hiring, onboarding and the weeks a new person takes
                to find their feet). RosterIQ exists to keep as many of them as it can.
              </p>
            </div>
          </Card>
        </div>

        <div>
          <SectionTitle eyebrow="Before the weekend">Needs attention</SectionTitle>
          <div className="space-y-4">
            {attention.map((a, i) => (
              <AttentionCard key={a.id} a={a} i={i} />
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
