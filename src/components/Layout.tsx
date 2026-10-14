import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { NavLink, useLocation, useOutlet } from 'react-router-dom'
import { getDemo, isDemoWarm } from '../lib/demo'
import { useTour } from '../store/useTour'
import { useApp, seasons } from '../store/useApp'
import { DeodarIcon, Logo, Topo } from './Marks'
import { ResetIcon, navItems } from './NavIcons'
import PageLoading from './PageLoading'
import SampleBadge from './SampleBadge'
import Tour from './Tour'
import Welcome from './Welcome'
import { Tag, spring } from './ui'

/** Slim rail on tablet/desktop, a floating tab strip on phones. */
function Rail() {
  const resetDemo = useApp((s) => s.resetDemo)
  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 hidden w-[92px] print:!hidden flex-col items-center bg-pine py-5 text-paper md:flex"
      style={{ borderRadius: '0 30px 18px 0 / 0 44px 26px 0' }}
    >
      <Topo stroke="var(--teal)" opacity={0.5} className="rounded-[inherit]" />
      <NavLink to="/" aria-label="RosterIQ home" className="relative z-10 mb-7">
        <Logo size={42} />
      </NavLink>
      <nav className="relative z-10 flex flex-1 flex-col items-center gap-2" aria-label="Main">
        {navItems.map(({ to, label, short, Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} aria-label={label} className="group relative block w-[72px]">
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="rail-active"
                    transition={spring}
                    className="absolute inset-0 bg-paper/12"
                    style={{ borderRadius: '16px 7px 16px 9px' }}
                  />
                )}
                {isActive && <span className="absolute -left-[10px] top-1/2 h-7 w-[5px] -translate-y-1/2 rounded-r-full bg-saffron" />}
                <span
                  className={`relative flex flex-col items-center gap-1 px-1 py-2.5 text-[10.5px] font-medium leading-tight transition-colors ${
                    isActive ? 'text-paper' : 'text-mist/60 group-hover:text-paper'
                  }`}
                  title={label}
                >
                  <span className={isActive ? 'text-saffron' : ''}>
                    <Icon size={24} />
                  </span>
                  {short}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="relative z-10 flex flex-col items-center gap-3">
        <DeodarIcon size={18} className="text-forest" />
        <button
          onClick={resetDemo}
          className="flex items-center gap-1 rounded-chip px-2 py-1.5 text-[10px] font-medium text-mist/50 transition-colors hover:bg-paper/10 hover:text-paper"
          title="Put the sample data back the way it started"
        >
          <ResetIcon size={12} />
          Reset demo
        </button>
      </div>
    </aside>
  )
}

function TabBar() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-3 bottom-3 z-40 flex items-stretch justify-between bg-pine/95 px-1.5 py-1.5 text-paper shadow-lift md:hidden print:!hidden"
      style={{ borderRadius: '24px 12px 26px 14px' }}
    >
      {navItems.map(({ to, label, short, Icon }) => (
        <NavLink key={to} to={to} end={to === '/'} aria-label={label} className="relative flex-1">
          {({ isActive }) => (
            <span
              className={`flex flex-col items-center gap-0.5 rounded-[14px_6px_14px_8px] px-1 py-2 text-[10px] font-medium ${
                isActive ? 'bg-paper/12 text-paper' : 'text-mist/60'
              }`}
            >
              <span className={isActive ? 'text-saffron' : ''}>
                <Icon size={22} />
              </span>
              {short}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

/** Hotel sign and season switcher: a hung signboard instead of a top bar. */
function Signboard() {
  const { seasonId, setSeason } = useApp()
  const startTour = useTour((s) => s.start)
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 print:!hidden">
      <div className="relative -rotate-1 pt-3">
        <span className="absolute left-5 top-0 h-3 w-px bg-stone/60" />
        <span className="absolute right-5 top-0 h-3 w-px bg-stone/60" />
        <div
          className="flex items-center gap-3 border border-pine/15 bg-white/75 px-4 py-2.5 shadow-warm"
          style={{ borderRadius: '16px 7px 18px 9px' }}
        >
          <DeodarIcon size={20} className="text-forest" />
          <div className="leading-tight">
            <p className="font-display text-lg font-semibold text-pine">
              Deodar Heights <span className="text-[13px] font-medium text-stone">(sample hotel)</span>
            </p>
            <p className="text-xs text-stone">25 rooms · Mussoorie</p>
          </div>
          <Tag tone="teal" tilt={2}>
            Sample data
          </Tag>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={startTour}
          className="group inline-flex min-h-11 items-center gap-2 bg-saffron px-4 text-sm font-bold text-pine shadow-warm transition-transform hover:-translate-y-0.5 active:translate-y-0"
          style={{ borderRadius: '14px 6px 14px 8px' }}
          aria-keyshortcuts="D"
        >
          <svg width="13" height="14" viewBox="0 0 13 14" aria-hidden="true">
            <path d="M1.6 1.4 11.6 7 1.6 12.6z" fill="currentColor" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
          Start demo
          <kbd className="hidden rounded bg-pine/15 px-1.5 py-0.5 font-sans text-[11px] font-bold sm:inline">D</kbd>
        </button>
      <div role="radiogroup" aria-label="Season" className="flex items-center gap-1 rounded-[16px_7px_16px_9px] bg-mist p-1 ring-1 ring-forest/10">
        {seasons.map((s) => {
          const on = s.id === seasonId
          return (
            <button
              key={s.id}
              role="radio"
              aria-checked={on}
              onClick={() => setSeason(s.id)}
              className="relative rounded-[12px_5px_12px_7px] px-3.5 py-1.5 text-left transition-colors"
            >
              {on && <motion.span layoutId="season-pill" transition={spring} className="absolute inset-0 bg-pine" style={{ borderRadius: '12px 5px 12px 7px' }} />}
              <span className={`relative block text-sm font-semibold ${on ? 'text-paper' : 'text-pine'}`}>{s.label}</span>
              <span className={`relative block text-[10.5px] ${on ? 'text-mist/70' : 'text-stone'}`}>{s.note}</span>
            </button>
          )
        })}
      </div>
      </div>
    </div>
  )
}

export default function Layout() {
  const loc = useLocation()
  const outlet = useOutlet()
  const reduce = useReducedMotion()
  const resetDemo = useApp((s) => s.resetDemo)
  // the first roster takes about a third of a second; show the welcome and a calm loader meanwhile
  const [ready, setReady] = useState(isDemoWarm)
  useEffect(() => {
    if (ready) return
    const id = window.setTimeout(() => {
      getDemo()
      setReady(true)
    }, 60)
    return () => window.clearTimeout(id)
  }, [ready])
  return (
    <div className="grain relative min-h-screen overflow-x-clip">
      <a href="#main" className="sr-only z-[130] bg-pine px-4 py-2 font-semibold text-paper focus:not-sr-only focus:fixed focus:left-3 focus:top-3" style={{ borderRadius: '10px 4px 10px 5px' }}>
        Skip to the page
      </a>
      <SampleBadge />
      <Welcome />
      <Tour />
      <Topo className="fixed print:hidden" opacity={0.1} />
      <Rail />
      <TabBar />
      <div className="relative z-10 md:pl-[92px] print:!pl-0">
        <div className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 md:pb-12 md:pt-8 print:!max-w-none print:!p-0">
          <Signboard />
          <AnimatePresence mode="wait" initial={false}>
            <motion.main
              id="main"
              tabIndex={-1}
              className="outline-none"
              key={loc.pathname}
              initial={reduce ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 210, damping: 28 }}
            >
              {ready ? outlet : <PageLoading />}
            </motion.main>
          </AnimatePresence>
          <footer className="mt-14 print:hidden flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-stone">
            <DeodarIcon size={14} className="text-teal" />
            <span>Samlaun (AI-021) · AI-Tourism Hackathon 2026 · Every name and figure here is sample data.</span>
            <button onClick={resetDemo} className="underline decoration-saffron decoration-2 underline-offset-2 md:hidden">
              Reset demo
            </button>
            <NavLink to="/seed" className="underline decoration-stone/40 underline-offset-2">
              Seed data
            </NavLink>
            <NavLink to="/kit" className="underline decoration-stone/40 underline-offset-2">
              Design kit
            </NavLink>
          </footer>
        </div>
      </div>
    </div>
  )
}
