/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  DEEP-SPACE VISTAS — gallery content (Milestone 5)
 * ─────────────────────────────────────────────────────────────────────────────
 *  Each vista is a large plane the camera pans past during the VISTAS act; a
 *  shader resolves it with a noise-displacement wipe as it enters the frame. The
 *  imagery is PROCEDURAL (fbm in the shader, driven by `kind` + `colors`) — no
 *  copyrighted assets are bundled.
 *
 *  To drop in real NASA/ESO photography later: add a `src` URL to a vista, load
 *  it with drei's `useTexture`, pass it as `uTex` and sample it in
 *  vistas.glsl.ts in place of the procedural `vistaImage()` term (see README).
 *  NASA imagery is generally public domain; ESO/ESA is CC BY 4.0 (attribution
 *  required) — always check the specific image's licence and keep an attributions
 *  list.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface Vista {
  key: string
  title: string
  /** Small tracked label above the title. */
  kicker: string
  /** One poetic line shown in the card + lightbox. */
  caption: string
  /** Procedural style: 0 nebula · 1 galaxy · 2 aurora · 3 ringed world · 4 pillars. */
  kind: number
  /** Three palette colours sampled by the shader (dark → mid → glow). */
  colors: [string, string, string]
  /**
   * Optional real photo filename inside public/textures/.
   * When present the shader samples the texture instead of generating procedurally.
   * NASA images are public domain; ESO images are CC BY 4.0 (attribution required).
   */
  src?: string
  /** Attribution line shown in the lightbox when src is set. */
  credit?: string
}

export const VISTAS_CONTENT: Vista[] = [
  {
    key: 'carina',
    title: 'The Cradle',
    kicker: 'Star-forming nebula · NGC 3324',
    caption: 'These towering gas cliffs hide stellar nurseries inside them. Webb\'s infrared eyes pierced the dust for the first time — every peak is actively birthing suns.',
    kind: 4,
    colors: ['#2a0f3a', '#b5179e', '#ffb15a'],
    src: 'carina.jpg',
    credit: 'NASA, ESA, CSA, STScI — public domain',
  },
  {
    key: 'andromeda',
    title: 'The Neighbour',
    kicker: 'Spiral galaxy · M31 · 2.5 million light-years',
    caption: 'It contains a trillion stars and is already falling toward us. In four billion years Andromeda and the Milky Way will collide and merge into a single elliptical galaxy.',
    kind: 1,
    colors: ['#0b1430', '#5a7bff', '#ffd9a0'],
    src: 'andromeda.jpg',
    credit: 'NASA / JPL-Caltech (GALEX + Spitzer) — public domain',
  },
  {
    key: 'aurora',
    title: 'The Veil',
    kicker: 'Aurora australis · ISS · 400 km altitude',
    caption: 'Earth\'s magnetic field made visible. Charged particles from the sun are funnelled to the poles and ignited — the planet\'s own force field, glowing green at the edge of space.',
    kind: 2,
    colors: ['#03161a', '#1f9c8f', '#5ad7ff'],
    src: 'aurora.jpg',
    credit: 'NASA / ISS — public domain',
  },
  {
    key: 'lagoon',
    title: 'The Tide',
    kicker: 'Emission nebula · M8 · 4,100 light-years',
    caption: 'A star 200,000 times brighter than our sun lives at the centre of this cloud, blasting it with ultraviolet light and supersonic winds. The red glow is hydrogen being torn apart.',
    kind: 0,
    colors: ['#1a0820', '#ff5ad2', '#ff8a5a'],
    src: 'lagoon.jpg',
    credit: 'NASA, ESA, STScI / Hubble — public domain',
  },
  {
    key: 'saturn',
    title: 'The Crown',
    kicker: 'Ringed giant · 1.4 billion km from the sun',
    caption: 'The rings span 282,000 km but are barely 10 metres thick. In 2017 Cassini ended its mission by diving between them — this portrait was taken on that final approach.',
    kind: 3,
    colors: ['#0a0f24', '#c9b88a', '#ffe6b0'],
    src: 'saturn.jpg',
    credit: 'NASA / JPL-Caltech / SSI (Cassini) — public domain',
  },
]
