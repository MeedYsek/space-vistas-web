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
}

export const VISTAS_CONTENT: Vista[] = [
  {
    key: 'carina',
    title: 'The Cradle',
    kicker: 'Star-forming nebula',
    caption: 'Cliffs of gas where new suns are still being struck from the dark.',
    kind: 4,
    colors: ['#2a0f3a', '#b5179e', '#ffb15a'],
  },
  {
    key: 'andromeda',
    title: 'The Neighbour',
    kicker: 'Spiral galaxy',
    caption: 'A wheel of two hundred billion stars, falling slowly toward our own.',
    kind: 1,
    colors: ['#0b1430', '#5a7bff', '#ffd9a0'],
  },
  {
    key: 'aurora',
    title: 'The Veil',
    kicker: 'Polar aurora',
    caption: 'The solar wind, caught and combed into light along a world’s magnetic seams.',
    kind: 2,
    colors: ['#03161a', '#1f9c8f', '#5ad7ff'],
  },
  {
    key: 'lagoon',
    title: 'The Tide',
    kicker: 'Emission nebula',
    caption: 'Hydrogen lit from within, glowing the deep red of creation.',
    kind: 0,
    colors: ['#1a0820', '#ff5ad2', '#ff8a5a'],
  },
  {
    key: 'rings',
    title: 'The Crown',
    kicker: 'Ringed giant',
    caption: 'Ice and shattered moonlight, ringed in a thousand silent orbits.',
    kind: 3,
    colors: ['#0a0f24', '#c9b88a', '#ffe6b0'],
  },
]
