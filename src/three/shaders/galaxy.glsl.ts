/**
 * Spiral-galaxy particle shaders.
 *
 * The galaxy is ~120k additive GL points whose positions are baked once on the
 * CPU (see Galaxy.tsx) into a branching, wound spiral. The vertex shader then
 * spins each particle around the disk's local Y axis every frame — and crucially
 * spins the CORE faster than the RIM (differential rotation), which keeps the
 * arms winding the way a real galaxy shears.
 *
 * Per-particle attributes:
 *   position  vec3  — baked spiral position, relative to the galaxy centre
 *   aColor    vec3  — warm-core → cool-arm gradient colour
 *   aSize     float — base size multiplier (bigger toward the core)
 *   aRadius   float — distance from centre (drives differential spin + core glow)
 *
 * Uniforms:
 *   uTime        — seconds
 *   uSize        — global size multiplier (GALAXY.size)
 *   uPixelRatio  — clamped devicePixelRatio
 *   uRotation    — overall angular speed (GALAXY.rotationSpeed)
 *   uCoreSpin    — angular-speed multiplier at the core (r = 0)
 *   uRimSpin     — angular-speed multiplier at the rim (r = uRadius)
 *   uRadius      — galaxy radius, to normalise aRadius into 0..1
 */
export const galaxyVertex = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uRotation;
  uniform float uCoreSpin;
  uniform float uRimSpin;
  uniform float uRadius;

  attribute vec3 aColor;
  attribute float aSize;
  attribute float aRadius;

  varying vec3 vColor;
  varying float vCore;

  void main() {
    float rn = clamp(aRadius / uRadius, 0.0, 1.0);

    // Differential rotation: core (rn→0) spins at uCoreSpin, rim (rn→1) at
    // uRimSpin. This shear is what keeps the arms looking "wound".
    float w = uRotation * mix(uCoreSpin, uRimSpin, rn);
    float ang = uTime * w;
    float c = cos(ang);
    float s = sin(ang);

    vec3 p = position;
    p.xz = mat2(c, -s, s, c) * p.xz; // rotate around the disk normal (local Y)

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = aSize * uSize * uPixelRatio * (300.0 / -mv.z);
    gl_Position = projectionMatrix * mv;

    vColor = aColor;
    vCore = 1.0 - rn; // 1 at the core, 0 at the rim → extra glow near the centre
  }
`

export const galaxyFragment = /* glsl */ `
  precision highp float;

  varying vec3 vColor;
  varying float vCore;

  void main() {
    // Soft round mote with a smooth falloff.
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    a = pow(a, 1.5);

    // Core particles glow a little brighter so Bloom lifts the galactic nucleus.
    vec3 col = vColor + vCore * vColor * 0.3;

    gl_FragColor = vec4(col, a);
  }
`
