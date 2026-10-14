import type { ReactElement } from 'react'
import { Topo } from '../Marks'

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

const POINTS: { title: string; body: string; icon: ReactElement }[] = [
  {
    title: 'Built from rules you can see',
    body: 'Every point comes from something on the roster or the record: days without a weekly off, overtime, short rests. Each reason shows the dates behind it.',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
        <path d="M2.6 12.2C5 7.6 8.4 5.6 12 5.6s7 2 9.4 6.6c-2.4 4.6-5.8 6.6-9.4 6.6s-7-2-9.4-6.6z" />
        <circle cx="12" cy="12.2" r="3" />
      </svg>
    ),
  },
  {
    title: 'A workload score, not a prediction',
    body: 'It says how heavy someone’s load is right now. It does not guess who will quit, and it says nothing about anyone’s character.',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
        <path d="M4 18.4h16M6.4 18.4v-5M11.2 18.4V8.6M16 18.4v-8.2" />
        <path d="M5 7.4c3-2.6 7.6-2.6 14 .8" strokeDasharray="1 3" />
      </svg>
    ),
  },
  {
    title: 'Alerts lead to support, never discipline',
    body: 'A high score is a nudge to lighten the load or have a kind conversation. It is never a reason for a warning, a deduction or a missed promotion.',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
        <path d="M12 20.2S4 15.4 4 9.8a4.2 4.2 0 0 1 8-1.8 4.2 4.2 0 0 1 8 1.8c0 5.6-8 10.4-8 10.4z" />
      </svg>
    ),
  },
  {
    title: 'People own their data',
    body: 'Staff can see their own score and the reasons, and ask for a correction. Everyone on this screen is a made-up sample person.',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
        <circle cx="8.6" cy="12" r="3.4" />
        <path d="M12 12h8.4M17.4 12v3M20.4 12v2" />
      </svg>
    ),
  },
]

export default function TrustPanel() {
  return (
    <section
      aria-labelledby="trust-title"
      className="relative -rotate-[0.6deg] overflow-hidden border border-forest/15 bg-mist p-6 shadow-warm sm:p-8"
      style={{ borderRadius: '34px 12px 38px 14px' }}
    >
      <Topo opacity={0.14} />
      <div className="relative">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-teal">A word before you act</p>
        <h2 id="trust-title" className="mt-1 text-3xl font-black leading-[0.98] tracking-[-0.03em] sm:text-4xl">
          Why you can trust this score
        </h2>
        <ul className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2">
          {POINTS.map((p, i) => (
            <li key={p.title} className={`flex gap-3.5 ${i % 2 ? 'sm:translate-y-3' : ''}`}>
              <span className="mt-0.5 grid h-11 w-11 shrink-0 place-items-center bg-paper text-forest shadow-warm" style={{ borderRadius: i % 2 ? '8px 16px 9px 15px' : '16px 8px 15px 9px' }}>
                {p.icon}
              </span>
              <span>
                <span className="block font-display text-lg font-bold leading-snug">{p.title}</span>
                <span className="mt-1 block text-[14.5px] leading-relaxed text-pine/80">{p.body}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
