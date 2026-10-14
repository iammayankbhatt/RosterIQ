import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { StatusDot } from '../Marks'
import { Glyph } from '../roster/ShiftChip'
import type { ScreenProps } from './types'
import { evaluateSwap, myAssignments, swapPeers, type SwapCheck } from '../../lib/staffApp'
import { dateLabel, dayNumber, dayShort, firstNameL, nameL, shiftName, shiftOn, skillL, type T } from '../../lib/staffText'
import { requestSwap, undoSwap } from '../../lib/demo'
import { TODAY } from '../../lib/courses'
import type { Assignment } from '../../engine'

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

function ShiftChoice({ a, selected, ok, lang, onPick }: { a: Assignment; selected: boolean; ok?: boolean; lang: ScreenProps['lang']; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      aria-label={`${shiftOn(a.shift, a.date, lang)}${ok === undefined ? '' : ok ? ', fair' : ', not fair'}`}
      className={`relative flex min-h-14 items-center gap-2 px-2.5 text-left transition-colors ${selected ? 'bg-pine text-paper shadow-warm' : 'border border-pine/15 bg-white/80 text-pine'} ${ok === false && !selected ? 'opacity-60' : ''}`}
      style={{ borderRadius: '14px 6px 14px 8px' }}
    >
      <span className="leading-none">
        <span className="block text-[10px] font-bold uppercase opacity-75">{dayShort(a.date, lang)}</span>
        <span className="font-num block text-[20px] font-black">{dayNumber(a.date)}</span>
      </span>
      <span className="min-w-0 flex-1 text-[14px] font-bold leading-tight">
        <span className="mr-1 inline-block align-middle">
          <Glyph kind={a.shift} />
        </span>
        {shiftName(a.shift, lang)}
      </span>
      {ok !== undefined && (
        <span className="shrink-0" aria-hidden="true">
          <StatusDot tone={ok ? 'ok' : 'risk'} size={15} />
        </span>
      )}
    </button>
  )
}

function checkLine(c: SwapCheck, t: T, peerName: string): { ok: boolean; text: string } | null {
  switch (c.id) {
    case 'rest':
      if (c.who === 'me') return { ok: c.ok, text: c.ok ? t('restKeptYou', { h: c.hours ?? '' }) : t('restBrokenYou', { h: c.hours ?? '' }) }
      return { ok: c.ok, text: c.ok ? t('restKeptThem', { name: peerName, h: c.hours ?? '' }) : t('restBrokenThem', { name: peerName, h: c.hours ?? '' }) }
    case 'off':
      if (c.who === 'me') return { ok: c.ok, text: c.ok ? t('offKeptYou') : t('offBrokenYou') }
      return { ok: c.ok, text: c.ok ? t('offKeptThem', { name: peerName }) : t('offBrokenThem', { name: peerName }) }
    case 'skill':
      return { ok: c.ok, text: c.ok ? t('skillOk') : t('skillBad') }
    case 'overtime':
      return { ok: c.ok, text: c.ok ? t('otOk') : c.who === 'me' ? t('otBadYou') : t('otBad', { name: peerName }) }
    case 'leave':
      return { ok: false, text: c.who === 'me' ? t('leaveBadYou') : t('leaveBad', { name: peerName }) }
    case 'busy':
      return { ok: false, text: c.who === 'me' ? t('busyYou') : t('busy', { name: peerName }) }
  }
}

export default function SwapScreen({ demo, person, lang, t, mutate }: ScreenProps) {
  const reduce = useReducedMotion()
  const [mineDate, setMineDate] = useState<string | null>(null)
  const [peerId, setPeerId] = useState<string | null>(null)
  const [theirDate, setTheirDate] = useState<string | null>(null)
  const [phase, setPhase] = useState<'idle' | 'waiting' | 'done'>('idle')
  const [doneText, setDoneText] = useState('')
  const alive = useRef(true)
  useEffect(() => () => void (alive.current = false), [])

  const mine = useMemo(() => myAssignments(demo, person.id).filter((a) => a.date >= TODAY), [demo, person.id])
  const peers = useMemo(() => swapPeers(demo, person), [demo, person])
  const peer = peers.find((p) => p.person.id === peerId)?.person
  const theirs = useMemo(() => (peer ? myAssignments(demo, peer.id).filter((a) => a.date >= TODAY) : []), [demo, peer])
  const mineShift = mine.find((a) => a.date === mineDate)

  // evaluate every shift of theirs once, so the chips can show fair / not fair
  const evals = useMemo(() => {
    const m = new Map<string, ReturnType<typeof evaluateSwap>>()
    if (peer && mineDate) for (const a of theirs) m.set(a.date, evaluateSwap(demo, person, mineDate, peer, a.date))
    return m
  }, [demo, person, peer, mineDate, theirs])

  // choose the first fair shift automatically, so the common case is two taps
  useEffect(() => {
    if (!peer || !mineDate) return setTheirDate(null)
    setTheirDate((cur) => (cur && evals.get(cur)?.ok ? cur : (theirs.find((a) => evals.get(a.date)?.ok)?.date ?? null)))
  }, [peer, mineDate, evals, theirs])

  const evaluation = theirDate ? evals.get(theirDate) : undefined
  const theirShift = theirs.find((a) => a.date === theirDate)
  const anyFair = [...evals.values()].some((e) => e.ok)
  const peerName = peer ? firstNameL(peer.name, lang) : ''
  const lines = evaluation && peer ? evaluation.checks.map((c) => checkLine(c, t, peerName)).filter((l): l is { ok: boolean; text: string } => !!l) : []
  // fold the many "ok" overtime/skill lines into one each; keep every failure
  const myRecords = demo.swaps.filter((s) => s.aId === person.id || s.bId === person.id)

  const send = async () => {
    if (!peer || !mineShift || !theirShift || !evaluation?.ok || phase !== 'idle') return
    setPhase('waiting')
    await sleep(reduce ? 200 : 1400)
    if (!alive.current) return
    const text = t('approved', { theirs: shiftOn(theirShift.shift, theirShift.date, lang), mine: shiftOn(mineShift.shift, mineShift.date, lang), name: peerName })
    mutate(() => void requestSwap({ aId: person.id, aDate: mineShift.date, bId: peer.id, bDate: theirShift.date }))
    setDoneText(text)
    setPhase('done')
    setMineDate(null)
    setPeerId(null)
    setTheirDate(null)
  }

  const label = 'text-[13px] font-bold uppercase tracking-[0.1em] text-forest'
  return (
    <div className="space-y-5">
      <p className="text-[15px] leading-relaxed text-pine/80">{t('swapIntro')}</p>

      <AnimatePresence initial={false}>
        {phase === 'done' && (
          <motion.p
            key="done"
            role="status"
            initial={reduce ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex gap-2 border-2 border-teal/40 bg-mist p-3.5 text-[15px] font-semibold leading-snug"
            style={{ borderRadius: '18px 8px 20px 10px' }}
          >
            <span className="mt-0.5 shrink-0">
              <StatusDot tone="ok" size={20} />
            </span>
            {doneText}
          </motion.p>
        )}
      </AnimatePresence>

      <section aria-label={t('stepMine')}>
        <h3 className={label}>{t('stepMine')}</h3>
        {mine.length === 0 ? (
          <p className="mt-2 text-sm text-stone">{t('noShiftsToSwap')}</p>
        ) : (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {mine.slice(0, 8).map((a) => (
              <ShiftChoice
                key={a.date}
                a={a}
                lang={lang}
                selected={mineDate === a.date}
                onPick={() => {
                  setMineDate(a.date)
                  setPhase('idle')
                }}
              />
            ))}
          </div>
        )}
      </section>

      {mineDate && (
        <section aria-label={t('stepWho')}>
          <h3 className={label}>{t('stepWho')}</h3>
          {peers.length === 0 ? (
            <p className="mt-2 text-sm text-stone">{t('noPeers')}</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {peers.map(({ person: p, shared }) => (
                <li key={p.id}>
                  <button
                    type="button"
                    aria-pressed={peerId === p.id}
                    onClick={() => setPeerId(p.id)}
                    className={`flex min-h-14 w-full items-center gap-3 px-3 text-left transition-colors ${peerId === p.id ? 'bg-pine text-paper shadow-warm' : 'border border-pine/15 bg-white/80'}`}
                    style={{ borderRadius: '14px 6px 14px 8px' }}
                  >
                    <span className={`grid h-10 w-10 shrink-0 place-items-center font-display text-lg font-black ${peerId === p.id ? 'bg-saffron text-pine' : 'bg-mist text-forest'}`} style={{ borderRadius: '12px 5px 12px 6px' }}>
                      {nameL(p.name, lang).charAt(0)}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[16px] font-bold leading-tight">{nameL(p.name, lang)}</span>
                      <span className={`block text-[12.5px] ${peerId === p.id ? 'text-mist/85' : 'text-pine/70'}`}>{t('sameSkill', { skill: skillL(shared, lang) })}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {peer && mineDate && (
        <section aria-label={t('stepTheirs')}>
          <h3 className={label}>{t('stepTheirs')}</h3>
          {!anyFair && <p className="mt-2 text-[14px] font-semibold text-terracotta">{t('noFairSwap', { name: peerName })}</p>}
          <div className="mt-2 grid grid-cols-2 gap-2">
            {theirs.slice(0, 10).map((a) => (
              <ShiftChoice key={a.date} a={a} lang={lang} selected={theirDate === a.date} ok={evals.get(a.date)?.ok} onPick={() => setTheirDate(a.date)} />
            ))}
          </div>
        </section>
      )}

      <section aria-label={t('fairness')} className="border border-pine/15 bg-white/70 p-4" style={{ borderRadius: '20px 8px 22px 10px' }}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-[18px] font-black">{t('fairness')}</h3>
          {evaluation && (
            <span className={`px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${evaluation.ok ? 'bg-teal/15 text-forest' : 'bg-terracotta/15 text-[#9a3b27]'}`} style={{ borderRadius: '6px 3px 6px 3px' }}>
              {evaluation.ok ? t('fairYes') : t('fairNo')}
            </span>
          )}
        </div>
        {lines.length === 0 ? (
          <p className="mt-2 text-[14px] text-pine/70">{t('chooseAbove')}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {lines.map((l, i) => (
              <li key={i} className={`flex items-start gap-2 text-[14.5px] leading-snug ${l.ok ? 'text-pine' : 'font-semibold text-[#9a3b27]'}`}>
                <span className="mt-0.5 shrink-0">
                  <StatusDot tone={l.ok ? 'ok' : 'risk'} size={15} />
                </span>
                {l.text}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div>
        <button
          type="button"
          onClick={send}
          disabled={!evaluation?.ok || phase !== 'idle'}
          aria-busy={phase === 'waiting'}
          className="min-h-14 w-full bg-saffron px-4 text-[17px] font-black text-pine shadow-warm transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
          style={{ borderRadius: '18px 7px 20px 9px' }}
        >
          {phase === 'waiting' ? t('waiting', { name: peerName }) : t('ask', { name: peerName || '…' })}
        </button>
        <p className="mt-2 text-center text-[12px] text-stone">{t('demoAccept')}</p>
      </div>

      {myRecords.length > 0 && (
        <section aria-label={t('yourSwaps')}>
          <h3 className={label}>{t('yourSwaps')}</h3>
          <ul className="mt-2 space-y-2">
            {myRecords.map((s) => {
              const iAmA = s.aId === person.id
              const other = demo.people.find((p) => p.id === (iAmA ? s.bId : s.aId))!
              const give = demo.roster.assignments.find((a) => a.staffId === other.id && a.date === (iAmA ? s.aDate : s.bDate))
              const get = demo.roster.assignments.find((a) => a.staffId === person.id && a.date === (iAmA ? s.bDate : s.aDate))
              return (
                <li key={s.id} className="flex items-center justify-between gap-2 border border-teal/30 bg-mist p-3" style={{ borderRadius: '14px 6px 14px 8px' }}>
                  <span className="text-[14px] font-semibold leading-snug">
                    {t('swapLine', {
                      name: firstNameL(other.name, lang),
                      mine: give ? `${dateLabel(give.date, lang)}` : '',
                      theirs: get ? `${dateLabel(get.date, lang)}` : '',
                    })}
                  </span>
                  <button type="button" onClick={() => mutate(() => undoSwap(s.id))} className="min-h-11 shrink-0 px-3 text-[14px] font-bold text-forest underline decoration-saffron decoration-2 underline-offset-2">
                    {t('undo')}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
