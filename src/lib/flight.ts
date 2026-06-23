/**
 * Shared "flight" state for the scroll-driven camera.
 *
 * Like lib/pointer.ts, this is a tiny mutable singleton read inside the R3F
 * render loop. Keeping it outside React state avoids re-rendering the whole tree
 * on every scroll tick — ScrollTrigger writes `scroll` here, GSAP tweens `warp`
 * and `introZ` on ignite, and <CameraRig /> reads all three each frame.
 */
import { FLIGHT } from '../config/scene'

export const flight = {
  /** Normalised scroll progress through the whole page, 0..1. */
  scroll: 0,
  /** Star-stretch amount during the ignite (1 → 0). */
  warp: 0,
  /** Extra camera z-offset; starts pushed back, eases to 0 on ignite. */
  introZ: FLIGHT.introZ,
}
