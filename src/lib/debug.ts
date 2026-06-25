/**
 * Runtime debug toggles, driven by URL query params so they need no UI and can be
 * flipped per-tab. Used to bisect rendering issues on a specific GPU (e.g. a
 * full-screen black flicker that doesn't reproduce on the headless renderer).
 *
 * Examples:
 *   ?nobloom            → keep post, drop Bloom (does a NaN stop spreading?)
 *   ?nopost             → render the raw scene (no EffectComposer at all)
 *   ?norings            → hide planet rings
 *   ?noatmo&noclouds    → hide atmosphere + cloud shells
 *   ?nogalaxy&nonebula  → hide background layers
 *
 * All default to OFF (normal rendering) when the param is absent.
 */
const params =
  typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()

const has = (k: string) => params.has(k)

export const DEBUG = {
  noPost: has('nopost'),
  noBloom: has('nobloom'),
  noChroma: has('nochroma'),
  noRings: has('norings'),
  noAtmo: has('noatmo'),
  noClouds: has('noclouds'),
  noSolar: has('nosolar'),
  noGalaxy: has('nogalaxy'),
  noNebula: has('nonebula'),
  noStars: has('nostars'),
  noDust: has('nodust'),
  /** True if any debug flag is set — handy for a one-line console note. */
  get any() {
    return [...params.keys()].some((k) => k.startsWith('no'))
  },
}

if (DEBUG.any) {
  // eslint-disable-next-line no-console
  console.info('[debug] active toggles:', [...params.keys()].filter((k) => k.startsWith('no')).join(', '))
}
