/**
 * Minimal external store for the currently-focused solar body.
 *   -1 = none (outside the solar act)
 *    0 = the sun, 1..8 = planets (indexes into config/planets CARDS)
 *
 * Written from the R3F loop (CameraRig) and read by the DOM <PlanetCards />
 * via useSyncExternalStore. It only notifies when the integer index changes, so
 * scrolling doesn't thrash React with per-frame renders.
 */
let active = -1
const listeners = new Set<() => void>()

export const solarStore = {
  setActive(next: number) {
    if (next !== active) {
      active = next
      listeners.forEach((l) => l())
    }
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  getSnapshot() {
    return active
  },
}
