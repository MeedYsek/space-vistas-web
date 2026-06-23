/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  CENTRAL CONTROL PANEL
 * ─────────────────────────────────────────────────────────────────────────────
 *  Almost every "feel" knob for the experience lives here so you can art-direct
 *  without hunting through components. Star counts, bloom, colours, scroll
 *  pacing and copy are all editable in one place.
 *
 *  Values are split into a desktop set and a lighter mobile set; the active set
 *  is chosen at runtime in <Experience /> based on device + reduced-motion.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/* ── Copy ──────────────────────────────────────────────────────────────────── */
export const HERO_TITLE = 'A CATHEDRAL OF NIGHT'
export const HERO_SUBTITLE = 'A slow drift through the deep — stars, dust and silence.'
export const HERO_KICKER = 'AN INTERACTIVE JOURNEY THROUGH THE COSMOS'

/* ── Palette ───────────────────────────────────────────────────────────────── */
/* Kept in sync with tailwind.config.js. Hex strings; the WebGL layers parse them. */
export const PALETTE = {
  void: '#05060A', // near-black background
  indigoDeep: '#1a1140',
  nebulaViolet: '#3a1d6e',
  nebulaMagenta: '#b5179e',
  nebulaTeal: '#1f9c8f',
  glowCyan: '#5ad7ff',
  glowMagenta: '#ff5ad2',
  glowAmber: '#ffb15a',
  starWarm: '#ffd9a0',
  starCool: '#bcd4ff',
  starWhite: '#ffffff',
} as const

/* ── Starfield ─────────────────────────────────────────────────────────────── */
export const STARFIELD = {
  /** Total stars. Drop this first if you need performance headroom. */
  count: 26000,
  /** Number of brighter "hero" stars with extra glow + cross flare. */
  heroCount: 60,
  /** Radius of the spherical shell stars are scattered through. */
  radius: 600,
  /** Global multiplier on point size (combine with per-star variation). */
  size: 22,
  /** Twinkle speed range (sine on alpha). */
  twinkleSpeed: [0.4, 1.6] as [number, number],
  /** Whole-field drift in radians/second (very slow rotation). */
  driftSpeed: 0.006,
}

/* ── Nebula ────────────────────────────────────────────────────────────────── */
export const NEBULA = {
  /** How many large additive cloud planes to scatter into the distance. */
  layers: 5,
  /** fbm octaves — more = richer but costlier. */
  octaves: 5,
  /** Drift speed of the noise field. */
  speed: 0.012,
  /** Overall opacity ceiling of the clouds. */
  intensity: 0.5,
}

/* ── Parallax dust (depth layers between camera and far stars) ─────────────── */
export const DUST = {
  /** [near, mid, far] layer particle counts. */
  counts: [1200, 2400, 4200] as [number, number, number],
  /** Parallax strength per layer (near layers move most with the pointer). */
  parallax: [0.9, 0.5, 0.22] as [number, number, number],
  /** Depth (z) each layer sits at. */
  depth: [-30, -120, -320] as [number, number, number],
}

/* ── Galaxy (Milestone 4 centerpiece) ──────────────────────────────────────── */
/**
 * A procedurally-generated spiral of additive particles, sitting far down the
 * −z axis (beyond the solar system) so it foreshadows the journey's destination
 * from the hero, then fills the frame as the camera arcs around it. Positions
 * are baked once; the shader spins the core faster than the rim.
 */
export const GALAXY = {
  /** Particle count. The wow factor — 120k looks lush; drop for headroom. */
  count: 120000,
  /** Disk radius (world units). */
  radius: 110,
  /** Number of spiral arms. */
  branches: 5,
  /** Arm winding, in turns across the radius (higher = tighter spiral). */
  armWind: 0.85,
  /** Scatter off the arm centreline (× radius). */
  randomness: 0.34,
  /** Power curve concentrating scatter toward the arm (higher = crisper arms). */
  randomnessPower: 2.6,
  /** Vertical disk thinness (× the radial scatter). */
  thickness: 0.16,
  /** Warm core → magenta mid → cool arm gradient. */
  insideColor: '#ffd9a0',
  midColor: '#ff5ad2',
  outsideColor: '#5ad7ff',
  /** Global point-size multiplier (small = crisp arms, less additive wash). */
  size: 6,
  /** Overall rotation speed (radians/sec at the core spin multiplier). */
  rotationSpeed: 0.05,
  /** Angular-speed multipliers: core spins fast, rim slow (differential shear). */
  coreSpin: 1.0,
  rimSpin: 0.32,
  /** Soft core-glow billboard intensity (0 = particles-only nucleus). */
  coreGlow: 0,
  /** World placement + disk tilt (radians) for a gentle 3/4 reveal. */
  position: [0, -6, -520] as [number, number, number],
  tilt: -0.22,
}

/* ── Deep-space vistas gallery (Milestone 5) ───────────────────────────────── */
/**
 * A row of large procedural plates the camera pans past, sitting between the
 * galaxy and the long return. Content (titles, palettes, kinds) lives in
 * config/vistas.ts; this is just the spatial layout + reveal feel.
 */
export const VISTAS = {
  /** Corridor depth (z) the plates float at. */
  z: -380,
  /** Half-width the plates spread across in x. */
  spreadX: 215,
  /** Per-plate y / z jitter for depth + parallax. */
  jitterY: 24,
  jitterZ: 42,
  /** Plate size (world units). */
  planeW: 140,
  planeH: 90,
  /** |camX − plateX| at which reveal ramps 1 → 0 (inner, outer). */
  revealBand: [48, 130] as [number, number],
}

/* ── Camera / pointer feel ─────────────────────────────────────────────────── */
export const CAMERA = {
  /** Initial Canvas camera position; CameraRig overrides it each frame per act. */
  start: [0, 6, 150] as [number, number, number],
  fov: 60,
  /** How far the camera leans toward the pointer (zero-G parallax). */
  pointerSway: 1.2,
  /** Easing factor for pointer follow (lower = floatier / heavier). */
  pointerEase: 0.025,
  /** Idle breathing amplitude + speed at the hero (fades out as you scroll). */
  idleAmplitude: 0.35,
  idleSpeed: 0.12,
}

/* ── Scroll-driven camera flight ───────────────────────────────────────────── */
/**
 * The camera is driven by three blended "acts" (see ACTS below):
 *   - HERO:  a fixed wide pose looking toward the distant sun.
 *   - SOLAR: follows the live planet positions, dwelling on each in turn.
 *   - OUTER: a short path on past the system toward the galaxy / the long dark.
 * The acts crossfade by scroll progress so it reads as one continuous flight.
 */
type Vec3 = [number, number, number]

export const FLIGHT = {
  /** Opening wide shot — the sun is a distant bloom among the stars. */
  hero: { pos: [0, 6, 150] as Vec3, look: [0, 0, 0] as Vec3 },

  /**
   * GALAXY act: a slow orbital arc around the galaxy centre (GALAXY.position).
   * The camera sweeps `sweep` radians of azimuth while the radius dips in then
   * eases out and the height descends — a cinematic fly-around of the centerpiece.
   */
  galaxy: {
    startAngle: 0.2, // arrive on the solar-system side of the galaxy
    sweep: -2.35, // total azimuth swept (radians)
    radius: [320, 280] as [number, number], // start → end orbital distance (frames the whole spiral)
    radiusDip: 30, // pulls closer through the middle of the arc
    height: [190, 125] as [number, number], // high → lower: look down on the spiral face, then drop to a 3/4 angle
    /** Pointer nudge while orbiting the galaxy. */
    orbitAzimuth: 0.22,
    orbitHeight: 18,
  },

  /**
   * VISTAS act: the camera pans the gallery corridor (plates float at VISTAS.z),
   * sweeping x from −panX → +panX with a gentle z-dolly, looking into the
   * corridor. Each plate reveals as it nears frame centre (see Vistas.tsx).
   */
  vistas: {
    panX: 230, // camera x sweeps −panX → +panX
    camZ: -250, // sits in front of the corridor
    camY: 12,
    dolly: 26, // z-dolly amplitude across the pan
    lookZ: -380, // look into the corridor depth
    lookLead: 0.85, // how much the look-x tracks the camera-x
  },

  /**
   * OUTER (return) act: poses lerped by local progress, peeling away until the
   * whole journey recedes to a single distant point of light. Pose 0 matches the
   * vistas-pan exit for a seamless hand-off (see CameraRig.computeVistas).
   */
  outer: [
    { pos: [230, 12, -250] as Vec3, look: [195, 2, -380] as Vec3 }, // vistas-pan exit
    { pos: [90, 64, -40] as Vec3, look: [0, 10, -320] as Vec3 }, // peeling back toward home
    { pos: [0, 120, 240] as Vec3, look: [0, 20, -380] as Vec3 }, // everything a distant point
  ] as { pos: Vec3; look: Vec3 }[],

  /** Solar focus framing. Camera distance = radius * focusBack + focusBase.
      The view direction is a blend of weights (NOT distances): tangential side +
      a pull toward the sun (so we frame the LIT hemisphere + terminator, never
      the dark night side) + a lift. */
  focusBack: 3.4,
  focusBase: 6.0,
  focusSide: 1.0, // tangential weight
  focusSunward: 0.6, // pull toward the sun → lit face visible
  focusUp: 0.5, // lift weight
  /** How far the pointer can orbit the view around a focused planet (radians). */
  orbitAzimuth: 0.6,
  orbitElevation: 0.32,

  /** Camera starts this far behind the hero pose, then eases to 0 on ignite. */
  introZ: 46,
  /** Duration of the ignite push (seconds). */
  introDuration: 1.9,
  /** Star-stretch amount at ignite (eases back to 0). */
  warpStart: 1.0,
}

/* ── Scroll "acts" (fractions of total page scroll) ────────────────────────── */
/**
 * These crossfade the camera between acts and decide when planet info-cards
 * show. They roughly track the DOM section heights in Overlay.tsx but don't
 * need to match exactly — both the camera and the cards read the same scroll
 * fraction, so they stay in sync regardless.
 */
export const ACTS = {
  heroEnd: 0.06,
  solarStart: 0.09,
  solarEnd: 0.45,
  galaxyStart: 0.485,
  galaxyEnd: 0.63,
  vistasStart: 0.665,
  vistasEnd: 0.86,
  outerStart: 0.89,
}

/* ── Preloader ─────────────────────────────────────────────────────────────── */
export const PRELOADER = {
  /** Minimum visible time so the ring read is satisfying even with no heavy
      assets yet. Real asset progress (later) takes over when it exceeds this. */
  minDuration: 2.2,
}

/* ── Post-processing ───────────────────────────────────────────────────────── */
export const POSTFX = {
  bloom: {
    intensity: 1.15,
    luminanceThreshold: 0.18,
    luminanceSmoothing: 0.9,
    mipmapBlur: true,
    radius: 0.7,
  },
  chromaticAberration: {
    offset: 0.0012, // subtle; pushes toward the frame edges
  },
  vignette: {
    offset: 0.18,
    darkness: 0.95,
  },
  filmGrain: {
    opacity: 0.06, // cinematic, not noisy
  },
}

/* ── Scroll pacing (used heavily from Milestone 2 onward) ──────────────────── */
export const SCROLL = {
  /** Lenis smoothing — higher lerp = snappier, lower = floatier. */
  lerp: 0.08,
  /** Multiplies wheel delta. <1 makes the long cosmic scroll feel weighty. */
  wheelMultiplier: 0.9,
  /** Total scroll length of the experience, in viewport heights. */
  pageHeightVH: 600,
}

/* ── Mobile overrides (merged over the above on small / low-power devices) ──── */
export const MOBILE = {
  starCount: 9000,
  heroCount: 24,
  galaxyCount: 34000,
  nebulaLayers: 3,
  dustCounts: [500, 900, 1500] as [number, number, number],
  disableChromaticAberration: true,
  disableFilmGrain: false,
  bloomIntensity: 0.85,
  maxPixelRatio: 1.75,
}

/** Clamp for devicePixelRatio on desktop (mobile uses MOBILE.maxPixelRatio). */
export const MAX_PIXEL_RATIO = 2
