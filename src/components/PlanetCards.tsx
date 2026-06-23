import { useSyncExternalStore } from 'react'
import { CARDS } from '../config/planets'
import { solarStore } from '../lib/solarStore'

/**
 * Floating info-cards for the solar act. One card per body (sun + 8 planets);
 * the active one (driven by CameraRig via solarStore) fades/slides in while the
 * rest stay hidden. The container is aria-hidden because the same facts are
 * exposed accessibly in the Overlay's screen-reader list.
 */
export default function PlanetCards() {
  const active = useSyncExternalStore(
    solarStore.subscribe,
    solarStore.getSnapshot,
    solarStore.getSnapshot,
  )

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-20">
      {CARDS.map((c, i) => {
        const on = active === i
        return (
          <div
            key={c.name}
            className={`absolute bottom-[14vh] left-6 max-w-sm transition-all duration-700 ease-out md:left-16 ${
              on ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'
            }`}
          >
            <div className="mb-4 h-px w-16 bg-gradient-to-r from-glow-cyan/80 to-transparent" />
            <p className="label text-glow-cyan/70">
              {c.index} · {i === 0 ? 'The Star' : 'Planet'}
            </p>
            <h3 className="font-display mt-3 text-5xl font-medium leading-none md:text-7xl">
              {c.name}
            </h3>
            <p className="mt-4 text-sm tracking-wide text-white/45">{c.stat}</p>
            <p className="mt-3 max-w-xs text-lg italic text-white/70">{c.line}</p>
          </div>
        )
      })}
    </div>
  )
}
