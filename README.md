# A Cathedral of Night

A scroll-driven, award-style WebGL journey through the cosmos — stars, dust,
nebulae, a solar-system orrery, a particle galaxy, a black-hole singularity and
deep-space vistas. Built with React + Vite + TypeScript, Three.js via React
Three Fiber, GSAP + Lenis smooth scrolling.

---

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

Build / preview a production bundle:

```bash
npm run build
npm run preview
```

Type-check only:

```bash
npm run typecheck
```

Requires Node 18+ (developed on Node 22).

---

## Where things live

```
src/
  config/
    scene.ts               ← THE control panel (read this first): palette, camera, acts, galaxy, vistas, postfx
    planets.ts             ← sun + 8 planets: radii, orbits, palettes, atmosphere/rings, card copy
    vistas.ts              ← gallery content: titles, kickers, captions, palettes, procedural kind, src + credit for real photos
  App.tsx                  ← device profile, smooth scroll, ignite flag, canvas + overlay + cursor
  lib/
    useSmoothScroll.ts      ← Lenis ↔ GSAP ticker ↔ ScrollTrigger (single clock) + scroll lock
    pointer.ts              ← shared mouse/gyro parallax store
    flight.ts               ← shared camera-flight state (scroll progress, warp, intro)
    solarStore.ts           ← which body is focused (drives the info-cards)
    useMagnetic.ts          ← magnetic-hover hook for buttons/links
  hooks/
    useDeviceProfile.ts     ← mobile / WebGL / low-power detection
    useReducedMotion.ts     ← prefers-reduced-motion
  components/
    Experience.tsx          ← the persistent <Canvas> (mounts once)
    Scene.tsx               ← scene graph (compositional)
    Preloader.tsx           ← ring + pulsing star + count, ignites the scene
    Overlay.tsx             ← ALL semantic DOM text (accessible layer)
    PlanetCards.tsx         ← floating planet info-cards (name / stat / poetic line)
    VistasSection.tsx       ← DOM gallery cards + GSAP FLIP lightbox
    AmbientAudio.tsx        ← optional Web-Audio drone toggle (off by default)
    Cursor.tsx              ← glowing custom cursor + trailing ring
    Reveal.tsx              ← per-word blur-in type reveal (IntersectionObserver)
    StaticFallback.tsx      ← no-WebGL CSS background
  three/
    CameraRig.tsx           ← camera director: hero/solar/galaxy/singularity/vistas/return acts + planet focus
    Starfield.tsx           ← 26k instanced shader stars (+ ignite warp)
    Nebula.tsx              ← additive fbm cloud planes
    ParallaxDust.tsx        ← 3 parallax depth layers
    PostFX.tsx              ← bloom / chromatic aberration / vignette / grain
    solar/
      SolarSystem.tsx       ← assembles sun + planets + orbit guides
      Sun.tsx               ← plasma surface + corona + halo
      Planet.tsx            ← surface + atmosphere + clouds + rings, orbit + spin
      Orbits.tsx            ← faint elliptical orbit guides
      planetRegistry.ts     ← live planet world positions (camera follows these)
    galaxy/
      Galaxy.tsx            ← 120k-particle spiral (baked positions, shader spin)
    singularity/
      Singularity.tsx       ← ray-marched lensed black hole (billboard) + soft polar jets
    vistas/
      Vistas.tsx            ← gallery plates: procedural imagery + noise-reveal, camera-driven
    shaders/
      noise.glsl.ts         ← shared simplex noise + fbm
      starfield.glsl.ts     ← star vertex/fragment (+ uWarp)
      nebula.glsl.ts        ← nebula vertex/fragment
      sun.glsl.ts           ← sun plasma + reusable additive glow + halo
      planet.glsl.ts        ← planet surface / clouds / rings
      galaxy.glsl.ts        ← galaxy particle spin (differential) + soft mote
      singularity.glsl.ts   ← photon-geodesic ray-march: lensed accretion disk + photon ring + Doppler, soft jet
      vistas.glsl.ts        ← procedural vista imagery + noise-displacement reveal wipe
```

Shaders are kept in their own `*.glsl.ts` modules (exported as template strings)
so they read like real shader files without needing an extra Vite GLSL plugin.

---

## The knobs (everything in `src/config/scene.ts`)

| What you want to change | Knob |
| --- | --- |
| **Hero title / subtitle / kicker** | `HERO_TITLE`, `HERO_SUBTITLE`, `HERO_KICKER` |
| **Colours** (also mirrored in `tailwind.config.js`) | `PALETTE` |
| **Star count** | `STARFIELD.count` (mobile: `MOBILE.starCount`) |
| **Star brightness / size** | `STARFIELD.size` — smaller = dimmer (currently 12) |
| **Bright "hero" stars** | `STARFIELD.heroCount` |
| **Twinkle / drift** | `STARFIELD.twinkleSpeed`, `STARFIELD.driftSpeed` |
| **Nebula richness** | `NEBULA.layers`, `NEBULA.octaves`, `NEBULA.intensity` |
| **Parallax depth layers** | `DUST.counts`, `DUST.parallax`, `DUST.depth` |
| **Camera float / sway** | `CAMERA.pointerSway`, `CAMERA.pointerEase`, `CAMERA.idle*` |
| **Camera flight path** (the scroll journey) | `FLIGHT.path` (poses), `FLIGHT.curveTension` |
| **Ignite push + star warp** | `FLIGHT.introZ`, `FLIGHT.introDuration`, `FLIGHT.warpStart` |
| **Preloader pacing** | `PRELOADER.minDuration` |
| **Scroll acts** (when each scene plays) | `ACTS.heroEnd / solarStart / solarEnd / galaxyStart / galaxyEnd / singularityStart / singularityEnd / vistasStart / vistasEnd / outerStart` |
| **Planet focus framing** | `FLIGHT.focusBack / focusBase / focusUp / focusSide` |
| **Pointer-orbit while focused** | `FLIGHT.orbitAzimuth`, `FLIGHT.orbitElevation` |
| **Planets** (size, orbit, colour, atmosphere, rings, copy) | `config/planets.ts` |
| **Sun** (size, colours, brightness) | `SUN` in `config/planets.ts` |
| **Galaxy brightness** | `GALAXY.brightness` — per-particle colour multiplier (currently 0.28) |
| **Galaxy** (particle count, arms, winding, gradient, size) | `GALAXY` in `config/scene.ts` |
| **Galaxy placement / tilt** | `GALAXY.position`, `GALAXY.tilt` |
| **Galaxy rotation** (overall + core/rim differential) | `GALAXY.rotationSpeed`, `GALAXY.coreSpin`, `GALAXY.rimSpin` |
| **Galaxy camera arc** (orbit radius, height, sweep) | `FLIGHT.galaxy` |
| **Singularity** (event horizon radius, disk inner/outer, jet length) | `SINGULARITY` in `config/scene.ts` |
| **Singularity camera arc** (orbit radius, height, sweep) | `FLIGHT.singularity` |
| **Vistas content** (titles, kickers, captions, palettes, kind, photos) | `config/vistas.ts` — add `src` + `credit` for real images |
| **Vistas layout** (corridor depth, spread, plate size, reveal band) | `VISTAS` in `config/scene.ts` |
| **Vistas camera pan** | `FLIGHT.vistas` |
| **Bloom** | `POSTFX.bloom.*` |
| **Chromatic aberration** | `POSTFX.chromaticAberration.offset` |
| **Vignette / film grain** | `POSTFX.vignette.*`, `POSTFX.filmGrain.opacity` |
| **Scroll pacing** | `SCROLL.lerp`, `SCROLL.wheelMultiplier`, `SCROLL.pageHeightVH` |
| **Mobile overrides** | `MOBILE.*` |

Tip: to dial in performance vs. beauty, lower `STARFIELD.count`, `NEBULA.layers`
and `POSTFX.bloom.intensity` first.

---

## Art direction baked in

- Near-black `#05060A` void with indigo/violet nebula tones and cyan/magenta/amber glows.
- **Sun-primary lighting** — planet night sides are near-black (`ambient 0.04`); the terminator and rim glow are the only other light. Corona shell is kept tight (`radius × 1.15`, sharp fresnel falloff) so the sun reads as a point source rather than a wash.
- Stars and galaxy are kept dim so bright objects (sun, planet-lit hemispheres) read clearly; bloom only fires on genuinely bright surfaces.
- Slow, weighty, zero-G motion (no snap, no bounce). Floaty pointer parallax.
- Film grain + vignette over the whole frame for a cinematic, non-clinical read.

---

## Accessibility, performance & degradation (all wired)

- **Semantic DOM** — all copy (hero, planet facts, vista captions, footer) is real
  HTML in `Overlay.tsx` behind the canvas: selectable, keyboard-navigable, with
  focus rings and `sr-only` equivalents for the floating cards + gallery. The
  experience is fully understandable with the 3D removed.
- **`prefers-reduced-motion`** — skips Lenis smoothing, cuts all camera flight
  (the camera holds at the hero) and idle breathing, disables magnetic/cursor lag
  and the FLIP/type-reveal animations (gentle fades only). Because the camera is
  pinned, the heavy scenes it would fly to (solar / galaxy / vistas) are **not
  mounted** at all — a calm static starfield + the full DOM narrative — and the
  tall scroll regions collapse to a single screen each.
- **Light path** (mobile **or** low-power desktop, `profile.isLowPower`) — trims
  star/galaxy/dust counts and nebula layers, drops chromatic aberration, lowers
  bloom, reduces the vista shader's fbm octaves (`uOctaves`) and hides the custom
  cursor (touch keeps native behaviour; parallax leans on the gyro).
- **No-WebGL** devices get `StaticFallback.tsx` (pure-CSS sky) instead of a blank
  screen, with the same `Overlay` on top.
- **`devicePixelRatio`** is clamped (≤2 desktop, ≤1.75 mobile); particles use
  instancing/`Points`, off-screen plates are frustum-culled, and Three resources
  are disposed on unmount.

---

## Real imagery — vistas gallery

Five NASA public-domain photos are already bundled in `public/textures/` and
wired into the gallery:

| File | Subject | Credit |
|---|---|---|
| `carina.jpg` | JWST Cosmic Cliffs — NGC 3324 | NASA, ESA, CSA, STScI |
| `andromeda.jpg` | M31 (GALEX + Spitzer composite) | NASA / JPL-Caltech |
| `aurora.jpg` | Aurora australis from the ISS | NASA / ISS |
| `lagoon.jpg` | Lagoon Nebula — M8 (Hubble) | NASA, ESA, STScI |
| `saturn.jpg` | Saturn — Cassini final approach | NASA / JPL-Caltech / SSI |

All are **public domain**. To add more: drop a JPEG into `public/textures/`,
then add `src: 'filename.jpg'` and `credit: '…'` to the matching entry in
`config/vistas.ts`. The shader swaps the procedural image for the photo on load
(cover-fit UV, aspect-ratio corrected); cards and the lightbox both show the
real photo.

**The planets are fully procedural (shader noise), not textured.** To use real
maps later, add a `map` URL to a planet in `config/planets.ts`, load it with
drei's `useTexture`, and sample it in `planet.glsl.ts` in place of the
`fbm(...)` surface term. NASA's planetary maps (e.g. the Blue Marble / SVS
texture sets) are public domain.

> ⚠️ ESO images are CC BY 4.0 (attribution required). Always check the specific
> image's licence page before shipping non-NASA material.

---

## Verification — project complete

**Verdict:** PASS · **Date:** 2026-06-23 · **Node:** v20.20.2 / Vite 6 /
Playwright headless Chromium · `tsc --noEmit` and `vite build` both clean.

Verified via Playwright (headless Chromium runs `requestAnimationFrame`, unlike a
backgrounded preview tab) with real wheel-scrolling end-to-end:

1. **Preloader → ignite** — ring + pulsing star + count, then the camera push and
   hero resolving from blur, no hard cut.
2. **Solar act** — real scroll frames each planet at its dwell centre with the
   matching info-card (e.g. Earth → "the pale blue dot"); Saturn's rings, the
   galaxy foreshadowed in the distance.
3. **Galaxy act** — the 120k-point spiral arcs from a high 3/4 view down to a
   dramatic angle; warm core, cool arms, differential spin.
4. **Vistas act** — procedural plates resolve via the noise wipe as the camera
   pans; DOM gallery cards open full-screen with the GSAP FLIP lightbox.
5. **Return** — the gallery fades and the journey collapses to a distant point of
   light; the floating footer (newsletter, socials, ambient-drone toggle) reads
   over a scrim.
6. **Custom cursor**, magnetic CTA, and per-word type reveals all fire.
7. **Mobile** (390×844, touch) renders the full light path; **reduced-motion**
   pins the camera and drops the heavy scenes (35 meshes → 5) with the page
   collapsed to compact sections; **no console/page errors** in any run.

### Architecture note — canvas positioning

The "pitch black during the solar scroll" symptom was **not** a headless GPU
limitation — it reproduced in Chrome and Safari. Root cause: the persistent
`<Canvas>` was being positioned with the `.experience-canvas` **stylesheet
class** (`position: fixed; inset: 0`), but React Three Fiber writes **inline
styles** on its container div (`position: relative; width/height: 100%`), and
inline styles win over a class. With `height: 100%` resolving against a
height-auto parent, the canvas collapsed to R3F's default ~150px and sat in
normal document flow — so it scrolled off the top after the hero, leaving only
the black `<body>`. The 3D was rendering correctly the whole time, just into an
off-screen canvas.

Fix: pass the full-viewport positioning via the `style` prop on `<Canvas>` (R3F
merges `style` *after* its own defaults, so it wins) instead of relying on the
stylesheet class — see `src/components/Experience.tsx`.
