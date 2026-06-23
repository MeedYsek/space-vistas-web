import { noiseGLSL } from './noise.glsl'

// ─────────────────────────────────────────────────────────────────────────────
//  Gravitationally-lensed black hole (the "Gargantua" look)
// ─────────────────────────────────────────────────────────────────────────────
//  Rendered on a single camera-facing billboard. Instead of faking the disk with
//  flat geometry, the fragment shader integrates photon paths through the curved
//  space around the hole, so the accretion disk genuinely bends up and over the
//  shadow, a thin photon ring forms at the silhouette, and the disk shows
//  relativistic Doppler beaming — all from one pass.
//
//  Maths (geometric units, event horizon r = 1, so 2M = 1):
//    - Photon geodesic in the weak-field/Schwarzschild approximation:
//        d²r/dλ² = −1.5 · h² · r / |r|⁵   with h = r × v conserved.
//      This naturally captures rays with impact parameter below the critical
//      value (the shadow) and bends grazing rays around the photon sphere
//      at r = 1.5 (the photon ring at apparent radius 3√3·M ≈ 2.6).
//    - The disk lives in the equatorial (world XZ) plane; every time the marched
//      ray crosses y = 0 inside [inner, outer] we composite its emission, so a
//      single screen ray can pick up the near face AND the lensed far face.
//
//  All positions are normalised by the horizon radius (uRs) on entry, so the
//  same constants work at any world scale.

export const blackholeVertex = /* glsl */ `
  varying vec3 vWorldPos;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

/**
 * STEPS is the photon-integration budget — the dominant cost. Injected as a
 * compile-time constant so the GLSL1 loop bound stays static (desktop ~ 200,
 * low-power ~ 96).
 */
export const makeBlackholeFragment = (steps: number) => /* glsl */ `
  precision highp float;
  #define STEPS ${steps}

  varying vec3 vWorldPos;

  uniform float uTime;
  uniform vec3  uCenter;     // black-hole world position
  uniform float uRs;         // event-horizon radius (world units → scale factor)
  uniform float uDiskInner;  // disk inner edge (in horizon radii)
  uniform float uDiskOuter;  // disk outer edge (in horizon radii)
  uniform vec3  uColInner;   // hot inner temperature colour
  uniform vec3  uColMid;     // mid (amber) colour
  uniform vec3  uColOuter;   // cool outer (magenta) colour
  uniform float uBrightness; // master disk brightness

  ${noiseGLSL}

  // Inner → mid → outer blackbody-ish temperature gradient.
  vec3 diskGradient(float t){
    return t < 0.4
      ? mix(uColInner, uColMid, t / 0.4)
      : mix(uColMid, uColOuter, (t - 0.4) / 0.6);
  }

  // Emission + alpha at an equatorial-plane crossing point p, viewed along dir.
  vec4 sampleDisk(vec3 p, vec3 dir){
    float rr = length(p.xz);
    float t  = (rr - uDiskInner) / (uDiskOuter - uDiskInner);
    if (t < 0.0 || t > 1.0) return vec4(0.0);

    // Soft inner/outer fade so the ring has no hard edges.
    float edge = smoothstep(0.0, 0.07, t) * smoothstep(1.0, 0.72, t);

    // Inner disk is far hotter/brighter (kept moderate so the temperature
    // colours survive Bloom instead of clipping to white).
    float bright = pow(1.0 - t, 2.2) * 1.1 + 0.04;
    vec3  col    = diskGradient(t);

    // Differential rotation (inner spins faster) + turbulent substructure.
    float ang  = atan(p.z, p.x);
    float spin = uTime * (0.55 / (0.25 + rr * 0.12));
    float a2   = ang + spin;
    vec3  sp   = vec3(cos(a2), sin(a2), 0.0) * rr * 0.5 + vec3(0.0, 0.0, uTime * 0.04);
    float turb   = fbm(sp, 4) * 0.5 + 0.5;
    float streak = fbm(vec3(a2 * 3.0, rr * 0.7, uTime * 0.1), 3) * 0.5 + 0.5;
    bright *= (0.45 + 0.75 * turb) * (0.7 + 0.5 * streak);

    // Relativistic Doppler beaming: the side rotating toward us is brighter and
    // blue-shifted; the receding side dims and reddens (ties the physics to the
    // site's cyan↔magenta palette).
    vec3  orb  = normalize(vec3(-p.z, 0.0, p.x)); // circular orbital velocity (CCW)
    float beam = dot(orb, -normalize(dir));
    float dop  = pow(clamp(1.0 + 0.5 * beam, 0.0, 2.0), 3.0);
    bright *= max(dop, 0.22); // floor keeps the receding side faintly visible
    col = mix(col, vec3(0.75, 0.88, 1.00), clamp( beam, 0.0, 1.0) * 0.35);
    col = mix(col, vec3(1.00, 0.32, 0.22), clamp(-beam, 0.0, 1.0) * 0.40);

    float alpha = edge * clamp(bright * 0.7, 0.0, 1.0);
    return vec4(col * bright, alpha);
  }

  void main(){
    // Photon state in horizon-normalised, black-hole-centred coordinates.
    vec3 ro = (cameraPosition - uCenter) / uRs;
    vec3 rd = normalize(vWorldPos - cameraPosition);

    // Conserved specific angular momentum h² = |r × v|² (impact parameter²).
    vec3  hvec = cross(ro, rd);
    float h2   = dot(hvec, hvec);

    // Early-out: a ray contributes only if it can be captured / graze the photon
    // sphere (impact parameter b ≲ 2.6) or cross the disk annulus. Any point on
    // the straight ray is at distance ≥ b from the centre, so the equatorial
    // crossing radius bounds the disk test. Bail on everything else (the void
    // around and beyond the disk) before paying for the march.
    float b = sqrt(h2);
    float sCross = abs(rd.y) > 1e-4 ? -ro.y / rd.y : -1.0;
    float crossRad = sCross > 0.0 ? length((ro + rd * sCross).xz) : 1e9;
    if (b > 2.7 && crossRad > uDiskOuter + 1.5) discard;

    vec3  pos = ro;
    vec3  vel = rd;
    float r   = length(pos);
    float escapeR = max(r * 1.6, 12.0);

    vec4  acc       = vec4(0.0); // front-to-back composited disk colour + coverage
    float hitShadow = 0.0;

    int nx = 0; // composited disk crossings so far

    for (int i = 0; i < STEPS; i++){
      // Adaptive step: large far away, small near the hole for accuracy.
      float dt = clamp(0.10 * (r - 1.0), 0.015, 0.35);
      vec3 prevPos = pos;

      vec3 g = -1.5 * h2 * pos / pow(dot(pos, pos) + 1e-4, 2.5);
      vel += g * dt;
      pos += vel * dt;
      r = length(pos);

      // Crossed the event horizon → captured (the shadow).
      if (r < 1.0){ hitShadow = 1.0; break; }

      // Crossed the equatorial plane → sample the disk and composite. Only the
      // first two images (direct view + the primary lensed wrap-over) are kept;
      // rays grazing the photon sphere cross many more times, and those finite-
      // step higher-order images would otherwise smear into a banded "bullseye"
      // inside the shadow. Their light is represented by the photon-ring term.
      if (prevPos.y * pos.y < 0.0 && nx < 2){
        float f  = prevPos.y / (prevPos.y - pos.y);
        vec3  hp = mix(prevPos, pos, f);
        vec4  d  = sampleDisk(hp, vel);
        if (d.a > 0.0){
          acc.rgb += (1.0 - acc.a) * d.rgb * d.a;
          acc.a   += (1.0 - acc.a) * d.a;
          nx++;
        }
      }

      if (r > escapeR) break;
      if (acc.a > 0.995) break;
    }

    vec3  outRgb = acc.rgb * uBrightness;
    float outA   = acc.a;

    // Photon ring: rays whose impact parameter sits at the critical value
    // (b ≈ 3√3/2 ≈ 2.598, the photon sphere) pile light into a thin bright
    // Einstein ring hugging the shadow, with a soft outer halo. Driving this off
    // the analytic, continuous impact parameter b — rather than the closest
    // approach sampled at discrete march steps — keeps it band-free.
    float dB   = b - 2.598;
    float ring = exp(-pow(dB / 0.055, 2.0)) + 0.22 * exp(-pow(dB / 0.2, 2.0));
    vec3 ringCol = vec3(1.0, 0.93, 0.8);
    outRgb += (1.0 - outA * 0.6) * ringCol * ring * 1.4;
    outA = clamp(max(outA, ring * 0.9), 0.0, 1.0);

    // Shadow is opaque black; everything else that escaped stays transparent so
    // the deep-space void/starfield reads behind the hole.
    if (hitShadow > 0.5) outA = 1.0;
    if (outA <= 0.002) discard;

    gl_FragColor = vec4(outRgb, outA);
  }
`
