import { departments, hotel, lastSeason, lastSeasonTotal, occupancyForecast, staff, type ShiftCode, type Staff } from '../data'
import { DeodarIcon, StatusDot } from '../components/Marks'
import { Card, SectionTitle, Stat, Tag } from '../components/ui'
import { formatINR, formatLakh } from '../lib/format'
import { currentStreak, hoursInLast, shortestRest } from '../lib/stats'
import { useApp } from '../store/useApp'

const cell: Record<ShiftCode, string> = {
  O: 'bg-teal',
  D: 'bg-forest',
  E: 'bg-pine',
  C: 'bg-terracotta',
  X: 'bg-transparent ring-1 ring-inset ring-stone/40',
  LV: 'bg-saffron/60',
}
const shiftName: Record<ShiftCode, string> = {
  O: 'Open 05:30–13:30',
  D: 'Day 09:00–17:00',
  E: 'Evening 14:00–22:00',
  C: 'Late close 16:00–00:30',
  X: 'Weekly off',
  LV: 'Leave',
}

function Strip({ s }: { s: Staff }) {
  return (
    <div className="flex gap-[2px]" role="img" aria-label={`${s.name}: 6-week shift history`}>
      {s.history.map((r) => (
        <span
          key={r.date}
          title={`${r.date} · ${shiftName[r.shift]}${r.hours ? ` · ${r.hours} h` : ''}`}
          className={`h-5 w-[5px] rounded-[1px] sm:w-[7px] ${cell[r.shift]}`}
        />
      ))}
    </div>
  )
}

export default function SeedPage() {
  const { department, setDepartment } = useApp()
  const list = staff.filter((s) => department === 'All' || s.department === department)

  return (
    <div className="space-y-14">
      <header>
        <Tag tone="terracotta" tilt={-1.5}>Temporary page · verify seed data</Tag>
        <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">{hotel.name}</h1>
        <p className="mt-2 text-stone">
          {hotel.rooms} rooms · {hotel.town} · {staff.length} staff · all names and figures are sample data
        </p>
      </header>

      <section>
        <SectionTitle eyebrow="Forecast">14-day occupancy (sample assumption)</SectionTitle>
        <Card className="overflow-x-auto">
          <div className="flex min-w-[640px] items-end gap-2">
            {occupancyForecast.map((d) => {
              const peak = d.occupancyPct >= 85
              return (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5" title={d.note}>
                  <span className="font-num text-sm font-semibold">{d.occupancyPct}%</span>
                  <div
                    className={`w-full rounded-t-[10px_4px] ${peak ? 'bg-saffron' : 'bg-teal/70'}`}
                    style={{ height: `${d.occupancyPct * 1.4}px` }}
                  />
                  <span className="text-xs font-semibold">{d.weekday}</span>
                  <span className="text-[11px] text-stone">{d.date.slice(8)} Oct</span>
                </div>
              )
            })}
          </div>
        </Card>
      </section>

      <section>
        <SectionTitle eyebrow="Last season">Resignations and what they cost</SectionTitle>
        <div className="grid gap-5 md:grid-cols-[1fr_2fr]">
          <Stat label="Replacement cost, 8 resignations" value={lastSeasonTotal} format={formatLakh} basis="assumption" highlight tilt={-1} note={lastSeason.basis} />
          <Card alt className="overflow-x-auto !p-0">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-stone">
                <tr><th className="p-3">Who</th><th className="p-3">Department</th><th className="p-3">Why</th><th className="p-3 text-right">Cost</th></tr>
              </thead>
              <tbody>
                {lastSeason.resignations.map((r) => (
                  <tr key={r.name} className="border-t border-pine/10">
                    <td className="p-3 font-medium">{r.name}</td>
                    <td className="p-3">{r.department}</td>
                    <td className="p-3 text-stone">{r.reason}</td>
                    <td className="p-3 text-right font-num">{formatINR(r.replacementCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="Team">{staff.length} staff, 6 weeks of shifts</SectionTitle>
        <div className="mb-5 flex flex-wrap gap-2">
          {(['All', ...departments] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDepartment(d)}
              className={`min-h-9 rounded-chip px-3 text-sm font-medium transition-colors ${department === d ? 'bg-pine text-paper' : 'bg-mist text-pine hover:bg-forest/10'}`}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone">
          {(Object.keys(shiftName) as ShiftCode[]).map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span className={`h-3 w-3 rounded-[2px] ${cell[k]}`} />
              {shiftName[k]}
            </span>
          ))}
        </div>

        <div className="grid gap-4">
          {list.map((s, i) => {
            const streak = currentStreak(s.history)
            const rest = shortestRest(s.history)
            const tone = s.seedTag === 'healthy' ? 'ok' : s.seedTag ? 'risk' : 'idle'
            return (
              <Card key={s.id} alt={i % 2 === 1} tone={s.seedTag && s.seedTag !== 'healthy' ? 'mist' : 'paper'} className="!p-4 sm:!p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <DeodarIcon size={20} className={s.seedTag === 'healthy' ? 'text-teal' : 'text-stone/60'} />
                    <div>
                      <h3 className="flex items-center gap-2 text-xl font-semibold">
                        {s.name}
                        <StatusDot tone={tone} label={s.seedTag ?? 'unscored'} />
                      </h3>
                      <p className="text-sm text-stone">{s.role} · {s.department} · joined {s.joinDate}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {s.seedTag && <Tag tone={s.seedTag === 'healthy' ? 'teal' : 'terracotta'}>{s.seedTag.replace('-', ' ')}</Tag>}
                    <Tag>{s.weeklyHours} h/week</Tag>
                    <Tag>{formatINR(s.hourlyRate)}/h</Tag>
                  </div>
                </div>

                <div className="mt-4 overflow-x-auto pb-1"><Strip s={s} /></div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div><dt className="text-stone">Current streak</dt><dd className="font-num text-2xl">{streak} days</dd></div>
                  <div><dt className="text-stone">Last 7 days</dt><dd className="font-num text-2xl">{hoursInLast(s.history, 7)} h</dd></div>
                  <div><dt className="text-stone">Shortest rest</dt><dd className="font-num text-2xl">{rest === null ? '–' : `${rest} h`}</dd></div>
                  <div><dt className="text-stone">Feedback (4 qtrs)</dt><dd className="font-num text-2xl">{s.feedback.map((f) => f.score.toFixed(1)).join(' → ')}</dd></div>
                </dl>

                <p className="mt-3 text-sm"><span className="text-stone">Skills:</span> {s.skills.map((k) => `${k.label} (${k.since})`).join(' · ')}</p>
                <p className="mt-1 text-sm"><span className="text-stone">Prefers:</span> {s.preferredShifts.map((k) => shiftName[k]).join(', ')}
                  {s.leave.length > 0 && <> · <span className="text-stone">Leave:</span> {s.leave.map((l) => `${l.from}${l.to !== l.from ? ` to ${l.to}` : ''} (${l.status})`).join(', ')}</>}
                </p>
                {s.seedNote && <p className="mt-3 border-l-[3px] border-saffron pl-3 text-sm italic">{s.seedNote}</p>}
              </Card>
            )
          })}
        </div>
      </section>
    </div>
  )
}
