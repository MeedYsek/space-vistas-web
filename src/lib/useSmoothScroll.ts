import { useEffect } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SCROLL } from '../config/scene'
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

/**
 * Sets up smooth scrolling and a single page-level ScrollTrigger that writes
 * normalised scroll progress into `flight.scroll` for the camera rig.
 *
 *   - GSAP's ticker drives Lenis' rAF (one loop for everything)
 *   - Lenis' scroll event drives ScrollTrigger.update
 *   - A document-spanning ScrollTrigger maps scroll → flight.scroll (0..1)
 *
 * Under prefers-reduced-motion we skip Lenis (native scroll) but STILL track
 * progress, so section reveals work; the camera rig itself opts out of motion.
 */
export function useSmoothScroll(reducedMotion: boolean) {
  useEffect(() => {
    let instance: Lenis | null = null
    let tick: ((time: number) => void) | null = null

    if (!reducedMotion) {
      instance = new Lenis({
        lerp: SCROLL.lerp,
        wheelMultiplier: SCROLL.wheelMultiplier,
        smoothWheel: true,
      })
      lenis = instance
      instance.on('scroll', ScrollTrigger.update)
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
      progress.kill()
      if (tick) gsap.ticker.remove(tick)
      instance?.destroy()
      lenis = null
    }
  }, [reducedMotion])
}
