import { noiseGLSL } from './noise.glsl'

/**
 * Nebula shaders — large additive cloud planes billboarded into the distance.
 * Each plane samples fbm noise twice (domain-warped) for a wispy, layered look,
 * then mixes three palette colours by density. A soft radial mask hides the
 * plane's square edges so the cloud reads as volume, not geometry.
 *
 * Uniforms:
 *   uTime       — seconds
 *   uColorA/B/C — palette colours (violet / magenta / teal by default)
 *   uIntensity  — overall opacity ceiling
 *   uSpeed      — drift speed of the noise field
 *   uSeed       — per-plane offset so clouds don't repeat
 *   uOctaves    — fbm detail
 */
export const nebulaVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const nebulaFragment = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform float uTime;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;
  uniform float uIntensity;
  uniform float uSpeed;
  uniform float uSeed;
  uniform int uOctaves;

  ${noiseGLSL}

  void main() {
    vec2 uv = vUv;
    float t = uTime * uSpeed;

    // Domain warp: noise of noise gives soft, billowing structure.
    vec3 p = vec3(uv * 3.0 + uSeed, t);
    float warp = fbm(p, uOctaves);
    float density = fbm(p + warp * 1.5, uOctaves);
    density = density * 0.5 + 0.5; // -> [0,1]

    // Colour by density band.
    vec3 col = mix(uColorA, uColorB, smoothstep(0.25, 0.65, density));
    col = mix(col, uColorC, smoothstep(0.6, 0.95, density));

    // Radial mask to fade the plane's edges to nothing.
    float edge = smoothstep(0.5, 0.08, length(uv - 0.5));

    // Push faint regions to zero so the clouds feel like depth, not fog.
    float a = smoothstep(0.42, 0.95, density) * edge * uIntensity;

    gl_FragColor = vec4(col, a);
  }
`
