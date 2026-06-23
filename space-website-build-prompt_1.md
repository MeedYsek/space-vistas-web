# Build Prompt — "ASTRA": An Immersive, Cinematic Space Website

## ROLE & GOAL

You are a senior creative front-end developer specializing in award-winning WebGL experiences (the kind that win Awwwards Site of the Day). Build a visually stunning, fully animated, "alive" single-page space website. Every section should feel cinematic and intentional — the 3D must serve the story, never just decorate. Aim for the polish level of Apple's product pages and Bruno Simon's portfolio.

Theme: **the cosmos** — the solar system, deep-space vistas, nebulae, and beautiful celestial sceneries. The mood is *awe, silence, vastness, wonder.*

---

## TECH STACK (use exactly this unless I say otherwise)

- **Framework:** React + Vite (or Next.js if you prefer SSR). TypeScript.
- **3D:** Three.js (r170+) via **React Three Fiber** + **@react-three/drei** + **@react-three/postprocessing**.
- **Animation:** **GSAP** with **ScrollTrigger** (scroll-driven camera + reveals).
- **Smooth scroll:** **Lenis** (synced to the R3F render loop and GSAP ticker).
- **Styling:** Tailwind CSS. Custom GLSL shaders where noted.
- **Fonts:** A wide, modern display face for headings (e.g. *Clash Display*, *Space Grotesk*, or *Aktiv Grotesk*) and a clean grotesque for body. Use large, confident type with generous letter-spacing on labels.

If a single self-contained HTML file is required instead, use Three.js + GSAP + Lenis from a CDN and inline the GLSL — but prefer the component structure above.

---

## ART DIRECTION

- **Palette:** near-black backgrounds (#05060A), deep indigo/violet nebula tones, with accent glows of cyan, magenta, and warm amber (star/sun light). High contrast, lots of negative space.
- **Light:** everything should bloom softly. Stars twinkle, the sun flares, planet rims catch a fresnel glow.
- **Motion language:** slow, weighty, floaty — like zero gravity. Easing should be smooth (`power2.inOut`, `expo.out`). Nothing snappy or bouncy. Parallax depth everywhere.
- **Texture:** subtle film grain + faint vignette over the whole page so it reads cinematic, not clinical.
- **Type-in-space:** headings drift in with a slight blur-to-focus and a small z-depth parallax as you scroll.

---

## GLOBAL 3D BACKGROUND (persistent canvas)

A single full-viewport `<Canvas>` that lives behind all content and persists across sections (do **not** remount it per section). It contains:

1. **Instanced starfield** — 15,000–50,000 stars via `Points` / instanced geometry with a custom shader. Vary size, brightness, and color (white → blue-white → warm). Subtle twinkle (sine on alpha) and slow drift. Add a few brighter "hero" stars with soft cross/bloom flares.
2. **Procedural nebula** — large soft volumetric clouds using fbm/simplex noise in a fragment shader, drifting slowly, colored indigo/magenta/teal. Additive blending. Should feel like depth, not a flat backdrop.
3. **Parallax layers** — at least 3 depth layers of stars/dust that move at different rates with scroll and a gentle response to mouse/gyro.
4. **Camera** — a single camera that GSAP ScrollTrigger flies through the scene as the user scrolls (dolly, pan, slow rotate). Pin key moments so transitions feel like *scenes*, not page scroll.

Post-processing stack: **Bloom** (selective, for stars/sun/rims), subtle **chromatic aberration**, **vignette**, **film grain**, and optional **depth of field** on hero moments.

---

## PAGE STRUCTURE (scroll-driven narrative)

### 0. Preloader
Animated loader: a thin progress ring filling around a single pulsing star, percentage counting up. On complete, the camera "ignites" and pushes forward into the starfield as the hero text resolves from blur. Smooth, no hard cut.

### 1. Hero — "Wonder"
- Full-screen deep-space vista. Big drifting title (e.g. **"BEYOND THE PALE BLUE DOT"** or let me rename later). Subhead in small tracked caps.
- Stars streak slightly toward the camera (warp hint) then settle.
- A soft scroll cue at the bottom that floats.

### 2. The Solar System — interactive orrery
- A 3D solar system: the Sun (animated surface shader — noisy emissive plasma + corona + lens flare) with planets orbiting on elliptical paths.
- Planets use custom shaders: **day/night terminator, cloud layer, atmosphere fresnel rim glow, specular on water (Earth)**. Saturn gets rings.
- As the user scrolls, the camera flies from the Sun outward past each planet. When a planet is centered, pin and reveal a clean info card (name, diameter, distance, one poetic line). Let the user also hover/drag to orbit a planet.
- Realistic-ish relative motion but art-directed for beauty over accuracy.

### 3. Deep-Space Vistas — gallery
- A scroll-revealed gallery of cosmic sceneries (nebulae, galaxies, auroras, planetary rings). Use WebGL shader reveals: images/planes resolve with a displacement/noise wipe as they enter the viewport, with depth parallax and palette-driven background shifts.
- On click, a plane animates smoothly into a full-screen detail view (GSAP Flip-style transition).

### 4. The Galaxy — particle spiral
- A procedurally generated spiral galaxy made of 100k+ particles (additive blending, color gradient from warm core to cool arms), slowly rotating with the core spinning faster than the rim. Camera slowly arcs around it. This is the "wow" centerpiece.

### 5. Singularity (optional showpiece)
- A black hole: accretion-disk ring shader + background distortion/gravitational-lensing effect that warps the starfield behind it. Slow, ominous, beautiful.

### 6. Closing — "Return"
- Camera pulls back until the whole journey is a single point of light. Quiet outro line, minimal footer (credits, a newsletter input, social links) floating in space. Optional ambient audio toggle (spatial drone) — **off by default, user-initiated only.**

---

## INTERACTION & FEEL

- **Custom cursor**: a small glowing dot with a trailing ring that reacts (scales/changes) on hover over interactive elements.
- **Magnetic buttons** and link hover states with subtle glow.
- **Scroll = camera time.** The whole site is one continuous flight; section "pages" are framed camera shots. Use ScrollTrigger `scrub` + `pin`.
- **Mouse/gyro parallax** on the starfield and nebula for a living feel.
- **Text reveals**: SplitText-style per-line / per-word reveals with blur-in, staggered.
- **Page is responsive**; on mobile, reduce particle counts, disable heavy post-fx, and lean on gyro instead of mouse.

---

## PERFORMANCE & QUALITY BAR (do not skip)

- Target 60fps desktop, smooth on mid mobile. Use **instancing**, on-demand/throttled rendering where possible, and `Math.min(devicePixelRatio, 2)`.
- Lazy-load heavy assets; show the preloader until ready. Dispose Three.js resources on unmount to avoid leaks.
- **Graceful degradation**: detect low-power/no-WebGL and fall back to a static starfield image + CSS animation. Respect `prefers-reduced-motion` (cut camera moves, keep gentle fades).
- Accessibility: real semantic HTML for all text content behind the canvas, keyboard-navigable, sufficient contrast, alt text, focus states. The experience must be *understandable* without the 3D.
- Keep the code clean, componentized, and commented. Separate shaders into their own files. No dead code.

---

## DELIVERABLES

1. The full working project (file tree + all code).
2. A short README: how to run it, where to swap textures/copy, and which knobs control star count, bloom, colors, and scroll pacing.
3. Sensible placeholder textures/assets with notes on where to drop in real NASA/ESO imagery later (and a reminder to check image licenses).

## BUILD ORDER (do this incrementally, show me each milestone)

1. Scaffold + Lenis smooth scroll + persistent Canvas + starfield + post-processing.
2. Hero section + preloader + scroll-driven camera rig.
3. Solar system orrery with shader planets.
4. Galaxy particle centerpiece.
5. Vistas gallery + closing + custom cursor + polish (grain, vignette, type reveals).
6. Performance pass, mobile, reduced-motion, fallbacks.

Start with step 1 and the overall architecture. Ask me before introducing any library not listed above.
