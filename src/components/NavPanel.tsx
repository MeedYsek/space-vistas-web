import { useEffect, useState } from 'react'
import { flight } from '../lib/flight'
import { solarStore } from '../lib/solarStore'
import { lenis } from '../lib/useSmoothScroll'
import { ACTS } from '../config/scene'
import { PLANETS } from '../config/planets'

interface NavItem {
  id: string
  label: string
  numeral?: string
  /** Scroll target (0..1) used when the user clicks this item. */
  scrollTarget: number
  /** Used only for non-solar items: the item becomes active when flight.scroll >= this. */
  progress?: number
  sub?: boolean
}

const {
  heroEnd, solarStart, solarEnd, solarDwellFrac,
  galaxyStart, singularityStart, singularityEnd, vistasStart, outerStart,
} = ACTS

const N = PLANETS.length
const DWELL_MID = solarDwellFrac / 2

// Mirrors the formula in useSmoothScroll exactly (N+1 entries):
//   k=0..N-1 → dwell midpoint for stop k (Sun=0, Mercury=1, …, Uranus=N-1)
//   k=N      → Neptune (localP=1 → end of solar act)
const SOLAR_SNAPS_NAV = Array.from({ length: N + 1 }, (_, k) => {
  const localP = k < N ? (k + DWELL_MID) / N : 1.0
  return solarStart + localP * (solarEnd - solarStart)
})

const SINGULARITY_SNAP = (singularityStart + singularityEnd) / 2
const GALAXY_SNAP      = (ACTS.galaxyStart + ACTS.galaxyEnd) / 2
const VISTAS_SNAP      = ACTS.vistasStart + (ACTS.vistasEnd - ACTS.vistasStart) * 0.4
const RETURN_SNAP      = (ACTS.outerStart + 1.0) / 2

// The index in NAV_ITEMS where "The Sun" lives.  solarStore.active maps directly:
//   solarStore 0 (Sun)      → NAV_ITEMS[SOLAR_IDX + 0]
//   solarStore k (planet k) → NAV_ITEMS[SOLAR_IDX + k]
const SOLAR_IDX = 2

const NAV_ITEMS: NavItem[] = [
  { id: 'hero',        label: 'Departure',        numeral: 'I',   scrollTarget: 0,                  progress: 0 },
  { id: 'solar',       label: 'Solar System',      numeral: 'II',  scrollTarget: solarStart,         progress: heroEnd },
  // Solar sub-items — active state driven by solarStore, not scroll progress.
  { id: 'sun',         label: 'The Sun',                           scrollTarget: SOLAR_SNAPS_NAV[0], sub: true },
  ...PLANETS.map((p, i) => ({
    id: p.key,
    label: p.name,
    scrollTarget: SOLAR_SNAPS_NAV[i + 1],   // stop i+1 = PLANETS[i]
    sub: true,
  })),
  { id: 'galaxy',      label: 'The Galaxy',        numeral: 'III', scrollTarget: GALAXY_SNAP,        progress: galaxyStart },
  { id: 'singularity', label: 'The Singularity',   numeral: 'IV',  scrollTarget: SINGULARITY_SNAP,   progress: SINGULARITY_SNAP },
  { id: 'vistas',      label: 'Deep-Space Vistas', numeral: 'V',   scrollTarget: VISTAS_SNAP,        progress: vistasStart },
  { id: 'return',      label: 'Return',             numeral: 'VI',  scrollTarget: RETURN_SNAP,        progress: outerStart },
]

const VISIBLE = 5
const ITEM_H = 38

export default function NavPanel({
  ignited,
  isMobile,
}: {
  ignited: boolean
  isMobile: boolean
}) {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    let rafId: number
    let last = -1

    const tick = () => {
      const planet = solarStore.getSnapshot()

      let ai: number
      if (planet >= 0) {
        // Camera is actively focused on a solar body — use solarStore directly.
        // solarStore 0 = Sun, 1..8 = Mercury..Neptune → NAV_ITEMS[SOLAR_IDX + planet]
        ai = SOLAR_IDX + planet
      } else {
        // Outside the solar act — find the last non-sub item whose progress <= scroll.
        const p = flight.scroll
        ai = 0
        for (let i = 0; i < NAV_ITEMS.length; i++) {
          const item = NAV_ITEMS[i]
          if (!item.sub && item.progress !== undefined && item.progress <= p) ai = i
        }
      }

      if (ai !== last) {
        last = ai
        setActiveIndex(ai)
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  const navigate = (scrollTarget: number) => {
    const totalH = document.documentElement.scrollHeight - window.innerHeight
    if (totalH <= 0) return
    if (lenis) {
      lenis.scrollTo(Math.round(scrollTarget * totalH), {
        duration: 1.4,
        easing: (t: number) => 1 - (1 - t) ** 3,
      })
    } else {
      window.scrollTo({ top: Math.round(scrollTarget * totalH), behavior: 'smooth' })
    }
  }

  if (isMobile) return null

  const panelH = VISIBLE * ITEM_H
  const center = Math.floor(VISIBLE / 2)
  const raw = -(activeIndex - center) * ITEM_H
  const translateY = Math.max(-(NAV_ITEMS.length - VISIBLE) * ITEM_H, Math.min(0, raw))

  return (
    <nav
      aria-label="Section navigation"
      className={`fixed right-8 top-1/2 z-50 -translate-y-1/2 transition-opacity duration-700 ${
        ignited ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <div
        className="overflow-hidden"
        style={{
          height: panelH,
          maskImage: `linear-gradient(to bottom, transparent, black ${ITEM_H}px, black ${panelH - ITEM_H}px, transparent)`,
          WebkitMaskImage: `linear-gradient(to bottom, transparent, black ${ITEM_H}px, black ${panelH - ITEM_H}px, transparent)`,
        }}
      >
        <ul
          style={{
            transform: `translateY(${translateY}px)`,
            transition: 'transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        >
          {NAV_ITEMS.map((item, i) => {
            const isActive = i === activeIndex
            return (
              <li
                key={item.id}
                style={{ height: ITEM_H }}
                className="flex items-center justify-end"
              >
                <button
                  onClick={() => navigate(item.scrollTarget)}
                  className="group flex items-center gap-2 text-right"
                >
                  <span
                    className={`leading-none transition-all duration-300 ${
                      item.sub
                        ? `pl-4 text-[10px] tracking-widest ${
                            isActive
                              ? 'text-white/90'
                              : 'text-white/20 group-hover:text-white/50'
                          }`
                        : `font-display text-[9px] uppercase tracking-[0.3em] ${
                            isActive
                              ? 'text-white'
                              : 'text-white/30 group-hover:text-white/60'
                          }`
                    }`}
                  >
                    {item.numeral && (
                      <span
                        className={`mr-1.5 transition-colors duration-300 ${
                          isActive ? 'text-glow-cyan' : 'text-glow-cyan/40'
                        }`}
                      >
                        {item.numeral} ·
                      </span>
                    )}
                    {item.label}
                  </span>

                  <span
                    className={`h-[3px] w-[3px] flex-shrink-0 rounded-full bg-glow-cyan transition-all duration-300 ${
                      isActive ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
