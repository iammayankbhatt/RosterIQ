import { motion, useReducedMotion } from 'framer-motion'
import { fmtDate } from '../../engine'
import type { TLCell, TLWeek } from '../../lib/riskView'
import { CHIP, CHIP_RADII, ChipFace } from '../roster/ShiftChip'

const KIND_WORD = { M: 'morning or day shift', E: 'evening shift', N: 'late close or night', X: 'day off', L: 'leave' } as const

function Cell({ c, r, k, changed, flow, working, delayIdx }: { c: TLCell; r: number; k: number; changed: boolean; flow: number; working: boolean; delayIdx: number }) {
  const reduce = useReducedMotion()
  const radius = CHIP_RADII[(r + k * 2) % 4]
  const label = `${fmtDate(c.date)}: ${KIND_WORD[c.kind]}${c.planned ? ' (planned)' : ''}${c.ot ? ', counts as overtime' : ''}${c.streak ? ', part of 7 or more days in a row' : ''}`
  return (
    <div className="relative h-8" title={label} role="img" aria-label={label}>
      <motion.div
        key={changed ? flow : 'still'}
        className={`h-full ${working && c.planned ? 'animate-pulse' : ''}`}
        style={{ borderRadius: radius }}
        initial={changed && !reduce ? { scale: 0.3, rotate: -14, opacity: 0 } : false}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 16, delay: changed ? 0.15 + delayIdx * 0.09 : 0 }}
      >
        <ChipFace kind={c.kind} mini />
      </motion.div>
      {changed && !reduce && (
        <motion.span
          key={`glow-${flow}`}
          aria-hidden="true"
          className="pointer-events-none absolute -inset-1 ring-2 ring-saffron"
          style={{ borderRadius: radius }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.8, delay: 0.3 + delayIdx * 0.09 }}
        />
      )}
      {c.ot && <span aria-hidden="true" className="absolute -right-[3px] -top-[3px] h-[10px] w-[10px] rounded-full border-2 border-saffron bg-pine" />}
      {c.streak && <span aria-hidden="true" className="absolute -bottom-[5px] -left-[2px] -right-[2px] h-[3px] rounded-full bg-terracotta" />}
    </div>
  )
}

/**
 * Six weeks of history and two planned weeks, one row per week.
 * Overtime shows as a dot, a run of 7+ days in a row as a terracotta underline.
 */
export default function Timeline({ weeks, changed, flow, working }: { weeks: TLWeek[]; changed: Set<string>; flow: number; working: boolean }) {
  const heads = weeks[0]?.cells.map((c) => fmtDate(c.date).slice(0, 1)) ?? []
  let changedIdx = 0
  return (
    <figure>
      <div className="grid grid-cols-[84px_repeat(7,minmax(0,1fr))] items-end gap-x-1 pb-1" aria-hidden="true">
        <span />
        {heads.map((h, i) => (
          <span key={i} className="text-center text-[10px] font-bold uppercase tracking-wider text-stone">
            {h}
          </span>
        ))}
      </div>
      <div className="space-y-2.5">
        {weeks.map((w, r) => {
          const first = w.planned && !weeks[r - 1]?.planned
          return (
            <div key={w.start}>
              {(r === 0 || first) && (
                <p className={`mb-1.5 mt-1 text-[11px] font-bold uppercase tracking-[0.18em] ${w.planned ? 'text-forest' : 'text-stone'}`}>
                  {w.planned ? 'Next two weeks, as planned' : 'Last six weeks, as worked'}
                </p>
              )}
              <div className={`grid grid-cols-[84px_repeat(7,minmax(0,1fr))] items-center gap-x-1 ${w.planned ? 'rounded-xl border border-dashed border-teal/40 bg-teal/[0.06] py-1 pl-1' : ''}`}>
                <div className="leading-tight">
                  <p className="text-[11.5px] font-semibold text-pine">{fmtDate(w.start).slice(4)}</p>
                  <p className={`text-[10.5px] font-semibold ${w.overtime > 0 ? 'text-pine' : 'text-stone'}`}>
                    {w.overtime > 0 ? (
                      <span className="bg-saffron/40 px-1" style={{ borderRadius: '4px 2px 4px 3px' }}>
                        +{Math.round(w.overtime * 10) / 10}h OT
                      </span>
                    ) : (
                      `${Math.round(w.hours * 10) / 10}h`
                    )}
                  </p>
                </div>
                {w.cells.map((c, k) => {
                  const isChanged = changed.has(c.date) && c.planned
                  return <Cell key={c.date} c={c} r={r} k={k} changed={isChanged} flow={flow} working={working} delayIdx={isChanged ? changedIdx++ : 0} />
                })}
              </div>
            </div>
          )
        })}
      </div>
      <figcaption className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] text-pine/80">
        {(['M', 'E', 'N', 'X'] as const).map((k, i) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="block h-4 w-6" style={{ borderRadius: CHIP_RADII[i] }}>
              <ChipFace kind={k} mini />
            </span>
            {k === 'M' ? 'Morning or day' : k === 'E' ? 'Evening' : k === 'N' ? 'Late close or night' : CHIP.X.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="h-[10px] w-[10px] rounded-full border-2 border-saffron bg-pine" aria-hidden="true" /> Overtime
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-[3px] w-6 rounded-full bg-terracotta" aria-hidden="true" /> 7+ days in a row
        </span>
      </figcaption>
    </figure>
  )
}
