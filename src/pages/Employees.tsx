import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { departments } from '../data'
import type { Department } from '../data/types'
import type { RiskBand } from '../engine'
import { Donut, HBars, Lines, WeeklyBars } from '../components/charts/Charts'
import { DeodarIcon } from '../components/Marks'
import RiskRing, { BandChip } from '../components/risk/RiskRing'
import EmployeeDetail from '../components/team/EmployeeDetail'
import { Button, CountUp, SectionTitle, Tag, spring } from '../components/ui'
import { getDemo } from '../lib/demo'
import { BAND_COLOUR, DEPT_COLOUR, SORTS, orgStats, personStats, sortValue, tenureLabel, toCsv, type PersonStats, type SortKey } from '../lib/employees'
import { formatINR, formatLakh } from '../lib/format'
import { BAND_LABEL, KIND_LABEL, dominantKind } from '../lib/riskView'
import { useApp } from '../store/useApp'

const dateShort = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' })

export default function Employees() {
  const epoch = useApp((s) => s.epoch)
  return <TeamDashboard key={epoch} />
}

/* ---------------- small pieces ---------------- */

function Panel({ title, sub, children, className = '', tilt = 0, tag }: { title: string; sub?: string; children: ReactNode; className?: string; tilt?: number; tag?: string }) {
  return (
    <section className={`relative border border-pine/10 bg-white/75 p-5 shadow-warm ${className}`} style={{ borderRadius: '24px 9px 26px 11px', rotate: `${tilt}deg` }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-[22px] font-black leading-tight tracking-[-0.025em]">{title}</h2>
          {sub && <p className="mt-0.5 text-[12.5px] leading-snug text-stone">{sub}</p>}
        </div>
        {tag && <Tag tone="saffron">{tag}</Tag>}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Kpi({ label, children, note, dark = false, tilt = 0 }: { label: string; children: ReactNode; note: ReactNode; dark?: boolean; tilt?: number }) {
  return (
    <div className={`relative flex flex-col justify-between gap-2 p-4 shadow-warm sm:p-5 ${dark ? 'bg-pine text-paper' : 'border border-pine/10 bg-white/80'}`} style={{ borderRadius: '20px 8px 22px 10px', rotate: `${tilt}deg` }}>
      <p className={`text-[11px] font-bold uppercase tracking-[0.16em] ${dark ? 'text-saffron' : 'text-teal'}`}>{label}</p>
      <p className="font-num text-[clamp(2rem,4vw,2.9rem)] font-black leading-none">{children}</p>
      <p className={`text-[12.5px] leading-snug ${dark ? 'text-mist/80' : 'text-stone'}`}>{note}</p>
    </div>
  )
}

function Chip({ on, onClick, children, count }: { on: boolean; onClick: () => void; children: ReactNode; count?: number }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`min-h-9 px-3 text-[13.5px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-saffron ${on ? 'bg-pine text-paper' : 'bg-white/70 ring-1 ring-inset ring-pine/15 hover:bg-white'}`}
      style={{ borderRadius: '11px 4px 11px 5px' }}
    >
      {children}
      {count !== undefined && <span className={`ml-1.5 text-xs font-bold ${on ? 'text-saffron' : 'text-stone'}`}>{count}</span>}
    </button>
  )
}

/* ---------------- page ---------------- */

function TeamDashboard() {
  const reduce = useReducedMotion()
  const fixVersion = useApp((s) => s.fixVersion)
  const demo = useMemo(() => getDemo(), [fixVersion])
  const rows = useMemo(() => demo.people.map((p, i) => personStats(p, demo.risks[i], demo)), [demo])
  const org = useMemo(() => orgStats(demo), [demo])

  const [q, setQ] = useState('')
  const [dept, setDept] = useState<Department | 'All'>('All')
  const [band, setBand] = useState<RiskBand | 'all'>('all')
  const [sort, setSort] = useState<SortKey>('risk')
  const [desc, setDesc] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const opener = useRef<HTMLElement | null>(null)

  const open = useCallback((id: string) => {
    opener.current = document.activeElement as HTMLElement | null
    setOpenId(id)
  }, [])
  const close = useCallback(() => {
    setOpenId(null)
    requestAnimationFrame(() => opener.current?.focus())
  }, [])

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = rows.filter(
      (r) =>
        (dept === 'All' || r.person.department === dept) &&
        (band === 'all' || r.risk.band === band) &&
        (!needle || [r.person.name, r.person.role, r.person.department, ...r.person.skills.map((s) => s.label)].some((t) => t.toLowerCase().includes(needle))),
    )
    return [...list].sort((a, b) => {
      const x = sortValue(a, sort)
      const y = sortValue(b, sort)
      const c = typeof x === 'string' ? x.localeCompare(y as string) : (x as number) - (y as number)
      return (desc ? -c : c) || a.person.name.localeCompare(b.person.name)
    })
  }, [rows, q, dept, band, sort, desc])

  const watchlist = useMemo(() => [...rows].filter((r) => r.risk.band !== 'steady').sort((a, b) => b.risk.score - a.risk.score), [rows])
  const upcomingLeave = useMemo(
    () =>
      rows
        .flatMap((r) => r.person.leave.filter((l) => l.to >= demo.roster.dates[0]).map((l) => ({ r, l })))
        .sort((a, b) => a.l.from.localeCompare(b.l.from)),
    [rows, demo.roster.dates],
  )
  const selected = openId ? rows.find((r) => r.person.id === openId) : undefined

  const download = () => {
    const url = URL.createObjectURL(new Blob(['﻿' + toCsv(visible)], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'deodar-heights-team-sample.csv'
    a.click()
    URL.revokeObjectURL(url)
  }
  const sortBy = (k: SortKey) => {
    if (k === sort) setDesc((d) => !d)
    else {
      setSort(k)
      setDesc(k === 'risk' || k === 'overtime' || k === 'tenure' || k === 'next')
    }
  }
  const filtering = q !== '' || dept !== 'All' || band !== 'all'
  const clear = () => {
    setQ('')
    setDept('All')
    setBand('all')
  }

  const fbDelta = org.feedbackDelta
  const weekLabel = (iso: string) => dateShort(iso)

  return (
    <div className="space-y-10 sm:space-y-12">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div className="max-w-2xl">
          <SectionTitle eyebrow="Everyone, at a glance">Team dashboard</SectionTitle>
          <p className="-mt-2 text-[16px] leading-relaxed text-pine/80">Who works here, how long they have been with us, how hard they are working and what each of them needs. Click anyone for their full profile.</p>
        </div>
        <Tag tone="saffron" tilt={-2}>Sample people and figures</Tag>
      </div>

      {/* ---------- headline numbers ---------- */}
      <section aria-label="The team in numbers" data-tour="team-overview" className="grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-5">
        <Kpi label="Team size" dark tilt={-0.8} note={`${org.byDept.length} departments · ${org.newHires} joined in the last year · base pay about ${formatLakh(org.monthlyPayroll)} a month (assumption)`}>
          <CountUp value={org.headcount} />
        </Kpi>
        <Kpi label="Time with us, on average" tilt={0.6} note={`Longest: ${org.longest.name.split(' ')[0]}, ${org.longest.years} years`}>
          <CountUp value={org.avgTenure} format={(n) => `${n.toFixed(1)} yr`} />
        </Kpi>
        <Kpi label="Need a manager's eye" tilt={-0.5} note={`${org.bands.high} high · ${org.bands.watch} on watch · ${org.bands.steady} steady`}>
          <CountUp value={org.bands.high + org.bands.watch} />
        </Kpi>
        <Kpi label="Overtime, last 6 weeks" tilt={0.7} note={`${formatINR(org.otCost6)} at 2× the hourly rate (assumption)`}>
          <CountUp value={org.ot6} format={(n) => `${Math.round(n)} h`} />
        </Kpi>
        <Kpi label="Feedback, latest quarter" tilt={-0.6} note={`${fbDelta >= 0 ? 'Up' : 'Down'} ${Math.abs(fbDelta).toFixed(1)} since ${org.feedback[0].period}`}>
          <CountUp value={org.latestFeedback} format={(n) => `${n.toFixed(1)} / 5`} />
        </Kpi>
        <Kpi label="Leave, next 14 days" tilt={0.5} note={`${org.leave.approvedUpcoming} approved · ${org.leave.pending} waiting for an answer`}>
          <CountUp value={org.leave.approvedUpcoming + org.leave.pending} />
        </Kpi>
      </section>

      {/* ---------- watchlist ---------- */}
      {watchlist.length > 0 && (
        <section aria-label="People who need attention" className="relative overflow-hidden border-2 border-saffron/60 bg-[#fdf1da] p-5" style={{ borderRadius: '26px 10px 28px 12px' }}>
          <h2 className="font-display text-2xl font-black tracking-[-0.025em]">Needs a manager's attention</h2>
          <ul className="mt-3 grid gap-3 md:grid-cols-3">
            {watchlist.slice(0, 3).map((r) => {
              const kind = dominantKind(r.risk.reasons)
              return (
                <li key={r.person.id}>
                  <button type="button" onClick={() => open(r.person.id)} className="flex w-full items-center gap-3 border border-pine/10 bg-white/80 p-3 text-left outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-saffron" style={{ borderRadius: '16px 7px 18px 9px' }}>
                    <RiskRing score={r.risk.score} id={r.person.id} size={56} />
                    <span className="min-w-0">
                      <span className="block truncate font-bold">{r.person.name}</span>
                      <span className="block truncate text-xs text-stone">
                        {r.person.department}
                        {kind ? ` · ${KIND_LABEL[kind]}` : ''}
                      </span>
                      <span className="line-clamp-2 text-[12.5px] leading-snug text-pine/80">{r.risk.reasons[0]?.text}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* ---------- who we are ---------- */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Headcount by department" sub={`${org.headcount} people`} tilt={-0.4}>
          <Donut caption="Headcount by department" slices={org.byDept.map((d) => ({ label: d.dept, value: d.count, colour: d.colour }))} centre={<span><span className="font-num block text-[34px] font-black">{org.headcount}</span><span className="text-[11px] font-semibold text-stone">people</span></span>} size={150} />
        </Panel>
        <Panel title="Workload risk" sub="Today, from shift history and the live plan" tilt={0.4}>
          <Donut
            caption="People by workload risk band"
            slices={(['high', 'watch', 'steady'] as RiskBand[]).map((b) => ({ label: BAND_LABEL[b], value: org.bands[b], colour: BAND_COLOUR[b] }))}
            centre={<span><span className="font-num block text-[34px] font-black">{org.bands.high + org.bands.watch}</span><span className="text-[11px] font-semibold text-stone">to watch</span></span>}
            size={150}
          />
        </Panel>
        <Panel title="Shifts, next 14 days" sub={`${demo.roster.assignments.length} shifts on the live roster`} tilt={-0.3}>
          <Donut caption="Shifts by kind, next 14 days" slices={org.shiftMix} centre={<span><span className="font-num block text-[34px] font-black">{demo.roster.assignments.length}</span><span className="text-[11px] font-semibold text-stone">shifts</span></span>} size={150} />
        </Panel>
      </div>

      {/* ---------- hours ---------- */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Panel title="Hours worked each week, whole team" sub="Dashed line is what contracts add up to. Red is overtime. Hatched weeks are planned." tag="Sample">
          <WeeklyBars caption="Team hours each week" data={org.weeks.map((w) => ({ label: weekLabel(w.start), value: w.hours, ref: w.contracted, planned: w.planned }))} height={250} />
          <p className="mt-1 text-[12.5px] text-pine/75">
            Overtime by week: {org.weeks.map((w) => `${Math.round(w.overtime)} h`).join(' · ')}
          </p>
        </Panel>
        <Panel title="Time with us" sub="How long people have stayed" tilt={0.3}>
          <HBars rows={org.tenureBuckets.map((b) => ({ label: b.label, value: b.count, colour: 'var(--forest)' }))} max={Math.max(...org.tenureBuckets.map((b) => b.count), 1)} />
          <p className="mt-3 text-[12.5px] text-pine/75">{org.newHires} {org.newHires === 1 ? 'person has' : 'people have'} been here under a year.</p>
        </Panel>
      </div>

      {/* ---------- feedback and skills ---------- */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel title="Feedback by department" sub="Guest and supervisor score out of 5, each quarter (sample)" tag="Sample">
          <Lines
            caption="Feedback by department"
            labels={org.feedback.map((f) => f.period)}
            min={3}
            max={5}
            series={[
              ...departments.map((d) => ({ name: d, colour: DEPT_COLOUR[d], values: org.feedback.map((f) => f.byDept[d]) })),
              { name: 'Team average', colour: 'var(--pine)', bold: true, dashed: true, values: org.feedback.map((f) => f.overall) },
            ]}
          />
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px]" aria-label="Key to the lines">
            {departments.map((d) => (
              <li key={d} className="flex items-center gap-1.5">
                <span className="h-2.5 w-4 rounded-full" style={{ background: DEPT_COLOUR[d] }} aria-hidden="true" />
                {d}
              </li>
            ))}
            <li className="flex items-center gap-1.5 font-semibold">
              <span className="h-0 w-4 border-t-[3px] border-dashed border-pine" aria-hidden="true" />
              Team average
            </li>
          </ul>
        </Panel>
        <Panel title="Who can cover the critical skills" sub="People holding each skill. The dashed line marks the minimum for safe cover." tilt={-0.3}>
          <HBars
            rows={org.skills.map((s) => ({ label: s.label, value: s.holders, warn: s.holders <= 2, note: s.holders <= 2 ? 'thin' : undefined }))}
            max={Math.max(...org.skills.map((s) => s.holders), 3) + 1}
            marker={2}
            markerLabel="Minimum for safe cover"
          />
          <ul className="mt-3 space-y-1 text-[12.5px] leading-snug text-pine/80">
            {org.skills.map((s) => (
              <li key={s.key}>
                <strong>{s.label}:</strong> {s.names.map((n) => n.split(' ')[0]).join(', ')}
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* ---------- leave and exits ---------- */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Leave coming up" sub="Requests that touch the next 14 days" tilt={0.3}>
          {upcomingLeave.length === 0 ? (
            <p className="text-[14px] text-pine/75">No leave in the next 14 days.</p>
          ) : (
            <ul className="divide-y divide-dotted divide-pine/25">
              {upcomingLeave.map(({ r, l }) => (
                <li key={r.person.name + l.from} className="flex items-center justify-between gap-3 py-2 text-[14px]">
                  <button type="button" onClick={() => open(r.person.id)} className="min-w-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-saffron">
                    <span className="font-bold underline decoration-saffron decoration-2 underline-offset-2">{r.person.name}</span>
                    <span className="block text-xs text-stone">
                      {r.person.department} · {l.from === l.to ? dateShort(l.from) : `${dateShort(l.from)} to ${dateShort(l.to)}`} · {l.reason}
                    </span>
                  </button>
                  <span className={`shrink-0 px-2 py-0.5 text-[11px] font-bold uppercase ${l.status === 'approved' ? 'bg-teal/15 text-forest' : 'bg-saffron/40 text-pine'}`} style={{ borderRadius: '6px 3px 6px 3px' }}>
                    {l.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Who left last season" sub={`${org.attrition.total} people, about ${formatLakh(org.attrition.cost)} to replace (sample record)`} tag="Sample">
          <HBars rows={org.attrition.byDept.map((d) => ({ label: d.dept, value: d.count, colour: DEPT_COLOUR[d.dept], note: formatLakh(d.cost) }))} max={Math.max(...org.attrition.byDept.map((d) => d.count), 1)} />
        </Panel>
      </div>

      {/* ---------- directory ---------- */}
      <section aria-labelledby="dir-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="dir-title" className="text-4xl font-black leading-[0.95] tracking-[-0.03em] sm:text-5xl">
              Everyone
            </h2>
            <p className="mt-1 text-[14px] text-stone" role="status">
              Showing {visible.length} of {rows.length}
              {org.updatedCount > 0 && ` · ${org.updatedCount} updated by a manager`}
            </p>
          </div>
          <Button variant="ghost" onClick={download} className="!min-h-11 text-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 4v11M7.5 10.8 12 15.3l4.5-4.5M5 19.5h14" />
            </svg>
            Download CSV
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="relative block min-w-[220px] flex-1 sm:max-w-sm">
              <span className="sr-only">Search people, roles, departments or skills</span>
              <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4.5 4.5" />
              </svg>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, role, skill…"
                className="min-h-11 w-full border-2 border-pine/20 bg-white/80 pl-9 pr-3 text-[15px] outline-none focus:border-saffron"
                style={{ borderRadius: '12px 5px 13px 6px' }}
              />
            </label>
            <label className="flex items-center gap-2 text-[13px] font-semibold text-stone">
              Sort by
              <select value={sort} onChange={(e) => sortBy(e.target.value as SortKey)} className="min-h-11 border-2 border-pine/20 bg-white/80 px-2 text-[14px] font-semibold text-pine outline-none focus:border-saffron" style={{ borderRadius: '10px 4px 10px 5px' }}>
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => setDesc((d) => !d)} className="grid h-11 w-11 place-items-center bg-white/80 ring-1 ring-inset ring-pine/20 hover:bg-white" style={{ borderRadius: '10px 4px 10px 5px' }} aria-label={desc ? 'Sorted high to low, switch to low to high' : 'Sorted low to high, switch to high to low'}>
                <span aria-hidden="true">{desc ? '↓' : '↑'}</span>
              </button>
            </label>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by department">
            <Chip on={dept === 'All'} onClick={() => setDept('All')} count={rows.length}>
              All departments
            </Chip>
            {departments.map((d) => (
              <Chip key={d} on={dept === d} onClick={() => setDept(d)} count={rows.filter((r) => r.person.department === d).length}>
                {d}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by workload risk">
            <Chip on={band === 'all'} onClick={() => setBand('all')}>
              Any risk
            </Chip>
            {(['high', 'watch', 'steady'] as RiskBand[]).map((b) => (
              <Chip key={b} on={band === b} onClick={() => setBand(b)} count={org.bands[b]}>
                {BAND_LABEL[b]}
              </Chip>
            ))}
            {filtering && (
              <button type="button" onClick={clear} className="min-h-9 px-2 text-[13.5px] font-semibold text-forest underline decoration-saffron decoration-2 underline-offset-2">
                Clear filters
              </button>
            )}
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="mt-5 border-2 border-dashed border-teal/40 p-8 text-center" style={{ borderRadius: '22px 9px 24px 11px' }}>
            <DeodarIcon size={30} className="mx-auto text-teal" />
            <p className="mt-2 font-display text-xl font-bold">Nobody matches those filters.</p>
            <button type="button" onClick={clear} className="mt-2 min-h-11 text-[15px] font-semibold text-forest underline decoration-saffron decoration-2 underline-offset-4">
              Show everyone
            </button>
          </div>
        ) : (
          <>
            {/* wide screens: a table */}
            <div className="mt-5 hidden overflow-x-auto md:block">
              <table className="w-full min-w-[860px] border-separate border-spacing-y-1.5 text-left text-[14px]">
                <caption className="sr-only">Team directory. Press a name to open the full profile.</caption>
                <thead>
                  <tr className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone">
                    {(
                      [
                        ['name', 'Person'],
                        ['department', 'Department'],
                        ['tenure', 'With us'],
                        ['risk', 'Workload risk'],
                        ['overtime', 'Overtime, 6 wks'],
                        ['feedback', 'Feedback'],
                        ['next', 'Next 14 days'],
                      ] as [SortKey, string][]
                    ).map(([k, label]) => (
                      <th key={k} scope="col" aria-sort={sort === k ? (desc ? 'descending' : 'ascending') : 'none'} className="px-3 pb-1 font-bold">
                        <button type="button" onClick={() => sortBy(k)} className="inline-flex min-h-8 items-center gap-1 uppercase tracking-[0.12em] outline-none hover:text-pine focus-visible:ring-2 focus-visible:ring-saffron">
                          {label}
                          <span aria-hidden="true" className={sort === k ? 'text-saffron' : 'opacity-30'}>
                            {sort === k ? (desc ? '↓' : '↑') : '↕'}
                          </span>
                        </button>
                      </th>
                    ))}
                    <th scope="col" className="px-3 pb-1">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r, i) => (
                    <Row key={r.person.id} r={r} i={i} onOpen={open} reduce={!!reduce} />
                  ))}
                </tbody>
              </table>
            </div>
            {/* phones: cards */}
            <ul className="mt-5 space-y-3 md:hidden">
              {visible.map((r) => (
                <li key={r.person.id}>
                  <button type="button" onClick={() => open(r.person.id)} className="flex w-full items-center gap-3 border border-pine/10 bg-white/80 p-3 text-left shadow-warm outline-none focus-visible:ring-2 focus-visible:ring-saffron" style={{ borderRadius: '18px 8px 20px 10px' }}>
                    <RiskRing score={r.risk.score} id={r.person.id} size={52} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate font-bold">{r.person.name}</span>
                        <BandChip band={r.risk.band} />
                      </span>
                      <span className="block truncate text-xs text-stone">
                        {r.person.role} · {r.person.department}
                      </span>
                      <span className="mt-0.5 block text-[12.5px] text-pine/80">
                        {tenureLabel(r.tenure)} · OT {r.ot6} h · feedback {r.feedback.latest.toFixed(1)} · {r.next14.shifts} shifts
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <AnimatePresence>{selected && <EmployeeDetail key={selected.person.id} s={selected} demo={demo} onClose={close} />}</AnimatePresence>
    </div>
  )
}

function Row({ r, i, onOpen, reduce }: { r: PersonStats; i: number; onOpen: (id: string) => void; reduce: boolean }) {
  const p = r.person
  const cell = 'bg-white/75 px-3 py-2.5 align-middle'
  return (
    <motion.tr initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: Math.min(i, 12) * 0.02 }} className="group">
      <td className={`${cell} rounded-l-[16px]`}>
        <button type="button" onClick={() => onOpen(p.id)} className="flex items-center gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-saffron" aria-label={`Open ${p.name}'s profile`}>
          <span className="grid h-10 w-10 shrink-0 place-items-center bg-pine font-display text-lg font-black text-saffron" style={{ borderRadius: '13px 6px 13px 7px' }}>
            {p.name.charAt(0)}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-bold underline-offset-2 group-hover:underline">{p.name}</span>
            <span className="block max-w-[210px] truncate text-xs text-stone">{p.role}</span>
          </span>
        </button>
      </td>
      <td className={cell}>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: DEPT_COLOUR[p.department] }} aria-hidden="true" />
          {p.department}
        </span>
      </td>
      <td className={`${cell} tabular-nums`}>{tenureLabel(r.tenure)}</td>
      <td className={cell}>
        <span className="flex items-center gap-2">
          <RiskRing score={r.risk.score} id={p.id} size={38} />
          <BandChip band={r.risk.band} />
        </span>
      </td>
      <td className={`${cell} font-bold tabular-nums ${r.ot6 > 20 ? 'text-terracotta' : ''}`}>{r.ot6 > 0 ? `+${r.ot6} h` : '0 h'}</td>
      <td className={`${cell} tabular-nums`}>
        <span className="font-bold">{r.feedback.latest.toFixed(1)}</span>{' '}
        <span className={`text-xs font-semibold ${r.feedback.delta < -0.2 ? 'text-terracotta' : r.feedback.delta > 0.2 ? 'text-forest' : 'text-stone'}`}>
          {r.feedback.delta > 0.05 ? '▲' : r.feedback.delta < -0.05 ? '▼' : '–'} {Math.abs(r.feedback.delta).toFixed(1)}
        </span>
      </td>
      <td className={`${cell} tabular-nums`}>
        {r.next14.shifts} <span className="text-xs text-stone">({r.next14.nights} nights)</span>
      </td>
      <td className={`${cell} rounded-r-[16px]`}>
        <span className="flex flex-wrap gap-1">
          {r.onLeaveNow && <Tag tone="stone">On leave</Tag>}
          {!r.onLeaveNow && r.pendingLeave && <Tag tone="saffron">Leave asked</Tag>}
          {r.updated && <Tag tone="teal">Updated</Tag>}
          {!r.onLeaveNow && !r.pendingLeave && !r.updated && <span className="text-xs text-stone">Active</span>}
        </span>
      </td>
    </motion.tr>
  )
}
