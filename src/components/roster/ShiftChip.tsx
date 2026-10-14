import type { CellKind } from '../../lib/rosterView'
import { shiftTimes } from '../../lib/rosterView'
import { DeodarIcon } from '../Marks'

/** Uneven corners, rotated through so a row of chips never looks stamped. */
export const CHIP_RADII = ['13px 8px 12px 9px', '9px 13px 8px 12px', '12px 9px 13px 8px', '8px 12px 9px 13px']

/** Tiny glyphs so shifts never rely on colour alone: sun up, sun low, moon. */
export function Glyph({ kind }: { kind: 'M' | 'E' | 'N' }) {
  if (kind === 'M') {
    return (
      <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="8" cy="8" r="3" fill="currentColor" stroke="none" />
        <path d="M8 1.4v1.6M8 13v1.6M1.4 8H3M13 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1" />
      </svg>
    )
  }
  if (kind === 'E') {
    return (
      <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M3.4 11.2a4.7 4.7 0 0 1 9.2 0z" fill="currentColor" stroke="none" />
        <path d="M1.2 13.6h13.6M8 3.2v1.6M3 6l1.1 1.1M13 6l-1.1 1.1" />
      </svg>
    )
  }
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true" fill="none">
      <path d="M12.8 10.2A5.6 5.6 0 0 1 5.8 3.2a5.6 5.6 0 1 0 7 7z" fill="currentColor" />
      <circle cx="12" cy="3.6" r="1" fill="var(--saffron)" />
    </svg>
  )
}

/** A small hand-drawn "resting" mark: a hammock curve with a tick of sleep. */
export function RestMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.6 8.4c2.4 5.2 12.4 5.4 14.8-.2" />
      <path d="M2.4 5.6v5M17.6 5.4v5" />
      <path d="M8.2 3.6h2.6l-2.6 2.8h2.8" strokeWidth="1.2" />
    </svg>
  )
}

interface Style {
  label: string
  cls: string
}

export const CHIP: Record<CellKind, Style> = {
  M: { label: 'Morning', cls: 'bg-saffron text-pine shadow-[inset_0_-2px_0_rgba(18,48,43,.14)]' },
  E: { label: 'Evening', cls: 'bg-teal text-paper shadow-[inset_0_-2px_0_rgba(18,48,43,.22)]' },
  N: { label: 'Night', cls: 'bg-pine text-paper shadow-[inset_0_0_0_1px_rgba(251,248,241,.14)]' },
  X: { label: 'Off', cls: 'border border-dashed border-pine/30 bg-transparent text-pine/70' },
  L: { label: 'Leave', cls: 'border border-forest/20 bg-mist text-forest' },
}

/** The visual content of one chip. Always fills its parent. */
export function ChipFace({ kind, compact = false, mini = false }: { kind: CellKind | 'ghost'; compact?: boolean; mini?: boolean }) {
  if (kind === 'ghost') {
    return <span className="block h-full w-full rounded-[inherit] border border-dashed border-pine/15 bg-pine/[0.025]" aria-hidden="true" />
  }
  const s = CHIP[kind]
  if (mini) {
    // glyph only, for dense timelines
    return (
      <span className={`flex h-full w-full items-center justify-center rounded-[inherit] ${s.cls}`}>
        {kind === 'M' || kind === 'E' || kind === 'N' ? <Glyph kind={kind} /> : kind === 'X' ? <RestMark size={14} /> : <DeodarIcon size={9} className="text-forest" />}
      </span>
    )
  }
  return (
    <span className={`flex h-full w-full flex-col items-center justify-center rounded-[inherit] px-1 leading-none ${s.cls}`}>
      <span className="flex items-center gap-1 text-[12px] font-semibold tracking-[0.01em]">
        {kind === 'M' || kind === 'E' || kind === 'N' ? <Glyph kind={kind} /> : kind === 'X' ? <RestMark size={15} /> : <DeodarIcon size={9} className="text-forest" />}
        {compact ? s.label.slice(0, kind === 'L' ? 5 : 3) : s.label}
      </span>
      {kind !== 'X' && kind !== 'L' && !compact && <span className="mt-[3px] text-[10px] font-medium opacity-85">{shiftTimes(kind)}</span>}
    </span>
  )
}

export function ChipLegend() {
  const items: CellKind[] = ['M', 'E', 'N', 'X', 'L']
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-pine/80" aria-label="Key to shift colours">
      {items.map((k, i) => (
        <li key={k} className="flex items-center gap-1.5">
          <span className="block h-6 w-12" style={{ borderRadius: CHIP_RADII[i % 4] }}>
            <ChipFace kind={k} mini />
          </span>
          <span>{k === 'X' ? 'Day off' : k === 'L' ? 'Approved leave' : `${CHIP[k].label} ${shiftTimes(k)}`}</span>
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span className="relative block h-4 w-6 rounded-[6px] bg-saffron/40 ring-[3px] ring-saffron ring-offset-1 ring-offset-paper" aria-hidden="true" />
        <span>Changed by a fix or swap</span>
      </li>
      <li className="flex items-center gap-1.5">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M8 1.3 15 14.2H1z" fill="var(--terracotta)" stroke="var(--terracotta)" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M8 6v4" stroke="var(--paper)" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="8" cy="12" r=".9" fill="var(--paper)" />
        </svg>
        <span>Breaks a rule or fairness</span>
      </li>
    </ul>
  )
}
