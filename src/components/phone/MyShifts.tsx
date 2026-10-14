import { motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import { ChipFace, RestMark } from '../roster/ShiftChip'
import { Highlight } from '../ui'
import { PinIcon } from './PhoneIcons'
import type { ScreenProps } from './types'
import { fixedOffWeekday, managerUpdates, myAssignments, nextShift, shiftStartMs, weekdayName, type ManagerUpdate } from '../../lib/staffApp'
import { countdown, dateLabel, dayFull, dayNumber, dayShort, firstNameL, shiftName, shiftOn, shiftTime, type T } from '../../lib/staffText'
import { TODAY } from '../../lib/courses'

const RADII = ['16px 8px 14px 9px', '9px 16px 8px 14px']

function updateLines(u: ManagerUpdate, t: T, lang: ScreenProps['lang']): string[] {
  const names = u.covers.map((n) => firstNameL(n, lang)).join(lang === 'hi' ? ' और ' : ' and ')
  switch (u.kind) {
    case 'weekly-off':
      return [t('updWeeklyOff', { day: u.weekday !== undefined ? weekdayName(u.weekday, lang) : '' }), ...(names ? [t('updCovered', { names })] : [])]
    case 'shift-pattern':
      return [t('updPattern'), ...(names ? [t('updCovered', { names })] : [])]
    case 'honour-leave':
      return [t('updLeave')]
    case 'skill-course':
      return [t('updCourse', { course: u.course ?? '' })]
    case 'recognition':
      return [t('updRecognition')]
  }
}

export default function MyShifts({ demo, person, lang, t, nowMs }: ScreenProps) {
  const reduce = useReducedMotion()
  const [week, setWeek] = useState<0 | 1>(0)
  const mine = myAssignments(demo, person.id)
  const byDate = new Map(mine.map((a) => [a.date, a.shift]))
  const next = nextShift(demo, person.id, nowMs)
  const updates = managerUpdates(demo, person.id)
  const fixedOff = fixedOffWeekday(updates)
  const dates = demo.roster.dates.slice(week * 7, week * 7 + 7)
  const swappedDates = new Set(demo.swaps.flatMap((s) => (s.aId === person.id ? [s.bDate] : s.bId === person.id ? [s.aDate] : [])))
  // every shift a manager fix or a swap moved for this person, so the phone points at the same changes the roster shows
  const changedBy = new Map(demo.changes.filter((c) => c.staffId === person.id).map((c) => [c.date, c]))
  const otherWeek: 0 | 1 = week === 0 ? 1 : 0
  const otherWeekChanges = demo.roster.dates.slice(otherWeek * 7, otherWeek * 7 + 7).filter((d) => changedBy.has(d)).length
  const offDays = dates.filter((d) => !byDate.has(d) && !person.leave.some((l) => l.status === 'approved' && d >= l.from && d <= l.to))
  const leaveOn = (d: string) => person.leave.some((l) => l.status === 'approved' && d >= l.from && d <= l.to)

  return (
    <div className="space-y-5">
      {updates.length > 0 && (
        <motion.section
          key={updates.length}
          initial={reduce ? false : { opacity: 0, y: -8, rotate: -1 }}
          animate={{ opacity: 1, y: 0, rotate: -0.6 }}
          aria-label={t('update')}
          className="relative border-2 border-saffron/70 bg-[#fdf1da] p-4"
          style={{ borderRadius: '20px 8px 22px 10px' }}
        >
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-pine/80">{t('update')}</p>
          <ul className="space-y-2.5">
            {updates.map((u) => (
              <li key={u.kind} className="space-y-1">
                {updateLines(u, t, lang).map((l) => (
                  <p key={l} className="text-[15px] font-semibold leading-snug text-pine">
                    {l}
                  </p>
                ))}
              </li>
            ))}
          </ul>
        </motion.section>
      )}

      {/* next shift */}
      <section aria-label={t('nextShift')} className="relative overflow-hidden bg-pine p-5 text-paper shadow-lift" style={{ borderRadius: '26px 10px 28px 12px' }}>
        <div className="hatch-light pointer-events-none absolute inset-y-0 right-0 w-16" aria-hidden="true" />
        <p className="relative text-[11px] font-bold uppercase tracking-[0.18em] text-saffron">{t('nextShift')}</p>
        {next ? (
          <>
            <p className="relative mt-2 text-[13px] text-mist/80">{t('startsIn')}</p>
            <p className="relative font-num text-[40px] font-black leading-none tracking-[-0.02em]">{countdown(shiftStartMs(next.date, next.shift) - nowMs, lang)}</p>
            <p className="relative mt-3 text-[17px] font-bold">{shiftOn(next.shift, next.date, lang)}</p>
            <p className="relative text-[14px] text-mist/85">{shiftTime(next.shift, lang)}</p>
          </>
        ) : (
          <p className="relative mt-2 text-[16px]">{t('nothingNext')}</p>
        )}
      </section>

      {fixedOff !== undefined && (
        <p className="flex items-center gap-2 text-[15px] font-semibold text-forest">
          <PinIcon size={16} />
          {t('fixedOffNote', { day: weekdayName(fixedOff, lang) })}
        </p>
      )}

      {otherWeekChanges > 0 && (
        <button
          type="button"
          onClick={() => setWeek(otherWeek)}
          className="flex min-h-12 w-full items-center justify-between gap-2 border-2 border-saffron/70 bg-[#fdf1da] px-4 text-left text-[15px] font-bold text-pine"
          style={{ borderRadius: '16px 7px 18px 9px' }}
        >
          <span>{t(otherWeek === 1 ? 'updatesNext' : 'updatesThis')}</span>
          <span className="shrink-0 underline decoration-saffron decoration-2 underline-offset-2">
            {t('seeIt')} <span aria-hidden="true">→</span>
          </span>
        </button>
      )}

      {/* week */}
      <div role="radiogroup" aria-label={t('shiftsTitle')} className="flex gap-1 bg-mist p-1 ring-1 ring-forest/10" style={{ borderRadius: '16px 7px 16px 9px' }}>
        {([0, 1] as const).map((w) => (
          <button
            key={w}
            type="button"
            role="radio"
            aria-checked={week === w}
            onClick={() => setWeek(w)}
            className={`relative min-h-12 flex-1 text-[15px] font-bold transition-colors ${week === w ? 'bg-pine text-paper' : 'text-pine'}`}
            style={{ borderRadius: '12px 5px 12px 7px' }}
          >
            {w === 0 ? t('thisWeek') : t('nextWeek')}
          </button>
        ))}
      </div>

      <ul className="space-y-2.5">
        {dates.map((d, i) => {
          const shift = byDate.get(d)
          const leave = leaveOn(d)
          const isFixed = !shift && !leave && fixedOff !== undefined && new Date(`${d}T00:00:00Z`).getUTCDay() === fixedOff
          const isWeeklyOff = !shift && !leave && !isFixed && offDays.length === 1
          const today = d === TODAY
          const label = shift ? `${dayFull(d, lang)} ${dayNumber(d)}: ${shiftName(shift, lang)}, ${shiftTime(shift, lang)}` : `${dateLabel(d, lang)}: ${leave ? t('onLeave') : isFixed ? t('fixedOff') : t('dayOff')}`
          return (
            <motion.li
              key={d}
              aria-label={label}
              initial={reduce ? false : { opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24, delay: i * 0.04 }}
              className={`relative flex min-h-[68px] items-center gap-3 p-2.5 ${shift ? 'border border-pine/10 bg-white/80 shadow-warm' : isFixed ? 'border-2 border-saffron bg-[#fdf1da]' : 'border border-dashed border-pine/25 bg-transparent'}`}
              style={{ borderRadius: RADII[i % 2] }}
            >
              <span className={`grid h-12 w-12 shrink-0 place-items-center text-center leading-none ${today ? 'bg-saffron text-pine' : 'bg-mist text-pine'}`} style={{ borderRadius: '12px 6px 12px 7px' }}>
                <span>
                  <span className="block text-[10.5px] font-bold uppercase">{dayShort(d, lang)}</span>
                  <span className="font-num block text-[21px] font-black">{dayNumber(d)}</span>
                </span>
              </span>
              <span className="min-w-0 flex-1">
                {shift ? (
                  <>
                    <span className="block text-[17px] font-bold leading-tight">{shiftName(shift, lang)}</span>
                    <span className="block text-[13.5px] text-pine/75">{shiftTime(shift, lang)}</span>
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-1.5 text-[16px] font-bold leading-tight text-pine/85">
                      {leave ? t('onLeave') : isFixed ? <Highlight>{t('fixedOff')}</Highlight> : isWeeklyOff ? t('fixedOff') : t('dayOff')}
                    </span>
                    {today && <span className="block text-[12.5px] text-pine/70">{t('today')}</span>}
                  </>
                )}
                {changedBy.has(d) && !swappedDates.has(d) && (
                  <span className="mt-1 inline-block bg-saffron/45 px-1.5 py-0.5 text-[11px] font-bold text-pine" style={{ borderRadius: '5px 2px 5px 3px' }}>
                    {t('updatedTag')}
                  </span>
                )}
                {swappedDates.has(d) && (
                  <span className="mt-1 inline-block bg-teal/15 px-1.5 py-0.5 text-[11px] font-bold text-forest" style={{ borderRadius: '5px 2px 5px 3px' }}>
                    {t('swapped')}
                  </span>
                )}
              </span>
              <span className="h-11 w-14 shrink-0" style={{ borderRadius: RADII[(i + 1) % 2] }}>
                {shift ? <ChipFace kind={shift} mini /> : isFixed ? <span className="grid h-full w-full place-items-center rounded-[inherit] bg-saffron text-pine"><PinIcon size={20} /></span> : <span className="grid h-full w-full place-items-center text-pine/55"><RestMark size={22} /></span>}
              </span>
            </motion.li>
          )
        })}
      </ul>

      <p className="text-center text-[12px] text-stone">{t('sampleClock', { when: `${dateLabel(TODAY, lang)}, ${lang === 'hi' ? 'सुबह 9:00' : '9:00 am'}` })}</p>
    </div>
  )
}
