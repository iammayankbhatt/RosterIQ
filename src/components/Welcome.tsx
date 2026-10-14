import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { useTour } from '../store/useTour'
import { HandUnderline, Logo, Topo } from './Marks'
import { Button, Tag } from './ui'

/** First-load welcome: the one screen a judge sees before anything else. */
export default function Welcome() {
  const reduce = useReducedMotion()
  const open = useTour((s) => s.welcomeOpen)
  const dismiss = useTour((s) => s.dismissWelcome)
  const start = useTour((s) => s.start)
  const btn = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) btn.current?.focus()
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="welcome"
          role="dialog"
          aria-modal="true"
          aria-labelledby="welcome-title"
          className="fixed inset-0 z-[120] grid place-items-center overflow-y-auto bg-pine px-5 py-10 text-paper"
          initial={false}
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.03, filter: 'blur(6px)' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <Topo stroke="var(--teal)" opacity={0.55} />
          <div className="relative mx-auto flex w-full max-w-2xl flex-col items-center text-center">
            <motion.div initial={reduce ? false : { scale: 0.6, rotate: -8, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 14, delay: 0.1 }}>
              <Logo size={96} />
            </motion.div>
            <motion.p
              className="mt-4 font-display text-[34px] font-black leading-none tracking-[-0.03em]"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Roster<span className="text-saffron">IQ</span>
            </motion.p>
            <motion.h1
              id="welcome-title"
              className="mt-8 text-[clamp(2.4rem,7vw,4.6rem)] font-black leading-[0.98] tracking-[-0.04em] !text-paper"
              initial={reduce ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 120, damping: 20, delay: 0.45 }}
            >
              Every season fully staffed.
              <span className="mt-1 block italic text-saffron">Every rupee saved.</span>
            </motion.h1>
            <HandUnderline className="mt-3 h-3 w-48" />
            <motion.div className="mt-9 flex flex-col items-center gap-3" initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
              <Button ref={btn} variant="saffron" onClick={dismiss} className="!min-h-14 !px-12 font-display text-xl font-black">
                Start
              </Button>
              <button type="button" onClick={start} className="min-h-11 px-3 text-[15px] font-semibold text-mist/90 underline decoration-saffron decoration-2 underline-offset-4 hover:text-paper">
                or take the guided demo <span className="text-mist/60">(press D any time)</span>
              </button>
            </motion.div>
            <motion.div className="mt-12 flex flex-wrap items-center justify-center gap-3 text-sm text-mist/85" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}>
              <span className="font-semibold tracking-wide">Team Samlaun (AI-021)</span>
              <span aria-hidden="true">·</span>
              <span>AI-Tourism Hackathon 2026</span>
              <Tag tone="saffron" dark tilt={-2}>Sample data</Tag>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
