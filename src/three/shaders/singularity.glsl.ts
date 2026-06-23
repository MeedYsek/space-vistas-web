import { noiseGLSL } from './noise.glsl'

// ── Accretion Disk ──────────────────────────────────────────────────────────
// RingGeometry lies in the XY plane in object space; the mesh is rotated in
// world space but the shader samples in object space so the disk sticks to
// the geometry regardless of tilt.

export const diskVertex = /* glsl */ `
  varying vec3 vObjPos;
  void main() {
    vObjPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const diskFragment = /* glsl */ `
  precision highp float;
  varying vec3 vObjPos;
  uniform float uTime;
  uniform float uInnerR;
  uniform float uOuterR;

  ${noiseGLSL}

  void main() {
    float r = length(vObjPos.xy);
    float t = (r - uInnerR) / (uOuterR - uInnerR);
    if (t < 0.0 || t > 1.0) discard;

    // Soft inner/outer fade
    float edgeFade = smoothstep(0.0, 0.06, t) * smoothstep(1.0, 0.82, t);

    // Temperature gradient: hot white-orange core → orange mid → deep magenta rim
    vec3 colInner = vec3(1.0, 0.92, 0.72);
    vec3 colMid   = vec3(1.0, 0.38, 0.10);
    vec3 colOuter = vec3(0.42, 0.04, 0.26);
    vec3 col = t < 0.35
      ? mix(colInner, colMid, t / 0.35)
      : mix(colMid, colOuter, (t - 0.35) / 0.65);

    // Brightness: inner disk is much hotter
    float brightness = pow(1.0 - t, 1.8) * 3.5 + 0.06;

    // Relativistic beaming: approaching side (phi ~ π/2) is brighter
    float phi = atan(vObjPos.y, vObjPos.x);
    float doppler = 0.5 + 0.5 * sin(phi - 0.8);
    brightness *= (0.35 + 0.65 * doppler * doppler);

    // FBM turbulence for substructure
    vec3 sp = normalize(vObjPos) * 4.5 + vec3(uTime * 0.03, 0.0, uTime * 0.015);
    float turb = fbm(sp, 4) * 0.5 + 0.5;
    brightness *= (0.55 + 0.45 * turb);

    float a = edgeFade * min(brightness, 1.8) * 0.95;
    gl_FragColor = vec4(col * brightness, a);
  }
`

// ── Gravitational Lensing Dome ──────────────────────────────────────────────
// A large BackSide sphere. The fragment shader bends background-star sampling
// directions toward the black hole, compressing the background near the shadow
// and creating a faint Einstein arc at the photon-sphere angle.

export const lensingVertex = /* glsl */ `
  varying vec3 vWorldPos;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

export const lensingFragment = /* glsl */ `
  precision highp float;
  varying vec3 vWorldPos;
  uniform vec3 uCenter;
  uniform float uTime;

  ${noiseGLSL}

  void main() {
    vec3 fragDir  = normalize(vWorldPos - cameraPosition);
    vec3 toCenter = normalize(uCenter - cameraPosition);

    float cosTheta = clamp(dot(fragDir, toCenter), -1.0, 1.0);
    float theta    = acos(cosTheta);
    float sinTheta = max(sin(theta), 0.001);

    // Simplified Schwarzschild lensing: compress background near the shadow
    float lensK   = 0.045;
    float bentTh  = theta * max(0.01, 1.0 - lensK / (theta * theta + 0.003));

    // Reconstruct bent direction
    vec3 tangent  = normalize(fragDir - cosTheta * toCenter);
    vec3 lensedDir = cos(bentTh) * toCenter + sin(bentTh) * tangent;

    // Procedural stars at the lensed background position
    vec3 sp = lensedDir + uTime * 0.002;
    float n1   = step(0.975, fbm(sp * 13.0, 3) * 0.5 + 0.5);
    float n2   = step(0.991, fbm(sp * 35.0 + 1.9, 2) * 0.5 + 0.5);
    float stars = n1 * 0.55 + n2 * 0.28;

    // Faint Einstein arc brightening at the apparent photon-sphere angle
    float arc = smoothstep(0.07, 0.0, abs(theta - 0.20)) * 0.22;

    vec3 col = vec3(0.80, 0.88, 1.0);
    float a  = (stars + arc) * 0.65;
    gl_FragColor = vec4(col, a);
  }
`

// ── Relativistic Jet ────────────────────────────────────────────────────────
// Two crossed PlaneGeometry meshes per jet give a volumetric column from any
// viewing angle. uT0 flips the "base vs tip" direction so both jets use the
// same shader: upper jet uT0=0 (vUv.y=0 is the BH surface), lower uT0=1.

export const jetVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const jetFragment = /* glsl */ `
  precision mediump float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uIntensity;
  uniform float uT0;

  ${noiseGLSL}

  void main() {
    float t      = mix(vUv.y, 1.0 - vUv.y, uT0); // 0 = BH surface, 1 = tip
    float radial = abs(vUv.x - 0.5) * 2.0;        // 0 = centre axis, 1 = edge

    float beam      = exp(-radial * radial * 9.0);
    float lengthFade = pow(1.0 - t, 0.75);

    float turb = fbm(vec3(t * 7.0, radial * 3.0, uTime * 0.35), 3) * 0.5 + 0.5;
    turb = 0.55 + 0.45 * turb;

    vec3 col = mix(vec3(0.45, 0.85, 1.0), vec3(1.0, 1.0, 1.0), beam * 0.65);
    float a  = beam * lengthFade * turb * uIntensity;
    gl_FragColor = vec4(col * a, a);
  }
`
