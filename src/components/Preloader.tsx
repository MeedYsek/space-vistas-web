import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { PRELOADER } from '../config/scene'

interface PreloaderProps {
  /** Fired the instant the count reaches 100 — this ignites the scene. */
  onComplete: () => void
}

const R = 54
const CIRC = 2 * Math.PI * R

/**
 * The opening loader: a thin progress ring filling around a single pulsing
 * star, with a percentage counting up. When it completes it ignites the scene
 * (via onComplete) and fades itself out over the top of the camera push — so
 * there's no hard cut, the void simply resolves into the starfield.
 *
 * The ring is driven directly via a DOM ref in GSAP's onUpdate callback so it
 * updates at the full 60 fps tick rate. Using React state alone would cause the
 * dashoffset to jump because React batches setPct calls and only re-renders a
 * handful of times per second, skipping most intermediate frames.
 */
export default function Preloader({ onComplete }: PreloaderProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const circleRef = useRef<SVGCircleElement>(null)
  const [pct, setPct] = useState(0)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    // Set initial dashoffset imperatively so it's hidden before the tween starts.
    circleRef.current?.setAttribute('stroke-dashoffset', String(CIRC))

    const counter = { v: 0 }
    const tween = gsap.to(counter, {
      v: 100,
      duration: PRELOADER.minDuration,
      ease: 'power1.inOut',
      onUpdate: () => {
        // Text counter: React state is fine — batched updates look smooth on text.
        setPct(Math.round(counter.v))
        // Ring: bypass React and write the attribute directly every GSAP tick.
        circleRef.current?.setAttribute(
          'stroke-dashoffset',
          String(CIRC * (1 - counter.v / 100)),
        )
      },
      onComplete: () => {
        onComplete() // ignite now; fade runs concurrently for a seamless handoff
        gsap.to(rootRef.current, {
          opacity: 0,
          duration: 0.85,
          ease: 'power2.inOut',
          onComplete: () => setHidden(true),
        })
      },
    })
    return () => {
      tween.kill()
    }
  }, [onComplete])

  if (hidden) return null

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-void"
      role="status"
      aria-live="polite"
      aria-label={`Loading ${pct} percent`}
    >
      <div className="relative h-[140px] w-[140px]">
        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
          {/* Track */}
          <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          {/* Progress — dashoffset is written imperatively via circleRef, not via React prop */}
          <circle
            ref={circleRef}
            cx="70"
            cy="70"
            r={R}
            fill="none"
            stroke="url(#ringGrad)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray={CIRC}
          />
          <defs>
            <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#5ad7ff" />
              <stop offset="100%" stopColor="#ff5ad2" />
            </linearGradient>
          </defs>
        </svg>

        {/* Pulsing star at the centre. */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="preloader-star" />
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="label text-white/40">Entering</p>
        <p className="font-display mt-2 text-2xl tabular-nums text-white/80">
          {String(pct).padStart(3, '0')}
          <span className="text-white/30">%</span>
        </p>
      </div>
    </div>
  )
}
