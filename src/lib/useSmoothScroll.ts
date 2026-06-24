import { useEffect } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SCROLL, ACTS } from '../config/scene'
import { PLANETS } from '../config/planets'
import { flight } from './flight'

gsap.registerPlugin(ScrollTrigger)

/** The live Lenis instance, exposed so other modules can lock/unlock scroll. */
export let lenis: Lenis | null = null

/** Stop scrolling (used while the preloader is up). */
export function lockScroll() {
  lenis?.stop()
  document.documentElement.style.overflow = 'hidden'
  window.scrollTo(0, 0)
}

/** Resume scrolling (called on ignite). */
export function unlockScroll() {
  document.documentElement.style.overflow = ''
  lenis?.start()
  ScrollTrigger.refresh()
}

// ─── Snap points (global scroll progress 0..1) ──────────────────────────────
//
// Each planet segment in computeSolar uses smoothstep(f, solarDwellFrac, 1.0)
// so the camera DWELLS on stop k for f ∈ [0, solarDwellFrac] of segment k,
// then eases toward stop k+1.  The correct snap target is the MIDPOINT of that
// dwell: f = solarDwellFrac / 2 within segment k → localP = (k + dwellMid) / N.
//
// The previous formula (k + 0.5) / N landed at the MID-TRANSITION between two
// bodies where t≈7%, showing e.g. Venus instead of Earth.
const N = PLANETS.length
const DWELL_MID = ACTS.solarDwellFrac / 2  // must match CameraRig's dwell arg

const SOLAR_SNAPS: readonly number[] = Array.from({ length: N + 1 }, (_, k) => {
  // k = 0..N-1 : dwell midpoint for stop k (Sun through Uranus)
  // k = N      : Neptune has no outgoing segment — snap near end of last one
  // k=N (Neptune): it's the B-end of the last segment; t=1 only at localP=1.0
  const localP = k < N ? (k + DWELL_MID) / N : 1.0
  return ACTS.solarStart + localP * (ACTS.solarEnd - ACTS.solarStart)
})
// Singularity: single snap at the midpoint of the act (face-on to the disk).
const SINGULARITY_SNAP = (ACTS.singularityStart + ACTS.singularityEnd) / 2

/** Returns the nearest snap target for `progress`, or null if not in a snap zone. */
function findSnapTarget(progress: number): number | null {
  if (progress >= ACTS.solarStart && progress <= ACTS.solarEnd) {
    return SOLAR_SNAPS.reduce((best, sp) =>
      Math.abs(sp - progress) < Math.abs(best - progress) ? sp : best,
    )
  }
  if (progress >= ACTS.singularityStart && progress <= ACTS.singularityEnd) {
    return SINGULARITY_SNAP
  }
  return null
}

/**
 * Sets up smooth scrolling and a single page-level ScrollTrigger that writes
 * normalised scroll progress into `flight.scroll` for the camera rig.
 *
 *   - GSAP's ticker drives Lenis' rAF (one loop for everything)
 *   - Lenis' scroll event drives ScrollTrigger.update
 *   - A document-spanning ScrollTrigger maps scroll → flight.scroll (0..1)
 *   - After the user stops scrolling inside the solar or singularity acts,
 *     the page snaps to the nearest body's dwell centre via lenis.scrollTo.
 *
 * Under prefers-reduced-motion we skip Lenis (native scroll) but STILL track
 * progress, so section reveals work; the camera rig itself opts out of motion.
 */
export function useSmoothScroll(reducedMotion: boolean) {
  useEffect(() => {
    let instance: Lenis | null = null
    let tick: ((time: number) => void) | null = null
    let snapTimer: ReturnType<typeof setTimeout> | null = null
    let snapping = false

    if (!reducedMotion) {
      instance = new Lenis({
        lerp: SCROLL.lerp,
        wheelMultiplier: SCROLL.wheelMultiplier,
        smoothWheel: true,
      })
      lenis = instance

      instance.on('scroll', () => {
        ScrollTrigger.update()

        // Snap logic: debounce so it only fires after the user stops moving.
        if (snapping || SCROLL.snapDelay <= 0) return
        if (snapTimer) clearTimeout(snapTimer)
        snapTimer = setTimeout(() => {
          if (snapping || !instance) return
          const totalH = document.documentElement.scrollHeight - window.innerHeight
          if (totalH <= 0) return
          const progress = window.scrollY / totalH
          const target = findSnapTarget(progress)
          if (target !== null && Math.abs(target - progress) > 0.0005) {
            snapping = true
            instance.scrollTo(Math.round(target * totalH), {
              duration: SCROLL.snapDuration,
              easing: (t: number) => 1 - Math.pow(1 - t, 3),
              onComplete: () => {
                snapping = false
              },
            })
          }
        }, SCROLL.snapDelay)
      })

      tick = (time: number) => instance!.raf(time * 1000)
      gsap.ticker.add(tick)
      gsap.ticker.lagSmoothing(0)
    }

    // Page-level progress tracker — feeds the camera flight.
    const progress = ScrollTrigger.create({
      trigger: document.documentElement,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        flight.scroll = self.progress
      },
    })

    ScrollTrigger.refresh()

    return () => {
      if (snapTimer) clearTimeout(snapTimer)
      progress.kill()
      if (tick) gsap.ticker.remove(tick)
      instance?.destroy()
      lenis = null
    }
  }, [reducedMotion])
}
