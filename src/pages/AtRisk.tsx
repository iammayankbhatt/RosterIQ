import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { recommendFix, type Fix, type RiskFactor } from '../engine'
import { StatusDot, Topo } from '../components/Marks'
import RiskRing, { BandChip } from '../components/risk/RiskRing'
import Timeline from '../components/risk/Timeline'
import TrustPanel from '../components/risk/TrustPanel'
import { Button, Card, SectionTitle, Tag, spring } from '../components/ui'
import { applyDemoFix, getDemo, undoDemoFix } from '../lib/demo'
import {
  KIND_LABEL,
  buildTimeline,
  describeOutcome,
  evidenceFor,
  headline,
  matchesFilter,
  rankPeople,
  scoredRoster,
  type Outcome,
  type RankedPerson,
  type RiskFilter,
} from '../lib/riskView'
import { useApp } from '../store/useApp'

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const first = (name: string) => name.split(' ')[0]

const FACTOR_WORD: Record<RiskFactor, string> = {
  'no-weekly-off': 'weekly offs',
  overtime: 'overtime',
  'late-nights': 'late nights',
  'short-rest': 'rest between shifts',
  'leave-ignored': 'leave',
  'no-skill-growth': 'skills',
  'feedback-falling': 'feedback',
}

const FILTERS: { id: RiskFilter; label: string }[] = [
  { id: 'all', label: 'Everyone' },
  { id: 'burnout', label: 'Burnout' },
  { id: 'stagnation', label: 'Stagnation' },
]

type Notice = { kind: 'applied'; outcome: Outcome; name: string } | { kind: 'undone'; text: string }

export default function AtRisk() {
  const epoch = useApp((s) => s.epoch)
  return <AtRiskScreen key={epoch} />
}

function AtRiskScreen() {
  const reduce = useReducedMotion()
  const fixVersion = useApp((s) => s.fixVersion)
  const bumpFix = useApp((s) => s.bumpFix)
  const demo = useMemo(() => getDemo(), [fixVersion])
  const ranked = useMemo(() => rankPeople(demo), [demo])

  const [filter, setFilter] = useState<RiskFilter>('all')
  const [selectedId, setSelectedId] = useState(() => rankPeople(getDemo())[0].person.id)
  const [showSteady, setShowSteady] = useState(false)
  const [working, setWorking] = useState<Fix['kind'] | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [flow, setFlow] = useState(0)
  const [changed, setChanged] = useState<Set<string>>(new Set())
  const detailRef = useRef<HTMLDivElement>(null)
  const riskFocus = useApp((s) => s.riskFocus)
  // the guided tour can ask for someone to be opened
  useEffect(() => {
    if (riskFocus) {
      setFilter('all')
      setSelectedId(riskFocus.id)
    }
  }, [riskFocus])

  const visible = useMemo(() => ranked.filter((r) => matchesFilter(r.risk.reasons, filter)), [ranked, filter])
  const attention = visible.filter((r) => r.risk.band !== 'steady')
  const steady = visible.filter((r) => r.risk.band === 'steady')
  const highCount = ranked.filter((r) => r.risk.band === 'high').length
  const watchCount = ranked.filter((r) => r.risk.band === 'watch').length

  // keep the detail on someone who is actually in the list
  useEffect(() => {
    if (visible.length && !visible.some((r) => r.person.id === selectedId)) setSelectedId(visible[0].person.id)
  }, [visible, selectedId])

  const sel: RankedPerson = ranked.find((r) => r.person.id === selectedId) ?? ranked[0]
  const { person, risk, kind } = sel
  const basis = scoredRoster(demo, person.id)
  const weeks = useMemo(() => buildTimeline(person, demo.roster), [person, demo.roster])
  const fixes = useMemo(
    () => recommendFix(person, risk.reasons).filter((f) => !demo.applied.some((a) => a.fix.staffId === person.id && a.fix.kind === f.kind)),
    [person, risk, demo.applied],
  )
  const lastApplied = demo.applied[demo.applied.length - 1]

  const select = (id: string) => {
    setSelectedId(id)
    if (window.matchMedia('(max-width: 1023px)').matches) {
      requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }))
    }
  }

  const apply = async (fix: Fix) => {
    if (working) return
    setWorking(fix.kind)
    setNotice(null)
    await sleep(reduce ? 150 : 1000) // a beat of "re-flowing" before the change lands
    const outcome = describeOutcome(applyDemoFix(fix))
    bumpFix()
    setChanged(new Set(outcome.changedDates))
    setFlow((n) => n + 1)
    setNotice({ kind: 'applied', outcome, name: demo.people.find((p) => p.id === fix.staffId)!.name })
    setSelectedId(fix.staffId)
    setWorking(null)
  }

  const undo = () => {
    const u = undoDemoFix()
    if (!u) return
    bumpFix()
    setChanged(new Set())
    setFlow((n) => n + 1)
    const who = u.prev.people.find((p) => p.id === u.undone.fix.staffId)!
    const was = u.prev.risks[u.prev.people.findIndex((p) => p.id === who.id)]
    setNotice({ kind: 'undone', text: `Back to how it was. ${first(who.name)}'s workload risk is ${was.score} again.` })
    setSelectedId(who.id)
  }

  return (
    <div className="space-y-10 sm:space-y-12">
      {/* ---------- title ---------- */}
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div className="max-w-2xl">
          <SectionTitle eyebrow="Early warnings, with a kind fix">People at risk</SectionTitle>
          <p className="-mt-2 text-[17px] leading-relaxed text-pine/80">
            {highCount + watchCount === 0
              ? 'Everyone looks rested and on track.'
              : `${highCount ? `${highCount} ${highCount === 1 ? 'person is' : 'people are'} carrying too much right now` : 'Nobody is at high risk'}${watchCount ? `, and ${watchCount} more ${watchCount === 1 ? 'is' : 'are'} worth a quiet look` : ''}. Pick a name to see why, and what would help.`}
          </p>
        </div>
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div role="radiogroup" aria-label="Kind of risk" className="flex items-center gap-1 bg-mist p-1 ring-1 ring-forest/10" style={{ borderRadius: '16px 7px 16px 9px' }}>
            {FILTERS.map((f) => {
              const on = filter === f.id
              const n = ranked.filter((r) => r.risk.band !== 'steady' && matchesFilter(r.risk.reasons, f.id)).length
              return (
                <button
                  key={f.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setFilter(f.id)}
                  className="relative px-3.5 py-1.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-saffron"
                  style={{ borderRadius: '12px 5px 12px 7px' }}
                >
                  {on && <motion.span layoutId="risk-filter" transition={spring} className="absolute inset-0 bg-pine" style={{ borderRadius: 'inherit' }} />}
                  <span className={`relative ${on ? 'text-paper' : 'text-pine'}`}>
                    {f.label} <span className={`text-xs font-bold ${on ? 'text-saffron' : 'text-stone'}`}>{n}</span>
                  </span>
                </button>
              )
            })}
          </div>
          <Button variant="ghost" onClick={undo} disabled={!lastApplied || !!working} className="!min-h-10 !px-4 text-sm disabled:opacity-40" aria-label={lastApplied ? `Undo: ${lastApplied.fix.title}` : 'Nothing to undo'}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 9h11a5 5 0 0 1 0 10H8M4 9l4-4M4 9l4 4" />
            </svg>
            Undo
          </Button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {notice && (notice.kind === 'undone' || notice.outcome.staffId !== selectedId) && (
          <motion.div key="top-notice" initial={reduce ? false : { opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {notice.kind === 'undone' ? (
              <p role="status" className="border-l-[3px] border-teal bg-mist px-4 py-3 text-[15px]" style={{ borderRadius: '4px 14px 14px 4px' }}>
                {notice.text}
              </p>
            ) : (
              <Confirmation outcome={notice.outcome} name={notice.name} onUndo={undo} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(290px,370px)_minmax(0,1fr)] lg:gap-10">
        {/* ---------- ranked list ---------- */}
        <div>
          <h2 className="sr-only">Ranked by workload risk</h2>
          <ul className="space-y-2.5" aria-label="People ranked by workload risk, highest first">
            {attention.map((r, i) => (
              <PersonRow key={r.person.id} r={r} rank={i + 1} selected={r.person.id === selectedId} onSelect={select} reduce={!!reduce} />
            ))}
            {attention.length === 0 && (
              <li className="border border-dashed border-teal/40 p-4 text-sm text-pine/80" style={{ borderRadius: '14px 6px 14px 8px' }}>
                Nobody in this view needs attention. That is a good sign.
              </li>
            )}
          </ul>
          {steady.length > 0 && (
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setShowSteady((s) => !s)}
                aria-expanded={showSteady}
                className="flex w-full items-center justify-between border-b-2 border-dotted border-pine/25 pb-1.5 text-left text-sm font-bold text-forest outline-none focus-visible:ring-2 focus-visible:ring-saffron"
              >
                <span>{showSteady ? 'Hide' : 'Show'} the steady ones ({steady.length})</span>
                <span aria-hidden="true" className={`transition-transform ${showSteady ? 'rotate-180' : ''}`}>
                  ▾
                </span>
              </button>
              {showSteady && (
                <ul className="mt-3 space-y-2" aria-label="Steady people">
                  {steady.map((r) => (
                    <PersonRow key={r.person.id} r={r} selected={r.person.id === selectedId} onSelect={select} reduce={!!reduce} />
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* ---------- detail ---------- */}
        <div ref={detailRef} id="risk-detail" className="scroll-mt-4" aria-live="polite">
          <Card tilt={-0.3} className="relative !p-5 sm:!p-7" style={{ borderRadius: '34px 12px 38px 14px' }}>
            <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ borderRadius: 'inherit' }}>
              <Topo opacity={0.12} />
            </div>
            <div className="relative">
              {/* who and how they are */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
                <RiskRing score={risk.score} id={person.id} size={116} />
                <div className="min-w-0 flex-1 basis-64">
                  <div className="flex flex-wrap items-center gap-2">
                    <BandChip band={risk.band} big />
                    {kind && <Tag tone="stone">{KIND_LABEL[kind]}</Tag>}
                    <Tag tone="saffron" tilt={2}>Sample person</Tag>
                  </div>
                  <h2 className="mt-2 text-4xl font-black leading-[0.95] tracking-[-0.03em] sm:text-5xl">{person.name}</h2>
                  <p className="mt-1 text-sm font-medium text-stone">
                    {person.role} · {person.department}
                  </p>
                </div>
              </div>
              <p className="mt-5 max-w-2xl border-l-[3px] border-saffron pl-4 font-display text-[19px] font-semibold leading-snug text-pine sm:text-[21px]">{headline(person, risk, kind)}</p>

              {/* evidence */}
              <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
                <section aria-label={`${first(person.name)}'s last six weeks and the next two`}>
                  <h3 className="mb-3 font-display text-2xl font-black tracking-[-0.02em]">The pattern</h3>
                  <Timeline weeks={weeks} changed={changed} flow={flow} working={!!working} />
                </section>

                <section aria-label="Why this score" data-tour="risk-reasons">
                  <h3 className="mb-3 font-display text-2xl font-black tracking-[-0.02em]">What we noticed</h3>
                  {risk.reasons.length === 0 ? (
                    <p className="text-[15px] text-pine/80">Nothing flagged. Regular offs, sensible hours, steady feedback.</p>
                  ) : (
                    <ol className="space-y-4">
                      {risk.reasons.map((r, i) => (
                        <li key={r.factor} className="flex gap-3">
                          <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center bg-pine font-display text-sm font-black text-saffron" style={{ borderRadius: i % 2 ? '9px 4px 9px 5px' : '4px 9px 5px 9px' }}>
                            {i + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="flex flex-wrap items-baseline gap-x-2">
                              <span className="font-display text-[17px] font-bold leading-snug">{r.text}</span>
                              <span className="text-xs font-bold text-stone">+{r.points} points</span>
                            </p>
                            <ul className="mt-1 space-y-0.5">
                              {evidenceFor(person, basis, r, risk.asOf).map((line, k) => (
                                <li key={k} className="text-[13.5px] leading-snug text-pine/75">
                                  {line}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
              </div>

              {/* action */}
              <div data-tour="apply-action" className="mt-8 lg:sticky lg:bottom-4 lg:z-20">
                {notice?.kind === 'applied' && notice.outcome.staffId === person.id ? (
                  <Confirmation outcome={notice.outcome} name={notice.name} onUndo={undo} />
                ) : (
                  <ActionCard person={person.name} fixes={fixes} working={working} onApply={apply} band={risk.band} />
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <TrustPanel />
    </div>
  )
}

/* ---------------- Ranked row ---------------- */

function PersonRow({ r, rank, selected, onSelect, reduce }: { r: RankedPerson; rank?: number; selected: boolean; onSelect: (id: string) => void; reduce: boolean }) {
  const top = r.risk.reasons[0]
  return (
    <motion.li layout={!reduce} transition={spring}>
      <button
        type="button"
        onClick={() => onSelect(r.person.id)}
        aria-current={selected ? 'true' : undefined}
        aria-label={`${r.person.name}, workload risk ${r.risk.score}, ${r.risk.band}${top ? `. ${top.text}` : ''}`}
        className={`group flex w-full items-center gap-3 border p-3 text-left outline-none transition-all focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 ${
          selected ? 'border-pine/70 bg-white shadow-lift' : 'border-pine/10 bg-white/55 shadow-warm hover:-translate-y-0.5 hover:bg-white/80'
        }`}
        style={{ borderRadius: selected ? '20px 8px 22px 10px' : '10px 18px 10px 18px', rotate: selected ? '-0.5deg' : undefined }}
      >
        {rank !== undefined && <span className="w-4 shrink-0 text-center font-display text-sm font-black text-stone">{rank}</span>}
        <RiskRing score={r.risk.score} id={r.person.id} size={54} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-[15.5px] font-bold">{r.person.name}</span>
            <BandChip band={r.risk.band} />
          </span>
          <span className="block truncate text-xs text-stone">
            {r.person.role}
            {r.kind && r.risk.band !== 'steady' ? ` · ${KIND_LABEL[r.kind]}` : ''}
          </span>
          {top && <span className="mt-0.5 line-clamp-1 block text-[12.5px] text-pine/75">{top.text}</span>}
        </span>
      </button>
    </motion.li>
  )
}

/* ---------------- Suggested action ---------------- */

function ActionCard({ person, fixes, working, onApply, band }: { person: string; fixes: Fix[]; working: Fix['kind'] | null; onApply: (f: Fix) => void; band: string }) {
  const name = first(person)
  if (fixes.length === 0) {
    return (
      <div className="border border-teal/30 bg-mist p-5" style={{ borderRadius: '22px 9px 24px 11px' }}>
        <p className="font-display text-xl font-bold">{band === 'steady' ? `Nothing to fix for ${name}.` : `Everything we can suggest for ${name} is already in motion.`}</p>
        <p className="mt-1 text-sm text-pine/75">{band === 'steady' ? 'A thank-you never hurts.' : 'Past weeks stay on the record, so the score eases over time rather than vanishing. Keep an eye on weekly offs.'}</p>
      </div>
    )
  }
  const [main, ...others] = fixes
  const busy = working === main.kind
  return (
    <div className="relative border-2 border-saffron/70 bg-[#fdf1da] p-5 shadow-lift sm:p-6" style={{ borderRadius: '24px 10px 28px 12px' }}>
      <span className="absolute -top-3 left-5 rotate-[-2deg] bg-pine px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.2em] text-saffron" style={{ borderRadius: '6px 2px 6px 3px' }}>
        Suggested for {name}
      </span>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 flex-1 basis-72">
          <p className="font-display text-[23px] font-black leading-tight tracking-[-0.02em]">{main.title}</p>
          <p className="mt-1.5 text-[14.5px] leading-relaxed text-pine/85">{main.action}</p>
          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-pine/75">
            Eases:
            {main.addresses.map((a) => (
              <span key={a} className="bg-pine/10 px-1.5 py-0.5 font-semibold" style={{ borderRadius: '5px 2px 5px 3px' }}>
                {FACTOR_WORD[a]}
              </span>
            ))}
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-1.5 sm:items-end">
          <Button data-tour="apply-fix" variant="primary" onClick={() => onApply(main)} disabled={!!working} aria-busy={busy} className="!min-h-14 !px-8 font-display text-xl font-black disabled:cursor-wait">
            {busy ? (
              <>
                <motion.span aria-hidden="true" animate={{ rotate: [0, -10, 10, 0] }} transition={{ repeat: Infinity, duration: 0.8 }}>
                  <StatusDot tone="watch" size={18} />
                </motion.span>
                Re-flowing the roster…
              </>
            ) : (
              <>
                Apply this fix <span aria-hidden="true">→</span>
              </>
            )}
          </Button>
          <p className="text-[11.5px] text-pine/70 sm:text-right">Nothing is sent to anyone, and you can undo it.</p>
        </div>
      </div>
      {others.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t-2 border-dotted border-saffron/60 pt-3">
          <span className="text-xs font-bold uppercase tracking-wider text-pine/70">Also possible</span>
          {others.map((f) => (
            <button
              key={f.kind}
              type="button"
              onClick={() => onApply(f)}
              disabled={!!working}
              className="bg-white/70 px-3 py-1.5 text-[13px] font-semibold ring-1 ring-pine/20 transition-colors hover:bg-white disabled:opacity-50"
              style={{ borderRadius: '10px 4px 10px 5px' }}
            >
              {f.title}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------------- Confirmation ---------------- */

function Confirmation({ outcome, name, onUndo }: { outcome: Outcome; name: string; onUndo: () => void }) {
  const reduce = useReducedMotion()
  const moved = outcome.shiftsBefore !== outcome.shiftsAfter
  return (
    <motion.section
      role="status"
      aria-label="What just changed"
      initial={reduce ? false : { opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...spring, delay: reduce ? 0 : 0.5 }}
      className="relative border-2 border-teal/40 bg-mist p-5 shadow-lift sm:p-6"
      style={{ borderRadius: '24px 10px 28px 12px' }}
    >
      <div className="flex items-start gap-3">
        <span className="mt-1 shrink-0">
          <StatusDot tone="ok" size={26} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[22px] font-black leading-tight tracking-[-0.02em]">{outcome.headline}</p>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px]">
            <span className="font-semibold">{first(name)}'s workload risk</span>
            <span className="font-display text-xl font-black">{outcome.scoreBefore}</span>
            <span aria-hidden="true">→</span>
            <span className="font-display text-xl font-black">{outcome.scoreAfter}</span>
            <BandChip band={outcome.bandBefore} />
            <span aria-hidden="true">→</span>
            <BandChip band={outcome.bandAfter} />
          </p>

          {outcome.eased.length > 0 && (
            <ul className="mt-3 space-y-1.5 text-[14px]">
              {outcome.eased.map((e) => (
                <li key={e.before} className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-pine/60 line-through decoration-terracotta/60">{e.before}</span>
                  <span aria-hidden="true">→</span>
                  <span className="font-semibold text-forest">{e.after ?? 'gone from the plan'}</span>
                </li>
              ))}
            </ul>
          )}
          {moved && (
            <p className="mt-2 text-[14px]">
              Planned shifts over the next two weeks: <strong>{outcome.shiftsBefore}</strong> → <strong>{outcome.shiftsAfter}</strong>.
            </p>
          )}
          {outcome.covers.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {outcome.covers.map((c) => (
                <li key={c} className="bg-white/75 px-2.5 py-1.5 text-[12.5px] leading-snug ring-1 ring-teal/25" style={{ borderRadius: '10px 4px 10px 5px' }}>
                  {c}
                </li>
              ))}
            </ul>
          )}
          {outcome.bandAfter !== 'steady' && outcome.fixKind !== 'recognition' && outcome.fixKind !== 'skill-course' && (
            <p className="mt-3 text-[13px] leading-snug text-pine/70">Past weeks stay on the record, so the score eases rather than disappears. It keeps falling as the new pattern holds.</p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button variant="ghost" onClick={onUndo} className="!min-h-10 !px-4 text-sm">
              Undo
            </Button>
            {outcome.changedDates.length > 0 && (
              <Link to="/roster" onClick={() => useApp.getState().focusRoster(outcome.changedDates[0])} className="text-sm font-semibold text-forest">
                <span className="border-b-2 border-saffron pb-px">See it on the roster</span> →
              </Link>
            )}
            <Link to="/staff-app" onClick={() => useApp.getState().setStaffPerson(outcome.staffId)} className="text-sm font-semibold text-forest">
              <span className="border-b-2 border-saffron pb-px">See it on {first(name)}'s phone</span> →
            </Link>
          </div>
        </div>
      </div>
    </motion.section>
  )
}
