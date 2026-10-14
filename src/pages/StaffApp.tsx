import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState, type ComponentType, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { Topo } from '../components/Marks'
import GrowScreen from '../components/phone/GrowScreen'
import MoodScreen from '../components/phone/MoodScreen'
import MyShifts from '../components/phone/MyShifts'
import PhoneFrame from '../components/phone/PhoneFrame'
import { GrowIcon, MoodIcon, SeasonsIcon, ShiftsIcon, SwapIcon } from '../components/phone/PhoneIcons'
import SeasonScreen from '../components/phone/SeasonScreen'
import SwapScreen from '../components/phone/SwapScreen'
import type { ScreenProps } from '../components/phone/types'
import RiskRing, { BandChip } from '../components/risk/RiskRing'
import { Card, SectionTitle, Tag, spring } from '../components/ui'
import { getDemo } from '../lib/demo'
import { DEMO_NOW, managerUpdates } from '../lib/staffApp'
import { firstNameL, makeT, type Lang, type TextKey } from '../lib/staffText'
import { getOverlay } from '../lib/demo'
import { KIND_LABEL, dominantKind } from '../lib/riskView'
import { useApp } from '../store/useApp'

const PEOPLE = [
  { id: 'st-05', hint: 'Housekeeping · overworked' },
  { id: 'st-01', hint: 'Front Desk · short rests' },
  { id: 'st-10', hint: 'Kitchen · feeling stuck' },
]

type Tab = 'shifts' | 'swap' | 'mood' | 'grow' | 'seasons'
const TABS: { id: Tab; label: TextKey; Icon: ComponentType<{ size?: number }>; Screen: ComponentType<ScreenProps> }[] = [
  { id: 'shifts', label: 'tabShifts', Icon: ShiftsIcon, Screen: MyShifts },
  { id: 'swap', label: 'tabSwap', Icon: SwapIcon, Screen: SwapScreen },
  { id: 'mood', label: 'tabMood', Icon: MoodIcon, Screen: MoodScreen },
  { id: 'grow', label: 'tabGrow', Icon: GrowIcon, Screen: GrowScreen },
  { id: 'seasons', label: 'tabSeasons', Icon: SeasonsIcon, Screen: SeasonScreen },
]

/** The demo clock: starts at the sample "now" and ticks forward with real time. */
function useDemoNow(): number {
  const start = useRef(Date.now())
  const [now, setNow] = useState(DEMO_NOW)
  useEffect(() => {
    const id = window.setInterval(() => setNow(DEMO_NOW + (Date.now() - start.current)), 15_000)
    return () => window.clearInterval(id)
  }, [])
  return now
}

function LangToggle({ lang, onChange, compact = false }: { lang: Lang; onChange: (l: Lang) => void; compact?: boolean }) {
  return (
    <div role="radiogroup" aria-label="Language / भाषा" className="inline-flex gap-0.5 bg-mist p-0.5 ring-1 ring-forest/15" style={{ borderRadius: '12px 5px 12px 6px' }}>
      {(['en', 'hi'] as const).map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={lang === l}
          onClick={() => onChange(l)}
          lang={l}
          className={`${compact ? 'min-h-9 px-2.5 text-[13px]' : 'min-h-11 px-4 text-[15px]'} font-bold transition-colors ${lang === l ? 'bg-pine text-paper' : 'text-pine'}`}
          style={{ borderRadius: '9px 4px 9px 5px' }}
        >
          {l === 'en' ? 'English' : 'हिन्दी'}
        </button>
      ))}
    </div>
  )
}

export default function StaffApp() {
  const epoch = useApp((s) => s.epoch)
  return <StaffAppScreen key={epoch} />
}

function StaffAppScreen() {
  const reduce = useReducedMotion()
  const fixVersion = useApp((s) => s.fixVersion)
  const bumpFix = useApp((s) => s.bumpFix)
  const personId = useApp((s) => s.staffPersonId)
  const setPerson = useApp((s) => s.setStaffPerson)
  const lang = useApp((s) => s.lang)
  const setLang = useApp((s) => s.setLang)
  const [tab, setTab] = useState<Tab>('shifts')
  const nowMs = useDemoNow()
  const scroller = useRef<HTMLDivElement>(null)

  const demo = useMemo(() => getDemo(), [fixVersion])
  const t = useMemo(() => makeT(lang), [lang])
  const idx = demo.people.findIndex((p) => p.id === personId)
  const person = demo.people[idx]
  const risk = demo.risks[idx]
  const Active = TABS.find((x) => x.id === tab)!.Screen

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 })
  }, [tab, personId])

  const mutate = (change: () => void) => {
    change()
    bumpFix()
  }
  const screenProps: ScreenProps = { demo, person, lang, t, nowMs, mutate }

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = TABS.findIndex((x) => x.id === tab)
    const n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null
    if (n === null) return
    e.preventDefault()
    const target = TABS[(n + TABS.length) % TABS.length]
    setTab(target.id)
    requestAnimationFrame(() => document.getElementById(`tab-${target.id}`)?.focus())
  }

  const mood = getOverlay().moods[person.id]
  const kind = dominantKind(risk.reasons)

  return (
    <div className="space-y-10">
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(230px,290px)_376px] lg:justify-center lg:gap-9 xl:grid-cols-[minmax(230px,290px)_376px_minmax(260px,1fr)] xl:justify-stretch">
        {/* ---------- left: who and what to try ---------- */}
        <div className="lg:order-1">
          <SectionTitle eyebrow="What your team sees">Staff app</SectionTitle>
          <p className="-mt-2 text-[15px] leading-relaxed text-pine/80">The same roster and the same facts, on a phone, in English or Hindi. Pick a person and try it.</p>

          <div role="radiogroup" aria-label="Whose phone" className="mt-5 space-y-2">
            {PEOPLE.map((p) => {
              const on = personId === p.id
              const who = demo.people.find((x) => x.id === p.id)!
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setPerson(p.id)}
                  className={`relative flex min-h-14 w-full items-center gap-3 px-3.5 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-saffron ${on ? 'text-paper' : 'border border-pine/10 bg-white/60 text-pine hover:bg-white'}`}
                  style={{ borderRadius: on ? '20px 8px 22px 10px' : '10px 18px 10px 18px' }}
                >
                  {on && <motion.span layoutId="staff-person" transition={spring} className="absolute inset-0 bg-pine shadow-lift" style={{ borderRadius: 'inherit' }} />}
                  <span className={`relative grid h-10 w-10 shrink-0 place-items-center font-display text-lg font-black ${on ? 'bg-saffron text-pine' : 'bg-mist text-forest'}`} style={{ borderRadius: '12px 5px 12px 6px' }}>
                    {who.name.charAt(0)}
                  </span>
                  <span className="relative">
                    <span className="block text-[16px] font-bold leading-tight">{who.name}</span>
                    <span className={`block text-[12.5px] ${on ? 'text-mist/80' : 'text-stone'}`}>{p.hint}</span>
                    {(managerUpdates(demo, p.id).length > 0 || demo.changes.some((c) => c.staffId === p.id)) && (
                      <span className="mt-1 inline-block bg-saffron px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-pine" style={{ borderRadius: '5px 2px 5px 3px' }}>
                        Updated by a manager
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-5 flex items-center gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal">Language</span>
            <LangToggle lang={lang} onChange={setLang} />
          </div>

          <div className="mt-7 hidden lg:block">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal">Things to try</p>
            <ol className="mt-2 space-y-2 text-[14px] leading-snug text-pine/80">
              <li>
                <strong>Ravi:</strong> apply his fix on <Link to="/at-risk" className="font-semibold text-forest underline decoration-saffron decoration-2 underline-offset-2">People at risk</Link>, then come back. His weekly off is fixed here.
              </li>
              <li>
                <strong>Swap</strong> a shift and watch the <Link to="/roster" className="font-semibold text-forest underline decoration-saffron decoration-2 underline-offset-2">roster</Link> change.
              </li>
              <li>
                <strong>Check in</strong> with a mood, or <strong>finish a course</strong>, and watch the manager's signal move.
              </li>
            </ol>
          </div>
        </div>

        {/* ---------- middle: the phone ---------- */}
        <div className="lg:order-2" data-tour="phone">
          <PhoneFrame lang={lang}>
            <header className="flex shrink-0 items-center justify-between gap-2 px-5 pb-2 pt-1">
              <p className="min-w-0 font-display text-[19px] font-black leading-tight">{t('hello', { name: firstNameL(person.name, lang) })}</p>
              <LangToggle lang={lang} onChange={setLang} compact />
            </header>

            <div ref={scroller} role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-2">
              <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
                <Topo opacity={0.08} />
              </div>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`${tab}-${person.id}`}
                  className="relative"
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                >
                  <Active {...screenProps} />
                </motion.div>
              </AnimatePresence>
            </div>

            <div role="tablist" aria-label="App sections" onKeyDown={onTabKey} className="mx-3 mb-4 mt-1 flex shrink-0 items-stretch justify-between bg-pine px-1 py-1 text-paper" style={{ borderRadius: '24px 12px 26px 14px' }}>
              {TABS.map(({ id, label, Icon }) => {
                const on = id === tab
                return (
                  <button
                    key={id}
                    id={`tab-${id}`}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    aria-controls={`panel-${id}`}
                    tabIndex={on ? 0 : -1}
                    onClick={() => setTab(id)}
                    className="relative flex min-h-[58px] flex-1 flex-col items-center justify-center gap-0.5 px-0.5 outline-none focus-visible:ring-2 focus-visible:ring-saffron"
                    style={{ borderRadius: '16px 7px 16px 9px' }}
                  >
                    {on && <motion.span layoutId="phone-tab" transition={spring} className="absolute inset-0 bg-paper/14" style={{ borderRadius: 'inherit' }} />}
                    <span className={`relative ${on ? 'text-saffron' : 'text-mist/70'}`}>
                      <Icon size={25} />
                    </span>
                    <span className={`relative text-[10.5px] font-semibold leading-tight ${on ? 'text-paper' : 'text-mist/70'}`}>{t(label)}</span>
                  </button>
                )
              })}
            </div>
          </PhoneFrame>
        </div>

        {/* ---------- right: what the manager sees ---------- */}
        <aside aria-label="What the manager sees" className="lg:order-3 lg:col-span-2 xl:col-span-1">
          <Card tilt={0.6} className="relative overflow-hidden">
            <Topo opacity={0.12} />
            <div className="relative">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal">Behind the scenes</p>
                  <p className="font-display text-xl font-black leading-tight">What the manager sees</p>
                </div>
                <Tag tone="saffron" tilt={2}>Sample data</Tag>
              </div>
              <div className="mt-4 flex items-center gap-4">
                <RiskRing score={risk.score} id={person.id} size={92} />
                <div>
                  <BandChip band={risk.band} />
                  <p className="mt-1.5 text-[15px] font-bold leading-tight">{person.name}</p>
                  <p className="text-xs text-stone">{kind ? KIND_LABEL[kind] : 'Nothing flagged'}</p>
                </div>
              </div>
              <ul className="mt-4 space-y-1.5 text-[13.5px] leading-snug text-pine/85">
                {risk.reasons.map((r) => (
                  <li key={r.factor} className="flex justify-between gap-3">
                    <span>{r.text}</span>
                    <span className="shrink-0 font-bold text-stone">+{r.points}</span>
                  </li>
                ))}
                {risk.reasons.length === 0 && <li>Nothing flagged. Regular offs, steady feedback.</li>}
              </ul>
              <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 border-t-2 border-dotted border-pine/20 pt-3 text-[13px]">
                <div>
                  <dt className="text-stone">Latest check-in</dt>
                  <dd className="font-semibold">{mood ? `${mood.score} of 5` : 'None yet'}</dd>
                </div>
                <div>
                  <dt className="text-stone">Swaps live</dt>
                  <dd className="font-semibold">{demo.swaps.filter((s) => s.aId === person.id || s.bId === person.id).length}</dd>
                </div>
                <div>
                  <dt className="text-stone">Fixes applied</dt>
                  <dd className="font-semibold">{demo.applied.filter((a) => a.fix.staffId === person.id).length}</dd>
                </div>
                <div>
                  <dt className="text-stone">Skills held</dt>
                  <dd className="font-semibold">{person.skills.length}</dd>
                </div>
              </dl>
              <p className="mt-4 text-[12.5px] leading-snug text-stone">
                A check-in becomes the newest feedback point, and a finished course becomes a new skill: both feed the stagnation signal. See the full picture on{' '}
                <Link to="/at-risk" className="font-semibold text-forest underline decoration-saffron decoration-2 underline-offset-2">
                  People at risk
                </Link>
                .
              </p>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  )
}
