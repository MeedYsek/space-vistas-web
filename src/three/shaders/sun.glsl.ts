import { noiseGLSL } from './noise.glsl'

/**
 * Sun surface: animated emissive plasma, grounded toward a real G2V star.
 * Fine low-contrast granulation (two fbm fields) over a large-scale
 * supergranulation modulation; a warm-white core cools through solar yellow to
 * an orange limb. Physically-correct limb DARKENING dims and reddens the edge
 * (the real cue), and optional sunspots add cool dark patches. The brightest
 * granules get a gentle power push so Bloom can flare them. No lighting (it IS
 * the light).
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
  uniform vec3 uColorDeep;     // cool limb + intergranular lanes
  uniform vec3 uColorHot;      // mid photosphere
  uniform vec3 uColorCore;     // warm-white hottest core
  uniform float uBrightness;
  uniform float uLimbDarkening; // linear limb-darkening coefficient (0..1)
  uniform float uGranuleContrast;
  uniform float uSpots;        // sunspot amount (0 = none)
  uniform float uSpotDark;     // how dark the spots get

  ${noiseGLSL}

  void main() {
    vec3 p = normalize(vPos) * 2.4;
    // Fine granulation — kept low-contrast, as real solar granules are subtle.
    float n  = fbm(p * 1.4 + vec3(0.0, 0.0, uTime * 0.06), 6);
    float n2 = fbm(p * 3.6 - vec3(uTime * 0.10), 4);
    float gran = n * 0.6 + n2 * 0.4;
    // Large-scale supergranulation gently varies brightness across the disk.
    float superg = fbm(p * 0.6 + vec3(0.0, uTime * 0.02, 0.0), 3) * 0.5 + 0.5;
    float plasma = clamp(0.5 + gran * uGranuleContrast, 0.0, 1.0);
    plasma = mix(plasma, plasma * (0.7 + 0.6 * superg), 0.5);

    vec3 V = normalize(cameraPosition - vWorldPos);
    float mu = clamp(dot(normalize(vWorldNormal), V), 0.0, 1.0); // 1 centre → 0 limb

    // Photosphere colour: lanes (deep) → mid → warm-white core (near the centre).
    vec3 col = mix(uColorDeep, uColorHot, smoothstep(0.25, 0.8, plasma));
    col = mix(col, uColorCore, smoothstep(0.6, 1.0, plasma) * smoothstep(0.45, 1.0, mu));
    col += pow(plasma, 4.0) * uColorHot * 0.9; // subtle hot-granule push → Bloom

    // Sunspots: cool, dark patches from a low-frequency field (off when uSpots = 0).
    float spotField = fbm(p * 0.9 + vec3(11.0, 0.0, uTime * 0.015), 4) * 0.5 + 0.5;
    float spot = smoothstep(0.62, 0.5, spotField) * uSpots;
    col = mix(col, uColorDeep * (1.0 - uSpotDark), spot);

    // Real limb darkening: dimmer AND redder toward the edge (linear law).
    col = mix(col, uColorDeep, (1.0 - mu) * (1.0 - mu) * 0.35); // redden the limb
    col *= 1.0 - uLimbDarkening * (1.0 - mu);                   // dim the limb

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
