import type { ReactNode } from 'react'
import type { Lang } from '../../lib/staffText'

/**
 * A tasteful device frame: a pine bezel with slightly uneven corners, a camera island,
 * side keys and a home bar. `lang` is set on the screen so Hindi text picks up Devanagari fonts.
 */
export default function PhoneFrame({ lang, children }: { lang: Lang; children: ReactNode }) {
  return (
    <div className="relative mx-auto w-[min(100%,376px)] md:rotate-[0.7deg]">
      {/* side keys */}
      <span className="absolute -left-[3px] top-[104px] h-8 w-[4px] rounded-l-sm bg-pine/90" aria-hidden="true" />
      <span className="absolute -left-[3px] top-[152px] h-14 w-[4px] rounded-l-sm bg-pine/90" aria-hidden="true" />
      <span className="absolute -right-[3px] top-[136px] h-20 w-[4px] rounded-r-sm bg-pine/90" aria-hidden="true" />
      <div className="relative bg-pine p-[11px] shadow-[0_30px_50px_-20px_rgba(18,48,43,.55),0_8px_18px_rgba(122,84,30,.18)]" style={{ borderRadius: '50px 44px 52px 46px' }}>
        <div className="pointer-events-none absolute inset-[3px] ring-1 ring-inset ring-paper/15" style={{ borderRadius: 'inherit' }} aria-hidden="true" />
        <div lang={lang} className="relative flex h-[min(82vh,760px)] min-h-[620px] flex-col overflow-hidden bg-paper" style={{ borderRadius: '40px 35px 42px 37px' }}>
          {/* status bar */}
          <div className="relative z-10 flex h-11 shrink-0 items-end justify-between px-7 pb-1 text-[12px] font-bold text-pine" aria-hidden="true">
            <span>9:00</span>
            <span className="absolute left-1/2 top-2.5 h-[22px] w-[84px] -translate-x-1/2 rounded-full bg-pine" />
            <span className="flex items-center gap-1.5">
              <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor">
                <rect x="0" y="7" width="3" height="4" rx="1" />
                <rect x="4.3" y="4.8" width="3" height="6.2" rx="1" />
                <rect x="8.6" y="2.4" width="3" height="8.6" rx="1" />
                <rect x="12.9" y="0" width="3" height="11" rx="1" opacity=".3" />
              </svg>
              <svg width="22" height="11" viewBox="0 0 22 11" fill="none" stroke="currentColor" strokeWidth="1.3">
                <rect x=".7" y=".7" width="18" height="9.6" rx="2.6" />
                <rect x="2.4" y="2.4" width="11" height="6.2" rx="1.2" fill="currentColor" stroke="none" />
                <path d="M20.6 3.8v3.4" strokeLinecap="round" />
              </svg>
            </span>
          </div>
          {children}
          <span className="pointer-events-none absolute bottom-1.5 left-1/2 h-[4px] w-[110px] -translate-x-1/2 rounded-full bg-pine/70" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}
