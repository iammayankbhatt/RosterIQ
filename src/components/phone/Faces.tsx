/** Five hand-drawn style faces, 1 (really tough) to 5 (great). Wobbly outlines, one pen colour each. */

const COLOUR = ['var(--terracotta)', '#d98a3c', 'var(--stone)', 'var(--teal)', 'var(--forest)'] as const

/** An imperfect circle: radius drifts a little as it goes round, like a pen drawn by hand. */
function wobble(seed: number): string {
  const n = 40
  let d = ''
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.6
    const r = 21 + 0.9 * Math.sin(a * 2 + seed) + 0.6 * Math.sin(a * 4 + seed * 1.7)
    d += `${i ? 'L' : 'M'}${(26 + Math.cos(a) * r).toFixed(1)} ${(26 + Math.sin(a) * r).toFixed(1)}`
  }
  return d
}

const MOUTH = [
  'M16.5 36.5c3-5 6-6.4 9.5-6.4s6.6 1.4 9.5 6.4', // tough: deep frown
  'M17.5 35.4c2.6-3 5.2-3.8 8.5-3.8s5.9.8 8.5 3.8', // heavy: soft frown
  'M17.6 33.4c3 .5 5.8.6 8.4.5s5.4-.2 8.4-.7', // okay: flat, a little wavy
  'M17.2 31.2c2.8 4 5.6 5.2 8.8 5.2s6-1.2 8.8-5.2', // good: smile
  'M15.8 29.8c3.2 7.4 6.6 9.6 10.2 9.6s7-2.2 10.2-9.6c-6.6 1.2-13.8 1.2-20.4 0z', // great: open grin
] as const

export default function Face({ score, size = 56, selected = false }: { score: 1 | 2 | 3 | 4 | 5; size?: number; selected?: boolean }) {
  const c = COLOUR[score - 1]
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <path d={wobble(score * 1.3)} fill={selected ? c : 'var(--paper)'} fillOpacity={selected ? 0.2 : 1} stroke={c} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d={wobble(score * 1.3 + 2.4)} stroke={c} strokeOpacity="0.35" strokeWidth="1" strokeLinecap="round" transform="translate(.8 .6)" />
      {/* eyes: tough days get drooping brows */}
      {score <= 2 ? (
        <>
          <path d={score === 1 ? 'M15.4 18.4l6.4 2.2M36.6 18.4l-6.4 2.2' : 'M15.8 19.4l5.6.9M36.2 19.4l-5.6.9'} stroke={c} strokeWidth="2" strokeLinecap="round" />
          <circle cx="19" cy="24" r="1.7" fill={c} />
          <circle cx="33" cy="24" r="1.7" fill={c} />
        </>
      ) : score === 5 ? (
        <>
          <path d="M16.6 24c1.2-2.4 3.4-2.4 4.6 0M30.8 24c1.2-2.4 3.4-2.4 4.6 0" stroke={c} strokeWidth="2.2" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="19" cy="23.4" r="1.9" fill={c} />
          <circle cx="33" cy="23.4" r="1.9" fill={c} />
        </>
      )}
      <path d={MOUTH[score - 1]} stroke={c} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" fill={score === 5 ? c : 'none'} fillOpacity={score === 5 ? 0.25 : 0} />
      {score === 1 && <path d="M37.4 28.4c-1 1.8-1.4 3-.9 3.8.6.9 1.9.7 2.1-.6.2-1-.4-2-1.2-3.2z" fill="var(--teal)" fillOpacity=".55" />}
      {score >= 4 && <path d="M12.6 29.4h3.4M36 29.4h3.4" stroke="var(--terracotta)" strokeOpacity=".5" strokeWidth="2.2" strokeLinecap="round" />}
    </svg>
  )
}
