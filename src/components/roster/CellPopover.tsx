import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CellExplanation } from '../../lib/rosterView'
import { StatusDot } from '../Marks'

export interface PopoverAnchor {
  rect: DOMRect
  /** opened by click, tap or Enter: stays until dismissed */
  pinned: boolean
}

const TONE = {
  ok: 'text-pine',
  note: 'text-pine/80',
  warn: 'text-terracotta',
} as const

/**
 * Explains one assignment. A hover or focus preview never takes the pointer;
 * a pinned one has a close button. On phones it docks above the tab bar as a sheet.
 */
export default function CellPopover({
  id,
  anchor,
  content,
  mobile,
  onClose,
}: {
  id: string
  anchor: PopoverAnchor
  content: CellExplanation
  mobile: boolean
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (mobile) return
    const el = ref.current
    if (!el) return
    const w = el.offsetWidth
    const h = el.offsetHeight
    const r = anchor.rect
    const vw = window.innerWidth
    const vh = window.innerHeight
    let top = r.bottom + 10
    if (top + h > vh - 12) top = Math.max(12, r.top - h - 10)
    const left = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), vw - w - 12)
    setPos({ top, left })
  }, [anchor, content, mobile])

  const body = (
    <div
      ref={ref}
      id={id}
      role="dialog"
      aria-label={`${content.heading}, ${content.detail}`}
      style={{
        borderRadius: '18px 8px 20px 10px',
        ...(mobile ? {} : { top: pos?.top ?? -9999, left: pos?.left ?? -9999, opacity: pos ? 1 : 0 }),
      }}
      className={`fixed z-[80] border border-pine/15 bg-paper p-4 shadow-lift ${anchor.pinned ? '' : 'pointer-events-none'} ${
        mobile ? 'inset-x-3 bottom-24 max-h-[55vh] overflow-y-auto' : 'w-[320px] max-w-[calc(100vw-24px)]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg font-bold leading-tight text-pine">{content.heading}</p>
          <p className="mt-0.5 text-xs font-medium text-stone">{content.detail}</p>
        </div>
        {anchor.pinned && (
          <button type="button" onClick={onClose} className="-mr-1 -mt-1 grid h-7 w-7 place-items-center rounded-full text-pine/60 hover:bg-pine/10 hover:text-pine" aria-label="Close explanation">
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
              <path d="M2 2l8 8M10 2l-8 8" />
            </svg>
          </button>
        )}
      </div>
      <ul className="mt-3 space-y-2">
        {content.reasons.map((r, i) => (
          <li key={i} className={`flex items-start gap-2 text-[13px] leading-snug ${TONE[r.tone]}`}>
            <span className="mt-[3px] shrink-0">
              <StatusDot tone={r.tone === 'warn' ? 'risk' : r.tone === 'ok' ? 'ok' : 'idle'} size={12} />
            </span>
            <span>{r.text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
  return createPortal(body, document.body)
}
