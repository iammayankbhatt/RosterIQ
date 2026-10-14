import { motion, useReducedMotion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { DeodarIcon, Topo } from '../Marks'
import type { ScreenProps } from './types'
import { nextSeason, seasonsFor } from '../../lib/staffApp'
import { SEASON_MONTHS, skillL, type TextKey } from '../../lib/staffText'

const PREF: Record<string, TextKey> = { O: 'prefO', D: 'prefD', E: 'prefE', C: 'prefC' }

/** "Your seasons with Deodar Heights": a hill-path timeline, then a warm welcome back. */
export default function SeasonScreen({ person, lang, t }: ScreenProps) {
  const reduce = useReducedMotion()
  const rows = useMemo(() => seasonsFor(person), [person])
  const [all, setAll] = useState(false)
  const shown = all ? rows : rows.slice(0, 4)
  const hidden = rows.length - shown.length
  const next = nextSeason(rows)
  const seasonName = (kind: 'summer' | 'autumn', year: number) => `${t(kind)} ${year}`
  const pref = t(PREF[person.preferredShifts[0]] ?? 'prefD')
  const skillCount = person.skills.filter((s) => !/hindi|english/i.test(s.label)).length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-[26px] font-black leading-[1.12] tracking-[-0.02em]">{t('seasonsTitle')}</h2>
        <p className="mt-1 text-[15px] text-pine/75">{t('seasonsSub', { n: rows.length, year: person.joinDate.slice(0, 4) })}</p>
      </div>

      <ol className="relative space-y-4 pl-7" aria-label={t('seasonsTitle')}>
        <span className="absolute bottom-2 left-[9px] top-2 w-[2px] rounded-full bg-[repeating-linear-gradient(to_bottom,var(--forest)_0_5px,transparent_5px_9px)] opacity-40" aria-hidden="true" />
        {shown.map((r, i) => (
          <motion.li
            key={r.key}
            initial={reduce ? false : { opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: 'spring', stiffness: 250, damping: 24, delay: i * 0.05 }}
            className="relative"
          >
            <span className={`absolute -left-7 top-3 grid h-5 w-5 place-items-center rounded-full ring-4 ring-paper ${r.current ? 'bg-saffron' : r.kind === 'summer' ? 'bg-teal' : 'bg-forest'}`} aria-hidden="true">
              {r.current && <span className="h-2 w-2 rounded-full bg-pine" />}
            </span>
            <div className={`p-3.5 ${r.current ? 'border-2 border-saffron/70 bg-[#fdf1da]' : 'border border-pine/10 bg-white/80'}`} style={{ borderRadius: i % 2 ? '8px 16px 9px 16px' : '16px 8px 16px 9px' }}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-display text-[19px] font-black leading-tight">{seasonName(r.kind, r.year)}</p>
                {r.current && <span className="text-[11px] font-bold uppercase tracking-wide text-pine/75">{t('thisSeason')}</span>}
              </div>
              <p className="mt-1.5 text-[11.5px] font-bold uppercase tracking-[0.1em] text-forest">{t('skillsEarned')}</p>
              {r.skills.length ? (
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {r.skills.map((s) => (
                    <li key={s.label} className="bg-forest/[0.09] px-2 py-1 text-[12.5px] font-semibold" style={{ borderRadius: '8px 3px 8px 4px' }}>
                      {skillL(s.label, lang)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-[13px] text-pine/65">{t('nothingNew')}</p>
              )}
            </div>
          </motion.li>
        ))}
      </ol>

      {rows.length > 4 && (
        <button type="button" onClick={() => setAll((a) => !a)} className="min-h-12 px-1 text-[15px] font-bold text-forest underline decoration-saffron decoration-2 underline-offset-4">
          {all ? t('hideEarlier') : t('earlier', { n: hidden })}
        </button>
      )}

      <section aria-label={t('welcomeTitle')} className="relative -rotate-[0.8deg] overflow-hidden bg-pine p-5 text-paper shadow-lift" style={{ borderRadius: '28px 10px 30px 12px' }}>
        <Topo stroke="var(--teal)" opacity={0.5} />
        <div className="relative">
          <DeodarIcon size={26} className="text-saffron" />
          <h3 className="mt-2 font-display text-[24px] font-black leading-tight tracking-[-0.02em] text-paper">{t('welcomeTitle')}</h3>
          <p className="mt-2 text-[15.5px] leading-relaxed text-mist/95">
            {t('welcomeBody', { season: seasonName(next.kind, next.year), months: t(SEASON_MONTHS[next.kind]), pref })}
          </p>
          <p className="mt-2 text-[14px] font-semibold text-saffron">{t('welcomeSkills', { n: skillCount })}</p>
        </div>
      </section>
    </div>
  )
}
