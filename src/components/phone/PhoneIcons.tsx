interface IconProps {
  size?: number
}

const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

/** Calendar with a little sun. */
export function ShiftsIcon({ size = 26 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...base}>
      <path d="M4.2 7c0-1 .8-1.8 1.8-1.8h12c1 0 1.8.8 1.8 1.8v11.4c0 1-.8 1.8-1.8 1.8H6c-1 0-1.8-.8-1.8-1.8z" />
      <path d="M4.4 9.8h15.2M8.2 3.4v3.2M15.8 3.4v3.2" />
      <circle cx="12" cy="15" r="2.1" />
      <path d="M12 11.7v.6M12 17.7v.6M8.7 15h.6M14.7 15h.6" />
    </svg>
  )
}

/** Two arrows passing each other. */
export function SwapIcon({ size = 26 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...base}>
      <path d="M4 8.4h14.2M14.6 4.6l3.8 3.8-3.8 3.8" />
      <path d="M20 15.6H5.8M9.4 11.8l-3.8 3.8 3.8 3.8" />
    </svg>
  )
}

/** A simple smile. */
export function MoodIcon({ size = 26 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...base}>
      <path d="M12 3.6c4.6 0 8.2 3.5 8.2 8.2s-3.6 8.5-8.2 8.5-8.4-3.8-8.4-8.5S7.4 3.6 12 3.6z" />
      <path d="M8.9 14.2c1.8 2 4.4 2 6.2 0" />
      <path d="M9.2 9.8v.4M14.8 9.8v.4" strokeWidth="2.4" />
    </svg>
  )
}

/** A sapling growing out of a step. */
export function GrowIcon({ size = 26 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...base}>
      <path d="M12 20.4v-8.6" />
      <path d="M12 12.4c0-3.4-2.2-5.2-5.6-5.2.1 3.2 2 5.2 5.6 5.2z" />
      <path d="M12 10.2c0-3 1.9-4.8 5.4-4.8-.1 3-2 4.8-5.4 4.8z" />
      <path d="M5.4 20.4h13.2" />
    </svg>
  )
}

/** Hill, sun and a leaf: seasons. */
export function SeasonsIcon({ size = 26 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...base}>
      <path d="M2.8 19.2 9.4 8.4l3.4 5 2.2-2.6 6.2 8.4z" />
      <circle cx="17.6" cy="5.8" r="2.1" />
      <path d="M2.8 19.2h18.4" />
    </svg>
  )
}

/** Tiny pin used on the fixed weekly off. */
export function PinIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 14.4s4.4-3.8 4.4-7.4a4.4 4.4 0 0 0-8.8 0c0 3.6 4.4 7.4 4.4 7.4z" />
      <circle cx="8" cy="7" r="1.5" />
    </svg>
  )
}
