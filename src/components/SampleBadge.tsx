/** A small, always-visible reminder that every name and figure is made up. */
export default function SampleBadge() {
  return (
    <div className="pointer-events-none fixed right-3 top-2 z-[45] rotate-[2deg] md:bottom-3 md:right-4 md:top-auto print:hidden" role="note" aria-label="Every name and figure in this app is sample data">
      <span
        className="inline-flex items-center gap-1.5 border border-saffron/70 bg-[#fdf1da]/95 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-pine shadow-warm"
        style={{ borderRadius: '9px 4px 9px 5px' }}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-saffron" aria-hidden="true" />
        Sample data
      </span>
    </div>
  )
}
