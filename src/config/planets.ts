/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  SOLAR SYSTEM DATA
 * ─────────────────────────────────────────────────────────────────────────────
 *  Art-directed, NOT to scale. Real relative sizes/distances would make the
 *  terrestrials invisible specks; instead radii and orbits are compressed for
 *  beauty while keeping the ordering and character of each world.
 *
 *  Everything the planet shaders need lives here, plus the info-card copy. To
 *  drop in real NASA/ESO textures later, add a `map`/`cloudMap` URL field and
 *  sample it in the shaders instead of the procedural noise (see README).
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type Vec3 = [number, number, number]

export interface Atmosphere {
  color: string
  intensity: number
  power: number
}

export interface CloudLayer {
  opacity: number
  speed: number
}

export interface RingConfig {
  /** Inner / outer radius as a multiple of the planet radius. */
  inner: number
  outer: number
  color: string
  opacity: number
  tilt: number // radians
}

export interface PlanetConfig {
  key: string
  name: string
  /** Display radius (art-directed). */
  radius: number
  /** Orbit radius from the sun. */
  orbit: number
  /** Orbital angular speed (radians/sec). */
  orbitSpeed: number
  /** Orbital inclination (radians) for depth. */
  inclination: number
  /** Starting orbital angle (radians) — spreads planets around the sun. */
  phase: number
  /** Axial spin speed (radians/sec). */
  spin: number
  /** Axial tilt (radians). */
  tilt: number
  /** Surface palette. */
  colorA: string
  colorB: string
  /** Procedural surface noise frequency. */
  surfaceFreq: number
  /** Latitude banding amount (gas giants → 1). */
  bands: number
  /** Earth-style ocean mask: 0 = none. */
  ocean: number
  oceanColor: string
  oceanLevel: number // noise threshold below which is ocean
  /** Warm night-side glow (city lights feel) — Earth only. */
  nightColor: string
  night: number
  atmosphere: Atmosphere | null
  clouds: CloudLayer | null
  ring: RingConfig | null
  /** Info-card copy. */
  card: { stat: string; line: string }
}

export const SUN = {
  radius: 7,
  colorDeep: '#b3360b',
  colorHot: '#ffd27a',
  brightness: 1.4,
  card: { name: 'The Sun', stat: '1,391,000 km', line: 'A cathedral lit by a single, patient flame.' },
}

export const PLANETS: PlanetConfig[] = [
  {
    key: 'mercury',
    name: 'Mercury',
    radius: 0.9,
    orbit: 15,
    orbitSpeed: 0.085,
    inclination: 0.06,
    phase: 0.4,
    spin: 0.05,
    tilt: 0.01,
    colorA: '#6f6862',
    colorB: '#b9b2a6',
    surfaceFreq: 0.9,
    bands: 0,
    ocean: 0,
    oceanColor: '#000000',
    oceanLevel: 0,
    nightColor: '#000000',
    night: 0,
    atmosphere: null,
    clouds: null,
    ring: null,
    card: { stat: '4,879 km across', line: 'Scorched and airless, nearest the fire.' },
  },
  {
    key: 'venus',
    name: 'Venus',
    radius: 1.5,
    orbit: 22,
    orbitSpeed: 0.064,
    inclination: 0.05,
    phase: 2.1,
    spin: -0.015,
    tilt: 0.05,
    colorA: '#caa24f',
    colorB: '#e8cf95',
    surfaceFreq: 0.6,
    bands: 0.3,
    ocean: 0,
    oceanColor: '#000000',
    oceanLevel: 0,
    nightColor: '#000000',
    night: 0,
    atmosphere: { color: '#ffd9a0', intensity: 1.0, power: 3.0 },
    clouds: { opacity: 0.85, speed: 0.018 },
    ring: null,
    card: { stat: '12,104 km across', line: 'A furnace sealed in endless cloud.' },
  },
  {
    key: 'earth',
    name: 'Earth',
    radius: 1.6,
    orbit: 30,
    orbitSpeed: 0.05,
    inclination: 0.0,
    phase: 4.0,
    spin: 0.22,
    tilt: 0.41,
    colorA: '#3b6b33',
    colorB: '#7a6a44',
    surfaceFreq: 1.1,
    bands: 0,
    ocean: 1,
    oceanColor: '#16467e',
    oceanLevel: 0.52,
    nightColor: '#ffca6e',
    night: 0.9,
    atmosphere: { color: '#6db3ff', intensity: 1.1, power: 3.2 },
    clouds: { opacity: 0.6, speed: 0.02 },
    ring: null,
    card: { stat: '12,742 km across', line: 'The pale blue dot — everyone you love, here.' },
  },
  {
    key: 'mars',
    name: 'Mars',
    radius: 1.1,
    orbit: 39,
    orbitSpeed: 0.04,
    inclination: 0.03,
    phase: 1.0,
    spin: 0.21,
    tilt: 0.44,
    colorA: '#8f3a1f',
    colorB: '#d98b5a',
    surfaceFreq: 1.0,
    bands: 0,
    ocean: 0,
    oceanColor: '#000000',
    oceanLevel: 0,
    nightColor: '#000000',
    night: 0,
    atmosphere: { color: '#ff9d6e', intensity: 0.4, power: 3.6 },
    clouds: null,
    ring: null,
    card: { stat: '6,779 km across', line: 'Rust and silence; a world that almost was.' },
  },
  {
    key: 'jupiter',
    name: 'Jupiter',
    radius: 4.2,
    orbit: 54,
    orbitSpeed: 0.026,
    inclination: 0.02,
    phase: 3.2,
    spin: 0.4,
    tilt: 0.05,
    colorA: '#9a6b44',
    colorB: '#d8b98a',
    surfaceFreq: 0.5,
    bands: 1.0,
    ocean: 0,
    oceanColor: '#000000',
    oceanLevel: 0,
    nightColor: '#000000',
    night: 0,
    atmosphere: { color: '#ffce9e', intensity: 0.5, power: 3.0 },
    clouds: { opacity: 0.35, speed: 0.05 },
    ring: null,
    card: { stat: '139,820 km across', line: 'A storm older than every human story.' },
  },
  {
    key: 'saturn',
    name: 'Saturn',
    radius: 3.6,
    orbit: 68,
    orbitSpeed: 0.019,
    inclination: 0.04,
    phase: 5.5,
    spin: 0.38,
    tilt: 0.47,
    colorA: '#b89a64',
    colorB: '#e3d3a6',
    surfaceFreq: 0.5,
    bands: 0.85,
    ocean: 0,
    oceanColor: '#000000',
    oceanLevel: 0,
    nightColor: '#000000',
    night: 0,
    atmosphere: { color: '#ffe6b0', intensity: 0.35, power: 3.0 },
    clouds: null,
    ring: { inner: 1.35, outer: 2.45, color: '#d9c8a0', opacity: 0.85, tilt: 0.47 },
    card: { stat: '116,460 km across', line: 'Crowned in ice and shattered moonlight.' },
  },
  {
    key: 'uranus',
    name: 'Uranus',
    radius: 2.4,
    orbit: 80,
    orbitSpeed: 0.014,
    inclination: 0.05,
    phase: 0.8,
    spin: 0.15,
    tilt: 1.71, // ~98°, rolls on its side
    colorA: '#7fbfc9',
    colorB: '#bfeef2',
    surfaceFreq: 0.4,
    bands: 0.3,
    ocean: 0,
    oceanColor: '#000000',
    oceanLevel: 0,
    nightColor: '#000000',
    night: 0,
    atmosphere: { color: '#bfeef2', intensity: 0.6, power: 3.0 },
    clouds: null,
    ring: { inner: 1.4, outer: 1.9, color: '#9fd6dd', opacity: 0.35, tilt: 1.71 },
    card: { stat: '50,724 km across', line: 'Tipped on its side, rolling through the dark.' },
  },
  {
    key: 'neptune',
    name: 'Neptune',
    radius: 2.3,
    orbit: 92,
    orbitSpeed: 0.011,
    inclination: 0.03,
    phase: 2.7,
    spin: 0.16,
    tilt: 0.49,
    colorA: '#274f9e',
    colorB: '#4f7fe0',
    surfaceFreq: 0.45,
    bands: 0.4,
    ocean: 0,
    oceanColor: '#000000',
    oceanLevel: 0,
    nightColor: '#000000',
    night: 0,
    atmosphere: { color: '#5a7bff', intensity: 0.75, power: 3.0 },
    clouds: { opacity: 0.3, speed: 0.04 },
    ring: null,
    card: { stat: '49,244 km across', line: 'The last lantern before the long night.' },
  },
]

/** Combined card data for the DOM overlay: index 0 = sun, 1..8 = planets. */
export const CARDS = [
  { name: SUN.card.name, stat: SUN.card.stat, line: SUN.card.line, index: 'I' },
  ...PLANETS.map((p, i) => ({
    name: p.name,
    stat: p.card.stat,
    line: p.card.line,
    index: ['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'][i],
  })),
]
