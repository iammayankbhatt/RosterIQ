import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { staff } from '../data'
import { getDemo } from '../lib/demo'
import { rankPeople } from '../lib/riskView'
import { indexRoster } from '../lib/rosterView'
import { TOUR_STEPS, useTour } from '../store/useTour'
import { useApp } from '../store/useApp'
import { Button, spring } from './ui'

const RAVI = 'st-05'

interface Ctx {
  demo: ReturnType<typeof getDemo>
}

interface Step {
  route: string
  target: string
  title: string
  body: (c: Ctx) => ReactNode
  /** runs once when the step appears; the returned function cleans up when it ends */
  enter?: () => void | (() => void)
}

const first = (name: string) => name.split(' ')[0]

/** Click something the page already offers, so the tour shows the real interface working. */
const click = (sel: string, nth = 0) => (document.querySelectorAll<HTMLElement>(sel)[nth] as HTMLElement | undefined)?.click()

function timers(...pairs: [number, () => void][]): () => void {
  const ids = pairs.map(([ms, fn]) => window.setTimeout(fn, ms))
  return () => ids.forEach((id) => window.clearTimeout(id))
}

const STEPS: Step[] = [
  {
    route: '/',
    target: '[data-tour="readiness"]',
    title: 'Season Readiness',
    body: ({ demo }) => (
      <>
        Start with the one number an owner wants: <strong>{demo.readiness.score} out of 100</strong>. It is worked out live from the roster, who is rested and who has leave waiting, and it says what to tend first.
      </>
    ),
  },
  {
    route: '/roster',
    target: '[data-tour="compare"]',
    title: 'A fair roster in a third of a second',
    body: ({ demo }) => {
      const broken = indexRoster(staff, demo.manual).violations.size
      return (
        <>
          Watch Before turn into After. On paper: <strong>{demo.manual.totalOvertimeHours} hours of overtime</strong> and {broken} shifts that break a rule. RosterIQ: <strong>{demo.roster.totalOvertimeHours} hours</strong> and none.
        </>
      )
    },
    enter: () =>
      timers(
        [1300, () => click('[data-tour="compare"] [role="radio"]', 0)],
        [3600, () => click('[data-tour="compare"] [role="radio"]', 1)],
      ),
  },
  {
    route: '/at-risk',
    target: '[data-tour="risk-reasons"]',
    title: 'Early warnings, with reasons',
    body: ({ demo }) => {
      const top = rankPeople(demo).slice(0, 3)
      return (
        <>
          {top.map((r, i) => (
            <span key={r.person.id}>
              {i > 0 && ' '}
              <strong>{first(r.person.name)}:</strong> {r.risk.reasons[0]?.text.toLowerCase()}.
            </span>
          ))}{' '}
          Every point shows its dates. It is a workload score from visible rules, never a prediction.
        </>
      )
    },
    enter: () => {
      useApp.getState().focusRisk(RAVI)
    },
  },
  {
    route: '/at-risk',
    target: '[data-tour="apply-action"]',
    title: "Apply Ravi's fix",
    body: ({ demo }) => {
      const done = demo.applied.find((a) => a.fix.staffId === RAVI)
      return done ? (
        <>
          Ravi's workload risk fell from <strong>{done.result.before.score}</strong> to <strong>{done.result.after.score}</strong>, high to {done.result.after.band}. A colleague covers his shifts, and the roster changed everywhere: Home, Roster and his phone.
        </>
      ) : (
        <>One tap gives Ravi a fixed weekly off and moves the shifts that clash to colleagues who are rested. Press the button and watch the ring.</>
      )
    },
    enter: () => {
      useApp.getState().focusRisk(RAVI)
    },
  },
  {
    route: '/employees',
    target: '[data-tour="team-overview"]',
    title: 'Everyone in one place',
    body: ({ demo }) => {
      const i = demo.people.findIndex((p) => p.id === RAVI)
      const r = demo.risks[i]
      return (
        <>
          Headcount, time with us, hours, overtime, feedback, skills cover and leave, all from the same live roster. Ravi now shows <strong>{r.score}</strong> ({r.band}). Open any name for their full profile.
        </>
      )
    },
  },
  {
    route: '/staff-app',
    target: '[data-tour="phone"]',
    title: "Ravi's phone",
    body: () => (
      <>
        The same facts, in his pocket. His weekly off is now fixed and his manager's note is on top. It swaps shifts fairly, checks in on mood, offers courses, and speaks Hindi too.
      </>
    ),
    enter: () => {
      const app = useApp.getState()
      app.setStaffPerson(RAVI)
      app.setLang('en')
      const stop = timers([2800, () => useApp.getState().setLang('hi')])
      return () => {
        stop()
        useApp.getState().setLang('en')
      }
    },
  },
]

interface Box {
  top: number
  left: number
  width: number
  height: number
}

const PAD = 10

export default function Tour() {
  const reduce = useReducedMotion()
  const navigate = useNavigate()
  const loc = useLocation()
  const { active, step, start, next, back, exit } = useTour()
  const fixVersion = useApp((s) => s.fixVersion)
  const [box, setBox] = useState<Box | null>(null)
  const [vh, setVh] = useState(() => window.innerHeight)
  const cardRef = useRef<HTMLDivElement>(null)
  const [cardH, setCardH] = useState(200)
  const scrolledFor = useRef<string>('')

  const cur = STEPS[step]
  const demo = useMemo(() => getDemo(), [fixVersion])

  /* ---- keyboard: D starts or stops, arrows move, Esc leaves ---- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target as HTMLElement | null
      if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return
      const st = useTour.getState()
      if (e.key === 'd' || e.key === 'D') {
        e.preventDefault()
        st.active ? st.exit() : st.start()
      } else if (!st.active) return
      else if (e.key === 'ArrowRight') {
        e.preventDefault()
        st.next()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        st.back()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        st.exit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /* ---- go to the step's screen and run its action ---- */
  useEffect(() => {
    if (!active) return
    if (loc.pathname !== cur.route) navigate(cur.route)
    scrolledFor.current = ''
    setBox(null)
    const cleanup = cur.enter?.()
    return () => {
      if (typeof cleanup === 'function') cleanup()
    }
    // the route check is deliberately not a dependency: only a new step should navigate
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, step])

  /* ---- follow the target: it may mount late, animate in, or move on resize ---- */
  const measure = useCallback(() => {
    const el = document.querySelector<HTMLElement>(cur.target)
    if (!el) return setBox((b) => (b ? null : b))
    const r = el.getBoundingClientRect()
    if (scrolledFor.current !== `${step}`) {
      scrolledFor.current = `${step}`
      const narrow = window.innerWidth < 640
      const tall = r.height > window.innerHeight * 0.6
      const want = narrow || tall ? 76 : 92 // upper part of the screen, so the caption fits underneath
      window.scrollTo({ top: Math.max(0, window.scrollY + r.top - want), behavior: reduce ? 'auto' : 'smooth' })
    }
    const next: Box = { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 }
    setBox((b) => (b && Math.abs(b.top - next.top) < 0.6 && Math.abs(b.left - next.left) < 0.6 && Math.abs(b.width - next.width) < 0.6 && Math.abs(b.height - next.height) < 0.6 ? b : next))
  }, [cur.target, step, reduce])

  useEffect(() => {
    if (!active) return
    let raf = 0
    const loop = () => {
      measure()
      setVh(window.innerHeight)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [active, measure])

  useLayoutEffect(() => {
    if (cardRef.current) setCardH(cardRef.current.offsetHeight)
  }, [step, box, active, fixVersion])

  // keep keyboard focus inside the tour card when a step changes
  useEffect(() => {
    if (active) cardRef.current?.focus({ preventScroll: true })
  }, [active, step])

  const narrow = typeof window !== 'undefined' && window.innerWidth < 640
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  const cardW = Math.min(420, vw - 24)

  /** Put the caption below the target, else above it, else docked at the bottom over a tall one. */
  const place = (() => {
    const bottomDock = { top: Math.max(12, vh - cardH - (narrow ? 92 : 20)), left: Math.max(12, (vw - cardW) / 2) }
    if (!box || narrow) return bottomDock
    const left = Math.min(Math.max(12, box.left + box.width / 2 - cardW / 2), vw - cardW - 12)
    const below = box.top + box.height + 16
    if (below + cardH < vh - 6) return { top: below, left }
    const above = box.top - cardH - 16
    if (above > 12) return { top: above, left }
    // beside the target, vertically centred on it
    const midTop = Math.min(Math.max(12, box.top + box.height / 2 - cardH / 2), vh - cardH - 12)
    if (box.left - 16 - cardW > 12) return { top: midTop, left: box.left - 16 - cardW }
    if (box.left + box.width + 16 + cardW < vw - 12) return { top: midTop, left: box.left + box.width + 16 }
    return bottomDock
  })()

  const isRaviDone = demo.applied.some((a) => a.fix.staffId === RAVI)
  const applyFix = () => click('[data-tour="apply-fix"]')

  if (!active) return null
  const last = step === TOUR_STEPS - 1

  return (
    <div className="print:hidden" aria-live="polite">
      {/* the dimmed page with a bright window cut out around the target */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed z-[90]"
        initial={false}
        animate={box ? { top: box.top, left: box.left, width: box.width, height: box.height, opacity: 1 } : { top: vh / 2, left: vw / 2, width: 0, height: 0, opacity: 1 }}
        transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 170, damping: 24 }}
        style={{ borderRadius: '26px 12px 28px 14px', boxShadow: '0 0 0 100vmax rgba(18,48,43,0.66), 0 0 0 4px var(--saffron), 0 0 28px 6px rgba(242,163,58,0.45)' }}
      />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          ref={cardRef}
          role="dialog"
          aria-label={`Guided demo, step ${step + 1} of ${TOUR_STEPS}: ${cur.title}`}
          tabIndex={-1}
          initial={reduce ? false : { opacity: 0, y: 14, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1, top: place.top, left: place.left }}
          exit={reduce ? undefined : { opacity: 0, y: -8 }}
          transition={{ ...spring, top: reduce ? { duration: 0 } : spring, left: reduce ? { duration: 0 } : spring }}
          className="fixed z-[95] border-2 border-saffron bg-paper p-5 shadow-lift outline-none"
          style={{ width: cardW, borderRadius: '22px 9px 24px 11px' }}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal">
              Step {step + 1} of {TOUR_STEPS}
            </p>
            <button type="button" onClick={exit} className="-mr-1 -mt-1 grid h-9 w-9 place-items-center rounded-full text-pine/60 hover:bg-pine/10 hover:text-pine" aria-label="Exit the demo (Esc)">
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M2 2l8 8M10 2l-8 8" />
              </svg>
            </button>
          </div>
          <h2 className="mt-1 text-[26px] font-black leading-[1.05] tracking-[-0.03em]">{cur.title}</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-pine/85">{cur.body({ demo })}</p>

          {step === 3 && !isRaviDone && (
            <Button variant="saffron" onClick={applyFix} className="mt-3 !min-h-12 w-full font-bold">
              Apply Ravi's fix
            </Button>
          )}

          <div className="mt-4 flex items-center justify-between gap-2">
            <div className="flex gap-1.5" aria-hidden="true">
              {Array.from({ length: TOUR_STEPS }, (_, i) => (
                <span key={i} className={`h-2 rounded-full transition-all ${i === step ? 'w-6 bg-saffron' : i < step ? 'w-2 bg-teal' : 'w-2 bg-pine/20'}`} />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={back} disabled={step === 0} className="!min-h-11 !px-4 text-sm disabled:opacity-35">
                Back
              </Button>
              <Button variant="primary" onClick={next} className="!min-h-11 !px-5 text-sm">
                {last ? 'Finish' : 'Next'} <span aria-hidden="true">→</span>
              </Button>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t-2 border-dotted border-pine/20 pt-2.5 text-xs text-stone">
            <span>
              <kbd className="rounded bg-pine/10 px-1.5 py-0.5 font-sans font-semibold text-pine">←</kbd> <kbd className="rounded bg-pine/10 px-1.5 py-0.5 font-sans font-semibold text-pine">→</kbd> move · <kbd className="rounded bg-pine/10 px-1.5 py-0.5 font-sans font-semibold text-pine">Esc</kbd> exit
            </span>
            <button type="button" onClick={start} className="min-h-9 px-1 font-semibold text-forest underline decoration-saffron decoration-2 underline-offset-2">
              Reset and restart
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
