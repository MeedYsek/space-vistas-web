/**
 * Starfield shaders.
 *
 * Per-star attributes (set on the geometry in Starfield.tsx):
 *   position  vec3  — point in space
 *   aColor    vec3  — base colour (white → blue-white → warm amber)
 *   aSize     float — base size multiplier
 *   aPhase    float — twinkle phase offset
 *   aTwinkle  float — twinkle speed
 *   aHero     float — 1.0 for hero stars (extra glow + cross flare), else 0.0
 *
 * Uniforms:
 *   uTime         — seconds
 *   uSize         — global size multiplier (STARFIELD.size)
 *   uPixelRatio   — clamped devicePixelRatio (keeps point size consistent)
 */
export const starfieldVertex = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uWarp;

  attribute vec3 aColor;
  attribute float aSize;
  attribute float aPhase;
  attribute float aTwinkle;
  attribute float aHero;

  varying vec3 vColor;
  varying float vTwinkle;
  varying float vHero;

  void main() {
    // Warp (ignite): rush stars toward the camera so they streak past as the
    // scene "ignites". uWarp eases 1 -> 0 right after the preloader.
    vec3 pos = position;
    pos += normalize(pos) * uWarp * -36.0;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

    // Twinkle: gentle sine on brightness, never fully off.
    float tw = 0.6 + 0.4 * sin(uTime * aTwinkle + aPhase);

    // Hero stars pulse a touch slower and brighter.
    float heroPulse = 0.85 + 0.15 * sin(uTime * 0.6 + aPhase);
    tw = mix(tw, heroPulse, aHero);

    vColor = aColor;
    vTwinkle = tw + uWarp * 0.6; // brighten during the ignite streak
    vHero = aHero;

    // Perspective size attenuation (stars swell slightly during warp).
    float size = aSize * uSize * (1.0 + aHero * 2.2) * (1.0 + uWarp * 1.8);
    gl_PointSize = size * uPixelRatio * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

export const starfieldFragment = /* glsl */ `
  precision highp float;

  varying vec3 vColor;
  varying float vTwinkle;
  varying float vHero;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);

    // Soft round core that falls off smoothly.
    float core = smoothstep(0.5, 0.0, d);
    core = pow(core, 1.6);

    // Hero stars get a faint 4-point cross flare.
    float cross = 0.0;
    if (vHero > 0.5) {
      float h = smoothstep(0.5, 0.0, abs(uv.y)) * smoothstep(0.5, 0.0, abs(uv.x) * 6.0);
      float vv = smoothstep(0.5, 0.0, abs(uv.x)) * smoothstep(0.5, 0.0, abs(uv.y) * 6.0);
      cross = (h + vv) * 0.6;
    }

    float alpha = (core + cross) * vTwinkle;
    if (alpha < 0.003) discard;

    gl_FragColor = vec4(vColor * (core + cross * 0.8), alpha);
  }
`
