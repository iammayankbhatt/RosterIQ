import type { Staff } from '../../data/types'
import type { Demo } from '../../lib/demo'
import type { Lang, T } from '../../lib/staffText'

/** What every screen inside the phone receives. */
export interface ScreenProps {
  demo: Demo
  person: Staff
  lang: Lang
  t: T
  /** the demo clock, in ms */
  nowMs: number
  /** run a change to the shared demo state, then tell every screen to re-read it */
  mutate: (change: () => void) => void
}
