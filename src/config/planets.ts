/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  SOLAR SYSTEM DATA
 * ─────────────────────────────────────────────────────────────────────────────
 *  Art-directed, NOT to scale. Real relative sizes/distances would make the
 *  terrestrials invisible specks; instead radii and orbits are compressed for
 *  beauty while keeping the ordering and character of each world.
 *
 *  Everything the planet shaders need lives here, plus the info-card copy. Each
 *  planet carries a real NASA texture (`map`); the procedural fbm is only the
 *  fallback shown until the JPEG loads. Grounded-realism shading knobs (relief,
 *  terminatorSoftness, scatter, surfaceHaze, oceanGlint, aurora, bandFlow,
 *  redSpot) layer on top — see PlanetConfig and the README knob table.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type Vec3 = [number, number, number]

export interface Atmosphere {
  color: string
  intensity: number
  power: number
  /** When set, the atmosphere uses the forward-scattering shell (bright sunward
      limb + golden terminator arc) instead of the uniform glow. Strength ≈ 0..1.5. */
  forward?: number
}

export interface CloudLayer {
  opacity: number
  speed: number
  /** Cloud tint (defaults to white). */
  color?: string
  /** 0..1, higher = a more complete cloud deck (defaults to ~0.25). */
  coverage?: number
}

export interface RingConfig {
  /** Inner / outer radius as a multiple of the planet radius. */
  inner: number
  outer: number
  color: string
  opacity: number
  tilt: number // radians
  /** Back-lit forward-scatter glow strength (sparse regions glow when the view
      looks sunward through the rings). 0 = off. */
  forwardScatter?: number
  /** Optional radial colour gradient (inner → outer edge). Default: flat `color`. */
  colorInner?: string
  colorOuter?: string
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
  /** Optional equirectangular texture, relative to /textures/planets/. When
      present, the surface shader samples this instead of the procedural fbm. */
  map?: string
  /** Surface relief strength — perturbs the normal from the texture's luminance
      so craters/ridges self-shade at the terminator. 0 (default) = flat. */
  relief?: number
  /** Terminator width: 0 = razor-sharp (airless), 1 (default) = soft scattering
      edge for thick-atmosphere worlds. */
  terminatorSoftness?: number
  /** Warm atmospheric scatter band at the terminator. Defaults to off; tint
      falls back to the atmosphere colour when a strength is set without a colour. */
  scatter?: { color?: string; strength: number } | null
  /** Veil the surface toward `hazeColor` for cloud-shrouded worlds (Venus). 0 = off. */
  surfaceHaze?: number
  hazeColor?: string
  /** Per-planet vibrance multiplier on the final surface colour. 1 = realistic. */
  saturation?: number
  /** Tight sun glint on textured oceans (Earth). 0 = off. Mask is derived from
      the texture's blueness, so land/ice/cloud stay matte. */
  oceanGlint?: number
  /** Faint cool aurora near the poles on the night side. Off when omitted. */
  aurora?: { color: string; strength: number }
  /** Gas-giant differential band flow speed (belts/zones shear over time). 0 = off. */
  bandFlow?: number
  /** Great Red Spot: a swirling, enhanced vortex. `pos`/`size` are in texture UV. */
  redSpot?: { pos: [number, number]; size: [number, number]; strength: number; swirl: number; spin: number }
}

/**
 * Shared lighting for all planets (grounded realism). Sun is a point source at
 * the origin; night sides stay near-black with only a whisper of starlight so
 * they read as spheres rather than holes.
 */
export const PLANET_LIGHT = {
  sunColor: '#fff4ea',    // subtly warm white sunlight
  nightAmbient: 0.04,     // flat fill so the night side isn't pure black
  starlight: 0.07,        // faint starlight rim on the night limb
  starTint: '#41506e',    // cool starlight / nebula reflection tint
}

export const SUN = {
  radius: 7,
  colorDeep: '#b3360b',  // cool limb + intergranular lanes
  colorHot: '#ffd27a',   // mid photosphere
  colorCore: '#fff2e0',  // warm-white hottest core (G2V is ~white, kept warm)
  brightness: 1.4,
  /** Fine granulation contrast — real granules are subtle, so keep this low. */
  granuleContrast: 0.36,
  /** Real limb darkening. 0 = flat disk, 1 = strong dim + redden toward the edge. */
  limbDarkening: 0.55,
  /** Sunspots — cool dark patches. amount 0 = none (default for a clean disk). */
  sunspots: { amount: 0.0, darkness: 0.7 },
  /** Corona shell — faint, tight, pearly. Kept tight per art direction (not a wash). */
  coronaTint: '#ffe9cf',
  coronaPower: 4.5,
  coronaIntensity: 0.34,
  /** Broad soft halo that feeds Bloom in the wide shot. */
  haloColor: '#ffe3b0',
  haloIntensity: 0.5,
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
    map: 'mercury.jpg',
    // Airless: razor-sharp terminator, strong crater relief, no scatter.
    relief: 1.3,
    terminatorSoftness: 0.05,
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
    atmosphere: { color: '#ffdca6', intensity: 1.35, power: 2.4, forward: 1.3 },
    clouds: { opacity: 0.7, speed: 0.012, color: '#efe2bf', coverage: 0.5 },
    ring: null,
    card: { stat: '12,104 km across', line: 'A furnace sealed in endless cloud.' },
    map: 'venus.jpg',
    // Thick atmosphere: very soft terminator, warm scatter, surface only partly
    // visible through a pale cream haze (it's perpetually cloud-shrouded).
    terminatorSoftness: 1.4,
    scatter: { color: '#ffdca6', strength: 0.5 },
    surfaceHaze: 0.4,
    hazeColor: '#d8c9a0',
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
    night: 0.5,
    atmosphere: { color: '#6db3ff', intensity: 1.1, power: 3.2 },
    clouds: { opacity: 0.65, speed: 0.02, coverage: 0.32 },
    ring: null,
    card: { stat: '12,742 km across', line: 'The pale blue dot — everyone you love, here.' },
    map: 'earth.jpg',
    // Blue marble: tight ocean sun-glint + a faint cool aurora at the poles.
    oceanGlint: 1.4,
    aurora: { color: '#6affc0', strength: 0.5 },
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
    atmosphere: { color: '#e6a878', intensity: 0.38, power: 3.6 },
    clouds: null,
    ring: null,
    card: { stat: '6,779 km across', line: 'Rust and silence; a world that almost was.' },
    map: 'mars.jpg',
    // Thin atmosphere: sharp-ish terminator + rocky form-shading; moderate relief
    // for craters/Valles (dark regions are albedo, not height, so don't overdrive).
    relief: 0.6,
    terminatorSoftness: 0.3,
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
    clouds: { opacity: 0.2, speed: 0.05 },
    ring: null,
    card: { stat: '139,820 km across', line: 'A storm older than every human story.' },
    map: 'jupiter.jpg',
    // Banded storm flow: slow differential rotation + a defined, swirling GRS.
    bandFlow: 0.004,
    redSpot: { pos: [0.34, 0.615], size: [0.05, 0.035], strength: 0.8, swirl: 1.5, spin: 0.04 },
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
    ring: {
      inner: 1.35, outer: 2.45, color: '#e8c878', opacity: 0.95, tilt: 0.47, forwardScatter: 1.1,
      // Rich gold gradient (deep amber inner → bright pale-gold outer) for pop.
      colorInner: '#c98a3c', colorOuter: '#f6e6ad',
    },
    card: { stat: '116,460 km across', line: 'Crowned in ice and shattered moonlight.' },
    map: 'saturn.jpg',
    // Showpiece: push colour vibrance (not strictly realistic, just gorgeous).
    saturation: 1.55,
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
    ring: { inner: 1.4, outer: 1.9, color: '#9fd6dd', opacity: 0.35, tilt: 1.71, forwardScatter: 0.6 },
    card: { stat: '50,724 km across', line: 'Tipped on its side, rolling through the dark.' },
    map: 'uranus.jpg',
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
    map: 'neptune.jpg',
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
