import { SHIFT_INFO, fmtDate } from '../../engine'
import type { Staff } from '../../data/types'
import type { CellChange } from '../../lib/demo'
import { Tag } from '../ui'

const word = (s: CellChange['before']) => (s ? SHIFT_INFO[s].label : 'Off')

/**
 * Lists every shift a manager fix or a swap has moved, so a change made on another screen
 * can be found here in one glance. Each row jumps to its day.
 */
export default function ChangesPanel({ changes, people, onShow }: { changes: CellChange[]; people: Staff[]; onShow: (date: string) => void }) {
  const name = (id: string) => people.find((p) => p.id === id)?.name ?? id
  const shown = changes.slice(0, 8)
  return (
    <section aria-label="Shifts changed since the roster was written" className="relative border-2 border-saffron/70 bg-[#fdf1da] p-4 sm:p-5" style={{ borderRadius: '22px 9px 24px 11px' }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl font-black tracking-[-0.02em]">Changed since the roster was written</h2>
        <Tag tone="saffron" tilt={2}>
          {changes.length} {changes.length === 1 ? 'shift' : 'shifts'}
        </Tag>
      </div>
      <p className="mt-1 text-[13.5px] leading-snug text-pine/80">A manager fix or a swap moved these. They are ringed in saffron on the grid, and the same changes show on each person's phone.</p>
      <ul className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {shown.map((c) => (
          <li key={`${c.staffId}|${c.date}`} className="flex items-center justify-between gap-2 border-b border-dotted border-pine/25 pb-1.5 text-[14px]">
            <span className="min-w-0">
              <strong>{name(c.staffId)}</strong>
              <span className="text-pine/75">
                {' '}
                · {fmtDate(c.date)} · {word(c.before)} → {word(c.after)}
              </span>
            </span>
            <button type="button" onClick={() => onShow(c.date)} className="min-h-9 shrink-0 px-1 text-sm font-semibold text-forest underline decoration-saffron decoration-2 underline-offset-2">
              Show
            </button>
          </li>
        ))}
      </ul>
      {changes.length > shown.length && <p className="mt-2 text-xs text-stone">and {changes.length - shown.length} more</p>}
    </section>
  )
}
