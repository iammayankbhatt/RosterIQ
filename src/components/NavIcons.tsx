import type { ReactElement } from 'react'

interface IconProps {
  size?: number
}

const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

/** Hand-drawn feel: slightly off-square lines, round caps. */
export function HomeIcon({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...base}>
      <path d="M3.2 11.6 12 4.2l8.9 7.5" />
      <path d="M5.6 10.4V19.6c0 .5.4.9.9.9h3.6v-5.2h3.9v5.2h3.5c.5 0 .9-.4.9-.9v-9.2" />
      <path d="M17 6.4V4.1" />
    </svg>
  )
}

export function RosterIcon({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...base}>
      <path d="M4.4 6.2c0-.9.7-1.6 1.6-1.6h12c.9 0 1.6.7 1.6 1.6v12.4c0 .9-.7 1.6-1.6 1.6H6c-.9 0-1.6-.7-1.6-1.6z" />
      <path d="M4.6 9.6h14.8" />
      <path d="M8.2 3v3M15.8 3v3" />
      <path d="M8 13.2h2.2M13.6 13.2h2.4M8 16.6h2.2M13.6 16.6h1.6" />
    </svg>
  )
}

export function RiskIcon({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...base}>
      <circle cx="9" cy="8.2" r="3" />
      <path d="M3.4 19.4c.3-3.2 2.6-5.1 5.6-5.1s5.3 1.9 5.6 5.1" />
      <path d="M18.2 5.4 21 10.8h-5.6z" />
      <path d="M18.2 7.6v1.5M18.2 10.1v.01" />
    </svg>
  )
}

/** Three people, the one in front a little bigger. */
export function TeamIcon({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...base}>
      <circle cx="12" cy="8.6" r="3.1" />
      <path d="M6.6 19.6c.3-3.3 2.6-5.3 5.4-5.3s5.1 2 5.4 5.3" />
      <circle cx="5" cy="10.4" r="2" />
      <path d="M1.8 17.8c.2-2 1.5-3.2 3.2-3.2" />
      <circle cx="19" cy="10.4" r="2" />
      <path d="M22.2 17.8c-.2-2-1.5-3.2-3.2-3.2" />
    </svg>
  )
}

export function StaffAppIcon({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...base}>
      <path d="M7.2 3.2h9.6c.9 0 1.6.7 1.6 1.6v14.4c0 .9-.7 1.6-1.6 1.6H7.2c-.9 0-1.6-.7-1.6-1.6V4.8c0-.9.7-1.6 1.6-1.6z" />
      <path d="M10.2 5.6h3.6" />
      <path d="M12 17.8v.01" />
      <path d="M12 8.2 9.2 12.6h1.8L9.6 15.4h4.8L13 12.6h1.8z" />
    </svg>
  )
}

export function ResetIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...base}>
      <path d="M4.4 12a7.6 7.6 0 1 0 2.3-5.4" />
      <path d="M4.2 4.2v3.8h3.8" />
    </svg>
  )
}

export const navItems: { to: string; label: string; short: string; Icon: (p: IconProps) => ReactElement }[] = [
  { to: '/', label: 'Home', short: 'Home', Icon: HomeIcon },
  { to: '/roster', label: 'Roster', short: 'Roster', Icon: RosterIcon },
  { to: '/at-risk', label: 'People at risk', short: 'At risk', Icon: RiskIcon },
  { to: '/employees', label: 'Team dashboard', short: 'Team', Icon: TeamIcon },
  { to: '/staff-app', label: 'Staff app', short: 'Staff', Icon: StaffAppIcon },
]
