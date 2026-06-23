import { useEffect, useState } from 'react'
import { lenis } from '../lib/useSmoothScroll'

export default function ScrollToTop({ reducedMotion }: { reducedMotion: boolean }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const check = () => setVisible(window.scrollY > window.innerHeight * 0.6)
    window.addEventListener('scroll', check, { passive: true })
    return () => window.removeEventListener('scroll', check)
  }, [])

  const scrollTop = () => {
    if (lenis) {
      lenis.scrollTo(0, { duration: 3, easing: (t) => 1 - Math.pow(1 - t, 3) })
    } else {
      window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' })
    }
  }

  return (
    <button
      onClick={scrollTop}
      aria-label="Back to top"
      data-cursor
      className={[
        'back-to-top fixed bottom-8 right-8 z-30',
        'flex h-10 w-10 items-center justify-center rounded-full border bg-void/80 backdrop-blur-sm',
        visible
          ? 'pointer-events-auto translate-y-0 border-white/15 text-white/50 opacity-100 hover:border-glow-cyan/40 hover:text-glow-cyan'
          : 'pointer-events-none translate-y-3 border-transparent text-transparent opacity-0',
      ].join(' ')}
    >
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
        <path
          d="M5.5 9.5V1.5M1.5 5.5l4-4 4 4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}
