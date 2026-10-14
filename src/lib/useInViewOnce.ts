import { useEffect, useState, type RefObject } from 'react'

/**
 * True once the element has been on screen. Checks the layout straight away (so anything
 * above the fold starts at once), then falls back to an IntersectionObserver.
 */
export function useInViewOnce(ref: RefObject<Element | null>, margin = '0px'): boolean {
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    const r = el.getBoundingClientRect()
    if (r.top < window.innerHeight * 0.98 && r.bottom > 0) {
      setSeen(true)
      return
    }
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true)
          io.disconnect()
        }
      },
      { rootMargin: margin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [ref, seen, margin])
  return seen
}
