import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useRef, useState } from 'react'
import { StatusDot } from '../Marks'
import ProgressRing from './ProgressRing'
import type { ScreenProps } from './types'
import { COURSES, coursesFor, holdsCourseSkill, type Course } from '../../lib/courses'
import { advanceCourse, getOverlay } from '../../lib/demo'
import { skillL } from '../../lib/staffText'

function CertMark({ done }: { done: boolean }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={done ? 'text-forest' : 'text-pine/55'}>
      <path d="M5 4.4h14c.8 0 1.4.6 1.4 1.4v8.4c0 .8-.6 1.4-1.4 1.4H5c-.8 0-1.4-.6-1.4-1.4V5.8c0-.8.6-1.4 1.4-1.4z" />
      <path d="M7.4 8.6h6.2M7.4 11.4h4" />
      <path d="M15.6 15.6l-.8 4.4 2.4-1.4 2.4 1.4-.8-4.4" fill={done ? 'var(--saffron)' : 'none'} />
    </svg>
  )
}

export default function GrowScreen({ person, lang, t, mutate }: ScreenProps) {
  const reduce = useReducedMotion()
  const progress = getOverlay().progress[person.id] ?? {}
  const [justEarned, setJustEarned] = useState<Course | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const list = coursesFor(person)
  // a course the manager chose for them (a department specialty) is flagged
  const suggestedId = person.plan?.skillCourse ? list.find((c) => c.depts && !holdsCourseSkill(person, c))?.id : undefined

  const step = (c: Course) => {
    const done = progress[c.id] ?? 0
    setBusy(c.id)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setBusy(null), 500)
    mutate(() => advanceCourse(person.id, c.id))
    if (done + 1 >= c.lessons) setJustEarned(c)
  }

  // earned here or earlier: the skill is on the profile
  const heldSkills = person.skills.filter((s) => !/hindi|english/i.test(s.label))

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-[26px] font-black leading-tight tracking-[-0.02em]">{t('growTitle')}</h2>
        <p className="mt-1 text-[15px] text-pine/75">{t('growSub')}</p>
      </div>

      <AnimatePresence initial={false}>
        {justEarned && (
          <motion.div
            key="earned"
            role="status"
            initial={reduce ? false : { opacity: 0, scale: 0.92, rotate: -2 }}
            animate={{ opacity: 1, scale: 1, rotate: -0.6 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-2.5 border-2 border-saffron bg-[#fdf1da] p-4 text-[15.5px] font-bold leading-snug"
            style={{ borderRadius: '20px 8px 22px 10px' }}
          >
            <span className="mt-0.5 shrink-0">
              <StatusDot tone="ok" size={22} />
            </span>
            {t('newSkill', { skill: skillL(justEarned.skill, lang) })}
          </motion.div>
        )}
      </AnimatePresence>

      <ul className="space-y-3">
        {list.map((c, i) => {
          const lessons = progress[c.id] ?? 0
          const earned = holdsCourseSkill(person, c)
          const p = earned ? 1 : lessons / c.lessons
          return (
            <li
              key={c.id}
              className={`relative flex items-center gap-3.5 p-3.5 ${earned ? 'border border-forest/25 bg-mist' : 'border border-pine/10 bg-white/80 shadow-warm'}`}
              style={{ borderRadius: i % 2 ? '8px 18px 9px 18px' : '18px 8px 18px 9px' }}
            >
              <ProgressRing progress={p} size={68} seed={i + 1} done={earned}>
                {earned ? <CertMark done /> : lessons > 0 ? <span className="font-num text-[17px] font-black">{Math.round(p * 100)}%</span> : <CertMark done={false} />}
              </ProgressRing>
              <div className="min-w-0 flex-1">
                {suggestedId === c.id && (
                  <span className="mb-1 inline-block bg-saffron px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-pine" style={{ borderRadius: '5px 2px 5px 3px' }}>
                    {t('suggested')}
                  </span>
                )}
                <p className="font-display text-[18px] font-black leading-tight">{c.title[lang]}</p>
                <p className="mt-0.5 text-[13px] text-pine/70">{earned ? t('earned') : `${t('lessonOf', { n: Math.min(lessons + 1, c.lessons), m: c.lessons })} · ${t('minutes', { n: c.minutes })}`}</p>
                {!earned && (
                  <button
                    type="button"
                    onClick={() => step(c)}
                    disabled={busy === c.id}
                    className="mt-2 min-h-11 bg-pine px-5 text-[15px] font-bold text-paper transition-transform active:scale-95 disabled:opacity-60"
                    style={{ borderRadius: '12px 5px 12px 6px' }}
                    aria-label={`${lessons ? t('cont') : t('start')}: ${c.title[lang]}`}
                  >
                    {lessons ? t('cont') : t('start')} <span aria-hidden="true">→</span>
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <section aria-label={t('yourSkills')}>
        <h3 className="text-[13px] font-bold uppercase tracking-[0.1em] text-forest">{t('yourSkills')}</h3>
        <ul className="mt-2 flex flex-wrap gap-2">
          {heldSkills.map((s) => (
            <li key={s.label} className={`px-2.5 py-1.5 text-[13px] font-semibold ${COURSES.some((c) => c.skill === s.label && s.since === '2026-10') ? 'bg-saffron/40 ring-1 ring-saffron' : 'bg-forest/[0.08]'}`} style={{ borderRadius: '9px 4px 9px 5px' }}>
              {skillL(s.label, lang)}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
