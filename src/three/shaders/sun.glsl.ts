import { noiseGLSL } from './noise.glsl'

/**
 * Sun surface: animated emissive plasma. Two fbm fields at different scales and
 * drift speeds give roiling granulation; bright spots are pushed with a power
 * curve so Bloom flares them. A view-based limb term brightens the edge into a
 * corona-ish halo. Rendered with no lighting (it IS the light).
 */
export const sunVertex = /* glsl */ `
  varying vec3 vPos;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  void main() {
    vPos = position;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

export const sunFragment = /* glsl */ `
  precision highp float;
  varying vec3 vPos;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;

  uniform float uTime;
  uniform vec3 uColorDeep;
  uniform vec3 uColorHot;
  uniform float uBrightness;

  ${noiseGLSL}

  void main() {
    vec3 p = normalize(vPos) * 2.4;
    float n = fbm(p * 1.4 + vec3(0.0, 0.0, uTime * 0.07), 6);
    float n2 = fbm(p * 3.6 - vec3(uTime * 0.11), 4);
    float plasma = (n * 0.6 + n2 * 0.4) * 0.5 + 0.5;

    vec3 col = mix(uColorDeep, uColorHot, smoothstep(0.25, 0.85, plasma));
    col += pow(plasma, 4.0) * uColorHot * 1.6; // hot granules

    // Limb brightening → reads as the inner corona, and Bloom finishes the flare.
    vec3 V = normalize(cameraPosition - vWorldPos);
    float rim = pow(1.0 - max(dot(normalize(vWorldNormal), V), 0.0), 2.2);
    col += rim * uColorHot * 0.9;

    gl_FragColor = vec4(col * uBrightness, 1.0);
  }
`

/**
 * Reusable additive glow shell — used for planet atmospheres, the sun's corona
 * and faint ring-planet halos. A backside fresnel makes the silhouette glow,
 * boosted on the sun-facing side. Render on a slightly larger sphere with
 * AdditiveBlending + depthWrite off.
 */
export const glowVertex = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

export const glowFragment = /* glsl */ `
  precision highp float;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;

  uniform vec3 uColor;
  uniform float uPower;
  uniform float uIntensity;
  uniform vec3 uSunDir;   // set to a constant direction for the sun's corona
  uniform float uLitMix;  // 0 = uniform glow (sun), 1 = sun-facing only (planets)

  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(cameraPosition - vWorldPos);
    float fres = pow(1.0 - max(dot(N, V), 0.0), uPower);
    float lit = max(dot(N, normalize(uSunDir)), 0.0);
    float a = fres * uIntensity * mix(1.0, 0.3 + 0.7 * lit, uLitMix);
    gl_FragColor = vec4(uColor * a, a);
  }
`

/** Broad soft halo for the sun, drawn on a camera-facing billboard plane. */
export const haloFragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform vec3 uColor;
  uniform float uIntensity;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float a = smoothstep(1.0, 0.0, d);
    a = pow(a, 2.2) * uIntensity;
    gl_FragColor = vec4(uColor * a, a);
  }
`

export const haloVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
