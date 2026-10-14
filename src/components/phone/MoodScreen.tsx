import { motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import { StatusDot } from '../Marks'
import Face from './Faces'
import type { ScreenProps } from './types'
import { getOverlay, setMood } from '../../lib/demo'
import { firstNameL } from '../../lib/staffText'

const SCORES = [1, 2, 3, 4, 5] as const

/** A ten-second weekly check-in. The answer joins the person's feedback, which the stagnation signal reads. */
export default function MoodScreen({ person, lang, t, mutate }: ScreenProps) {
  const reduce = useReducedMotion()
  const saved = getOverlay().moods[person.id]?.score as 1 | 2 | 3 | 4 | 5 | undefined
  const [choice, setChoice] = useState<1 | 2 | 3 | 4 | 5 | undefined>(saved)
  const [editing, setEditing] = useState(false)
  const done = saved !== undefined && !editing

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-[26px] font-black leading-tight tracking-[-0.02em]">{t('moodTitle')}</h2>
        <p className="mt-1 text-[15px] text-pine/75">{t('moodSub')}</p>
      </div>

      <div role="radiogroup" aria-label={t('moodTitle')} className="grid grid-cols-5 gap-1.5">
        {SCORES.map((s) => {
          const on = choice === s
          return (
            <motion.button
              key={s}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={t(`mood${s}` as 'mood1')}
              disabled={done}
              onClick={() => setChoice(s)}
              whileTap={reduce ? undefined : { scale: 0.9 }}
              animate={{ scale: on ? 1.12 : 1, rotate: on ? (s % 2 ? -4 : 4) : 0, y: on ? -4 : 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 16 }}
              className={`relative grid aspect-square min-h-[56px] place-items-center transition-colors ${on ? 'bg-white shadow-lift ring-2 ring-saffron' : 'bg-white/60'} ${done && !on ? 'opacity-40' : ''}`}
              style={{ borderRadius: s % 2 ? '16px 8px 16px 9px' : '8px 16px 9px 16px' }}
            >
              <Face score={s} size={46} selected={on} />
            </motion.button>
          )
        })}
      </div>

      <p className="min-h-7 text-center font-display text-[22px] font-black" aria-live="polite">
        {choice ? t(`mood${choice}` as 'mood1') : ''}
      </p>

      {done ? (
        <div className="space-y-3">
          <p role="status" className="flex items-start gap-2 border-2 border-teal/40 bg-mist p-4 text-[15.5px] font-semibold leading-snug" style={{ borderRadius: '18px 8px 20px 10px' }}>
            <span className="mt-0.5 shrink-0">
              <StatusDot tone="ok" size={20} />
            </span>
            {t('moodSaved', { name: firstNameL(person.name, lang) })}
          </p>
          <button type="button" onClick={() => setEditing(true)} className="min-h-12 px-2 text-[15px] font-bold text-forest underline decoration-saffron decoration-2 underline-offset-4">
            {t('moodChange')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={!choice}
          onClick={() => {
            if (!choice) return
            mutate(() => setMood(person.id, choice))
            setEditing(false)
          }}
          className="min-h-14 w-full bg-saffron px-4 text-[17px] font-black text-pine shadow-warm transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
          style={{ borderRadius: '18px 7px 20px 9px' }}
        >
          {t('moodSave')}
        </button>
      )}

      <div className="space-y-2 border-t-2 border-dotted border-pine/20 pt-4 text-[13.5px] leading-relaxed text-pine/75">
        <p>{t('moodPrivacy')}</p>
        <p>{t('moodPurpose')}</p>
      </div>
    </div>
  )
}
