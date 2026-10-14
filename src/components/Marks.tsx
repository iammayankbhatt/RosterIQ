import { useId, useMemo } from 'react'

/** Hill-and-sun logo mark. */
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path d="M3 9c0-3.3 2.7-6 6-6h20c4.4 0 8 3.6 8 8v21c0 3.3-2.7 6-6 6H10C6 38 3 35 3 31V9z" fill="var(--pine)" />
      <circle cx="27.5" cy="13.5" r="4.6" fill="var(--saffron)" />
      <path d="M3 31 14 15.5l6.2 8.2 3.6-4.6L37 31v1.5c0 3-2.5 5.5-5.5 5.5H9C5.7 38 3 35.3 3 32z" fill="var(--teal)" />
      <path d="M14 15.5l2.8 3.9-2.7-1-2.4 1.9z" fill="var(--mist)" />
      <path d="M3 33.5c6-1.8 11-1.6 17-.2s12 1.2 17-.6" stroke="var(--forest)" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Logo />
      <span className={`font-display text-[22px] font-semibold leading-none ${light ? 'text-paper' : 'text-pine'}`}>
        Roster<span className="text-saffron">IQ</span>
      </span>
    </span>
  )
}

/** Deodar (Himalayan cedar): drooping tiers on a slim trunk. */
export function DeodarIcon({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size * 1.25} viewBox="0 0 32 40" fill="none" className={className} aria-hidden="true">
      <path d="M16 2 9.5 12.5c1.6-.3 3-.1 4.2.4L6 24c2-.5 3.9-.3 5.5.3L3.5 34.5c3.6-1.2 7.6-1.4 12.5-1.4s8.9.2 12.5 1.4L20.5 24.3c1.6-.6 3.5-.8 5.5-.3l-7.7-11.1c1.2-.5 2.6-.7 4.2-.4z" fill="currentColor" />
      <path d="M15 33.5h2V38h-2z" fill="var(--terracotta)" />
      <path d="M16 6v27" stroke="var(--paper)" strokeOpacity=".28" strokeWidth=".8" strokeLinecap="round" />
    </svg>
  )
}

type DotTone = 'ok' | 'watch' | 'risk' | 'idle'
const dotColour: Record<DotTone, string> = {
  ok: 'var(--teal)',
  watch: 'var(--saffron)',
  risk: 'var(--terracotta)',
  idle: 'var(--stone)',
}

/** Status dots each have a distinct silhouette, so they never rely on colour alone. */
export function StatusDot({ tone, size = 14, label }: { tone: DotTone; size?: number; label?: string }) {
  const c = dotColour[tone]
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {tone === 'ok' && (
        <>
          <circle cx="8" cy="8" r="6.6" fill={c} />
          <path d="M5 8.3l2.2 2.2L11.2 5.8" stroke="var(--paper)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </>
      )}
      {tone === 'watch' && (
        <>
          <path d="M8 1.2 14.8 8 8 14.8 1.2 8z" fill={c} />
          <path d="M8 4.8v4" stroke="var(--pine)" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="8" cy="11" r=".9" fill="var(--pine)" />
        </>
      )}
      {tone === 'risk' && (
        <>
          <path d="M8 1.3 15 14.2H1z" fill={c} strokeLinejoin="round" stroke={c} strokeWidth="1.2" />
          <path d="M8 6v4" stroke="var(--paper)" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="8" cy="12" r=".9" fill="var(--paper)" />
        </>
      )}
      {tone === 'idle' && <circle cx="8" cy="8" r="5.4" fill="none" stroke={c} strokeWidth="1.7" strokeDasharray="2.6 2" />}
    </svg>
  )
}

/** Hand-drawn wobbly underline for section titles. */
export function HandUnderline({ width = 140, className = '' }: { width?: number; className?: string }) {
  return (
    <svg width={width} height="12" viewBox="0 0 140 12" fill="none" preserveAspectRatio="none" className={className} aria-hidden="true">
      <path d="M2 7.5C18 3.8 30 9.6 47 6.2S78 3.6 93 7s30 1.2 45-2.2" stroke="var(--saffron)" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M12 10.2c20-2 38 .6 58-.8" stroke="var(--saffron)" strokeOpacity=".55" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/* ---------- Topographic contour background ---------- */

function contour(cx: number, cy: number, rx: number, ry: number, seed: number): string {
  const n = 28
  const pts: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const w = 1 + 0.09 * Math.sin(a * 3 + seed) + 0.05 * Math.sin(a * 5 + seed * 2.3) + 0.04 * Math.cos(a * 2 - seed)
    pts.push([cx + Math.cos(a) * rx * w, cy + Math.sin(a) * ry * w])
  }
  // Catmull-Rom → cubic Bézier for a smooth closed loop
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % n]
    const p3 = pts[(i + 2) % n]
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
  }
  return d + 'Z'
}

/** Faint hill-contour lines. Place inside a `relative overflow-hidden` parent. */
export function Topo({ className = '', stroke = 'var(--forest)', opacity = 0.14 }: { className?: string; stroke?: string; opacity?: number }) {
  const id = useId()
  const paths = useMemo(() => {
    const out: string[] = []
    // two hills, nested rings
    for (let k = 0; k < 11; k++) out.push(contour(300, 250, 40 + k * 36, 26 + k * 24, 1.2 + k * 0.17))
    for (let k = 0; k < 9; k++) out.push(contour(880, 520, 30 + k * 40, 22 + k * 27, 4.1 + k * 0.21))
    for (let k = 0; k < 5; k++) out.push(contour(1000, 90, 24 + k * 34, 18 + k * 22, 2.7 + k * 0.3))
    return out
  }, [])
  return (
    <svg
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      viewBox="0 0 1200 700"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      aria-hidden="true"
    >
      <g id={id} stroke={stroke} opacity={opacity}>
        {paths.map((d, i) => (
          <path key={i} d={d} strokeOpacity={i % 5 === 0 ? 1 : 0.6} strokeWidth={i % 5 === 0 ? 1.4 : 0.9} />
        ))}
      </g>
    </svg>
  )
}
