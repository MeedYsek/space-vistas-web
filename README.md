# A Cathedral of Night

A scroll-driven, award-style WebGL journey through the cosmos — stars, dust,
nebulae, a solar-system orrery, a particle galaxy, a black-hole singularity and
deep-space vistas. Built with React + Vite + TypeScript, Three.js via React
Three Fiber, GSAP + Lenis smooth scrolling.

Scroll feel: a cinematic, weighted inertia (`lerp 0.06`, `wheelMultiplier 0.85`).
Inside the **Solar System** and **Singularity** acts the scroll snaps to the
nearest body's dwell centre after ~180 ms of idle — so each planet and the black
hole get a moment to breathe. After the Neptune snap there is a deliberate ~60 vh
pure-Neptune zone before the galaxy crossfade begins; both the galaxy camera and
the galaxy section text then arrive together at the same scroll position.
Disable or tune snapping in `SCROLL.snapDelay/snapDuration`.

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
    useSmoothScroll.ts      ← Lenis ↔ GSAP ticker ↔ ScrollTrigger (single clock) + scroll lock + planet/singularity snap
    pointer.ts              ← shared mouse/gyro parallax store
    flight.ts               ← shared camera-flight state (scroll progress, warp, intro)
    solarStore.ts           ← which body is focused (drives the info-cards)
    useMagnetic.ts          ← magnetic-hover hook for buttons/links
    debug.ts                ← URL-param render toggles (?nobloom, ?norings … — see below)
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
    NavPanel.tsx            ← fixed right-side section navigator: auto-scrolls to active item, click to jump
    ScrollToTop.tsx         ← fixed back-to-top button with cosmic styling (shows after 20 % scroll)
    StaticFallback.tsx      ← no-WebGL CSS background
  three/
    CameraRig.tsx           ← camera director: hero/solar/galaxy/singularity/vistas/return acts + planet focus
    Starfield.tsx           ← 26k instanced shader stars (+ ignite warp)
    Nebula.tsx              ← additive fbm cloud planes
    ParallaxDust.tsx        ← 3 parallax depth layers
    PostFX.tsx              ← bloom (off by default) / chromatic aberration / vignette / grain + MSAA
    solar/
      SolarSystem.tsx       ← assembles sun + planets + orbit guides
      Sun.tsx               ← granulated plasma surface (limb darkening) + tight corona + halo
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
      sun.glsl.ts           ← sun granulation + limb darkening + reusable additive glow + halo
      planet.glsl.ts        ← planet surface (grounded lighting, relief, glint, aurora, band flow + GRS) / atmosphere (forward-scatter) / clouds / rings
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
| **Planet realism** (per-planet) | `relief`, `terminatorSoftness`, `scatter`, `surfaceHaze`/`hazeColor`, `oceanGlint`, `aurora`, `bandFlow`, `redSpot` on each `PlanetConfig` |
| **Shared planet lighting** | `PLANET_LIGHT` in `config/planets.ts` — `sunColor`, `nightAmbient`, `starlight`, `starTint` |
| **Sun** (size, colours, brightness) | `SUN` in `config/planets.ts` — incl. `colorCore`, `granuleContrast`, `limbDarkening`, `sunspots`, `coronaTint`/`coronaPower`/`coronaIntensity`, `haloColor`/`haloIntensity` |
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
| **Bloom** | `POSTFX.bloom.*` — **off by default** (`POSTFX.bloom.enabled`); set `true` to restore the glow |
| **Anti-aliasing (MSAA)** | passed to `<PostFX multisampling>` from `Scene.tsx` (4 on desktop, 0 on the light path) |
| **Chromatic aberration** | `POSTFX.chromaticAberration.offset` |
| **Vignette / film grain** | `POSTFX.vignette.*`, `POSTFX.filmGrain.opacity` |
| **Scroll pacing** | `SCROLL.lerp`, `SCROLL.wheelMultiplier`, `SCROLL.pageHeightVH` |
| **Scroll-to-snap** (planet / singularity dwell) | `SCROLL.snapDelay` (ms idle, 0 = off), `SCROLL.snapDuration` (seconds) |
| **Mobile overrides** | `MOBILE.*` |
| **Debug render toggles** | URL params via `lib/debug.ts`: `?nobloom`, `?nopost`, `?norings`, `?noatmo`, `?noclouds`, `?nosolar`, `?nogalaxy`, `?nonebula`, `?nostars`, `?nodust` (combine with `&`) |

Tip: to dial in performance vs. beauty, lower `STARFIELD.count`, `NEBULA.layers`
and (if bloom is on) `POSTFX.bloom.intensity` first.

---

## Art direction baked in

> **Direction: grounded-cinematic realism.** The solar system has been moving
> away from the original stylized look toward physically-plausible, lightly-graded
> realism — true-ish surface colours (no palette push on the rock), realistic
> sun-as-point-source lighting, and **bloom off by default**. The notes below
> reflect the current state; the background (nebula/void) still uses `PALETTE`.

- Near-black `#05060A` void; the nebula and far-field glows keep the indigo/violet + cyan/magenta/amber `PALETTE`, but the **sun and planets render in their own true-ish colours** (the texture albedo is never graded).
- **Sun-primary lighting** — planet night sides stay near-black (`PLANET_LIGHT.nightAmbient ≈ 0.04`) with only a faint cool starlight rim so they read as spheres. The **terminator width is atmosphere-gated** (`terminatorSoftness`: airless → razor-sharp with crater relief, thick air → soft scattering edge). The corona shell is kept tight (sharp fresnel falloff) so the sun reads as a point source, not a wash.
- The Sun itself is grounded: warm-white core → orange limb, real **limb darkening**, subtle granulation, a faint tight corona.
- **Bloom is off** (`POSTFX.bloom.enabled = false`) — real astrophotography doesn't bloom, and it kept the brightest surfaces from looking CGI. MSAA, vignette, film grain and faint chromatic aberration remain for a filmic, non-clinical read.
- **Cinematic hero → solar transition** — the hero's wide-angle shot (camera at z = 150) approaches the Sun from the same direction via a 150 vh crossfade, a slow zoom-in rather than an angular cut. The camera reaches the tight Sun framing (~21° of rotation total) and then continues to each planet in order.
- Slow, weighty, zero-G motion. Floaty pointer parallax. Scroll-to-snap on each planet and the singularity — the page eases to each body's dwell centre after a brief pause, so nothing important is skimmed past.
- **Scene objects hidden outside their acts** — the galaxy (120k additive particles) and the vistas gallery plates are invisible until the camera actually flies through them. The singularity sits just beyond the galaxy's far edge (z = −720) so the two feel connected rather than isolated.

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

**All eight planets use real texture maps** (NASA / Solar System Scope, bundled in
`public/textures/planets/`). Earth's Blue Marble (public domain), Mars, Jupiter,
Saturn, Uranus and Neptune (Solar System Scope CC BY 4.0) load asynchronously —
each planet shows procedural noise until its JPEG arrives, then swaps silently.
To add or swap a map: drop a JPEG into `public/textures/planets/`, then add
`map: 'filename.jpg'` to the matching planet in `config/planets.ts`.

> ⚠️ ESO images are CC BY 4.0 (attribution required). Always check the specific
> image's licence page before shipping non-NASA material.

---

## Verification — project complete

> **Note:** this verification snapshot predates the **grounded-realism rework** of
> the solar system (Sun + planets reworked one at a time, bloom switched off). The
> end-to-end flow below still holds; the per-object look has since changed. See
> "Art direction baked in" above for the current direction.

**Verdict:** PASS · **Date:** 2026-06-24 · **Node:** v20.20.2 / Vite 6 /
Playwright headless Chromium · `tsc --noEmit` and `vite build` both clean.

Verified via Playwright (headless Chromium runs `requestAnimationFrame`, unlike a
backgrounded preview tab) with real wheel-scrolling end-to-end:

1. **Preloader → ignite** — ring + pulsing star + count, then the camera push and
   hero resolving from blur, no hard cut.
2. **Solar act** — real scroll frames each planet at its dwell centre with the
   matching info-card (e.g. Earth → "the pale blue dot"); Saturn's rings, the
   galaxy foreshadowed in the distance. **Scroll-to-snap** eases to each planet's
   centre (~180 ms idle trigger, 0.9 s cubic ease-out).
3. **Galaxy act** — the 120k-point spiral arcs from a high 3/4 view down to a
   dramatic angle; warm core, cool arms, differential spin.
4. **Singularity act** — the ray-marched black hole fills the frame; **snap** locks
   to its midpoint so the accretion disk and jets have time to read.
5. **Vistas act** — procedural plates resolve via the noise wipe as the camera
   pans; DOM gallery cards open full-screen with the GSAP FLIP lightbox.
6. **Return** — the gallery fades and the journey collapses to a distant point of
   light; the floating footer (newsletter, socials, ambient-drone toggle) reads
   over a scrim.
7. **Custom cursor**, magnetic CTA, and per-word type reveals all fire.
8. **Mobile** (390×844, touch) renders the full light path; **reduced-motion**
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
