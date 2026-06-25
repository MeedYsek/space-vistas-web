import { noiseGLSL } from './noise.glsl'

/**
 * Saturn-like radial ring structure, t in 0..1 (inner → outer), returns 0..1.
 * Shared by the ring shader (its own opacity/brightness) and the planet surface
 * shader (so the ring SHADOW cast on the globe carries the same gap structure).
 * Declared first so both fragment strings can interpolate it; assumes fbm() is in
 * scope, so place it AFTER ${noiseGLSL} wherever it's used.
 */
export const ringDensityGLSL = /* glsl */ `
  float ringDensity(float t) {
    float dens = 0.0;
    dens += 0.35 * smoothstep(0.02, 0.10, t) * (1.0 - smoothstep(0.22, 0.26, t)); // C ring (faint)
    dens += 0.95 * smoothstep(0.24, 0.30, t) * (1.0 - smoothstep(0.49, 0.53, t)); // B ring (dense)
    dens += 0.70 * smoothstep(0.60, 0.64, t) * (1.0 - smoothstep(0.94, 0.98, t)); // A ring
    // Cassini Division is the gap between B and A (~0.53..0.60). Encke gap is thin.
    float enk = (t - 0.885) * 130.0;
    dens *= 1.0 - 0.85 * exp(-enk * enk);
    dens *= 0.82 + 0.18 * sin(t * 200.0);                              // fine ringlets
    dens *= 0.78 + 0.22 * (fbm(vec3(t * 55.0, 0.0, 0.0), 3) * 0.5 + 0.5); // icy grain
    return clamp(dens, 0.0, 1.0);
  }
`

/**
 * Planet surface shader — grounded-realism lighting over a real NASA texture
 * (falls back to procedural fbm before the map loads). Layered on top:
 *  - Albedo: texture map, or fbm + latitude banding (uBands) for the gas giants.
 *  - Lighting: sun as a point source; terminator WIDTH gated by atmosphere
 *    (uTermSoft: airless → razor sharp, thick air → soft), with Lambert
 *    form-shading for airless worlds. Night side near-black (uNightLift) + a cool
 *    starlight-rim whisper so it reads as a sphere.
 *  - Surface relief (uRelief): normal perturbed from the map's luminance so
 *    craters self-shade at the terminator (airless bodies).
 *  - Per-world extras, all knob-gated: surface haze (Venus), tight ocean glint +
 *    polar aurora (Earth), warm night-side city lights (uNight), terminator
 *    scatter band, and gas-giant differential band flow + Great Red Spot.
 */
export const planetVertex = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying vec3 vWorldTangent; // east-pointing surface tangent → relief frame
  varying vec3 vObjPos;   // object-space position → surface pattern sticks to the planet
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vObjPos = position;
    // East-pointing tangent (increasing longitude / U), derivative-free. Guard
    // the poles where cross() with the spin axis collapses.
    vec3 nrm = normalize(position);
    vec3 t = cross(vec3(0.0, 1.0, 0.0), nrm);
    t = length(t) > 1e-4 ? normalize(t) : vec3(1.0, 0.0, 0.0);
    vWorldTangent = normalize(mat3(modelMatrix) * t);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

export const planetFragment = /* glsl */ `
  precision highp float;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying vec3 vWorldTangent;
  varying vec3 vObjPos;
  varying vec2 vUv;

  uniform float uTime;
  uniform vec3 uSunDir;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uFreq;
  uniform float uBands;
  uniform float uSeed;
  uniform float uOcean;
  uniform vec3 uOceanColor;
  uniform float uOceanLevel;
  uniform vec3 uNightColor;
  uniform float uNight;
  uniform sampler2D uMap;
  uniform float uUseMap;
  // Grounded-realism additions:
  uniform float uRelief;        // normal-from-luminance strength (0 = flat)
  uniform float uTermSoft;      // 0 = sharp/airless terminator, 1 = soft (atmo)
  uniform vec3 uSunColor;       // subtly warm point-source sunlight
  uniform float uNightLift;     // flat night ambient (keeps night near-black)
  uniform float uStarlight;     // faint starlight rim on the night limb
  uniform vec3 uStarTint;       // cool starlight / nebula reflection tint
  uniform vec3 uScatterColor;   // atmospheric terminator scatter (atmo planets)
  uniform float uScatterStrength;
  uniform float uHaze;          // veil the surface toward uHazeColor (cloud-shrouded worlds)
  uniform vec3 uHazeColor;
  uniform float uOceanGlint;    // tight sun glint on textured oceans (Earth); 0 = off
  uniform vec3 uAuroraColor;    // polar night-side aurora tint
  uniform float uAuroraStrength;// 0 = off
  uniform float uBandFlow;      // gas-giant differential band flow speed; 0 = off
  uniform vec2 uGRSPos;         // Great Red Spot centre in texture UV
  uniform vec2 uGRSSize;        // GRS radii in UV
  uniform float uGRSStrength;   // GRS enhancement (0 = off)
  uniform float uGRSSwirl;      // static vortex twist toward the centre
  uniform float uGRSSpin;       // GRS rotation speed
  uniform float uRingShadow;    // ring shadow cast onto this planet (0 = no ring)
  uniform float uRingInner;     // ring inner/outer radius (world units)
  uniform float uRingOuter;
  uniform vec3 uRingNormal;     // ring-plane normal (planet axis, world)
  uniform vec3 uRingCenter;     // planet world position
  uniform float uSaturation;    // per-planet vibrance (1.0 = realistic)

  ${noiseGLSL}
  ${ringDensityGLSL}

  float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }

  // Jovian zonal jets: alternating drift rate by latitude (v in 0..1).
  float jovianFlow(float v){
    float lat = (v - 0.5) * 2.0;
    return sin(lat * 9.0) * 0.6 + sin(lat * 20.0) * 0.3;
  }

  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 L = normalize(uSunDir);
    vec3 V = normalize(cameraPosition - vWorldPos);

    vec3 surf;
    float ocean = 0.0;
    float nn = 0.5;

    if (uUseMap > 0.5) {
      // Real texture map — sampled via equirectangular sphere UVs (U=longitude,
      // V=latitude). The texture spins with the planet mesh because UVs are in
      // object space. sRGB values come through as-is in this linear shader, which
      // gives a slightly gamma-lifted look that reads well under the dark ambient.
      vec2 sampleUV = vUv;
      float grsMask = 0.0;

      // Gas-giant differential band flow: shear each latitude row over time so the
      // belts and zones drift past each other (off when uBandFlow == 0).
      if (uBandFlow > 0.0) {
        float off = uTime * uBandFlow * jovianFlow(vUv.y);
        sampleUV.x = fract(vUv.x - off);

        // Great Red Spot: a localized swirling vortex. Measured in texture space
        // (where the spot is fixed at uGRSPos), so the mask tracks it as it flows.
        if (uGRSStrength > 0.0) {
          vec2 rel = vec2(sampleUV.x - uGRSPos.x, sampleUV.y - uGRSPos.y);
          rel.x -= floor(rel.x + 0.5); // wrap longitude to [-0.5, 0.5]
          float dist = length(rel / uGRSSize);
          grsMask = 1.0 - smoothstep(0.6, 1.0, dist);
          float ang = uGRSSwirl * grsMask + uTime * uGRSSpin;
          float s = sin(ang), co = cos(ang);
          vec2 relRot = vec2(co * rel.x - s * rel.y, s * rel.x + co * rel.y);
          vec2 swirlUV = vec2(fract(uGRSPos.x + relRot.x), uGRSPos.y + relRot.y);
          sampleUV = mix(sampleUV, swirlUV, grsMask);
        }
      }

      surf = texture2D(uMap, sampleUV).rgb;

      // Enhance the GRS so it reads as a defined red-orange storm (saturate + warm).
      if (grsMask > 0.0) {
        float l = luma(surf);
        vec3 enh = mix(vec3(l), surf, 1.7) * vec3(1.16, 0.9, 0.8);
        surf = mix(surf, enh, grsMask * uGRSStrength);
      }

      // Surface relief: perturb the normal by the map's luminance gradient so
      // craters and ridges self-shade at the terminator (4 extra taps; airless
      // bodies lean on this hard since they have no atmosphere to soften them).
      if (uRelief > 0.0) {
        vec3 T = normalize(vWorldTangent);
        vec3 B = cross(N, T);
        float e = 0.0013;
        float hR = luma(texture2D(uMap, vUv + vec2(e, 0.0)).rgb);
        float hL = luma(texture2D(uMap, vUv - vec2(e, 0.0)).rgb);
        float hU = luma(texture2D(uMap, vUv + vec2(0.0, e)).rgb);
        float hD = luma(texture2D(uMap, vUv - vec2(0.0, e)).rgb);
        vec2 grad = vec2(hR - hL, hU - hD);
        N = normalize(N - (T * grad.x + B * grad.y) * uRelief);
      }
    } else {
      // Procedural surface — fbm in object space so detail sticks to the spin.
      vec3 dir = normalize(vObjPos);
      vec3 sp = dir * (3.0 + uFreq * 3.0);
      float n = fbm(sp + uSeed, 5);
      nn = n * 0.5 + 0.5;

      // Latitude banding (gas giants).
      float bands = 0.5 + 0.5 * sin(dir.y * 16.0 + n * 3.0);
      surf = mix(uColorA, uColorB, nn);
      surf = mix(surf, mix(uColorA, uColorB, bands), uBands);

      // Ocean.
      ocean = step(nn, uOceanLevel) * uOcean;
      surf = mix(surf, uOceanColor, ocean);
    }

    // Veil the surface toward a haze colour for cloud-shrouded worlds (Venus),
    // so the bare radar map only shows through partly. 0 = untouched.
    surf = mix(surf, uHazeColor, uHaze);

    // Terminator from the (relief-perturbed) normal. The band WIDTH is gated by
    // atmosphere: airless → razor sharp, thick air → soft scattering edge.
    float ndl = dot(N, L);
    float e0 = mix(-0.015, -0.08, uTermSoft);
    float e1 = mix(0.03, 0.22, uTermSoft);
    float day = smoothstep(e0, e1, ndl);

    // Specular glint on water (procedural ocean only; texture has its own water).
    // Guard the half-vector: viewing the anti-sun (night) side makes L + V ≈ 0,
    // and normalize(vec3(0)) is undefined → NaN on real GPUs. Because NaN * 0 is
    // still NaN, that survives the ocean*day mask and the global bloom then smears
    // it to a full-screen black flicker. Fall back to N when the sum collapses.
    vec3 hv = L + V;
    vec3 H = dot(hv, hv) > 1e-6 ? normalize(hv) : N;
    float spec = pow(max(dot(N, H), 0.0), 80.0) * ocean * day;

    // Tight sun glint on textured oceans (Earth): mask water by its blueness so
    // land, ice and cloud stay matte, then a sharp specular hotspot.
    float glint = 0.0;
    if (uUseMap > 0.5 && uOceanGlint > 0.0) {
      float blueness = surf.b - max(surf.r, surf.g);
      float oceanMask = smoothstep(0.02, 0.12, blueness);
      glint = pow(max(dot(N, H), 0.0), 200.0) * oceanMask * day * uOceanGlint;
    }

    // Lit hemisphere: warm point-source sun. Airless worlds (low uTermSoft) get
    // strong Lambert form-shading — the disk rounds off toward the limb and
    // craters self-shade — while thick-atmosphere worlds keep their flat fill.
    float form = mix(1.0, 0.45 + 0.55 * clamp(ndl, 0.0, 1.0), 1.0 - uTermSoft);
    vec3 dayCol = surf * uNightLift + surf * day * 0.91 * uSunColor * form;

    // Ring shadow cast onto the planet (Saturn/Uranus): trace from this lit
    // fragment toward the sun to the ring plane; darken by the ring density where
    // it lands, so the Cassini gap reads as a bright line across the shadow band.
    if (uRingShadow > 0.0) {
      float denom = dot(L, uRingNormal);
      if (abs(denom) > 1e-4) {
        float tHit = dot(uRingCenter - vWorldPos, uRingNormal) / denom;
        if (tHit > 0.0) {
          float rr = length(vWorldPos + L * tHit - uRingCenter);
          float tt = (rr - uRingInner) / (uRingOuter - uRingInner);
          if (tt >= 0.0 && tt <= 1.0) {
            dayCol *= 1.0 - 0.6 * ringDensity(tt) * uRingShadow * day;
          }
        }
      }
    }

    // Night-side starlight whisper — a faint cool rim so the dark side reads as a
    // sphere, not a hole punched in space.
    float nightRim = pow(1.0 - max(dot(N, V), 0.0), 2.5) * (1.0 - day);
    vec3 starCol = uStarTint * nightRim * uStarlight;

    // Warm atmospheric scatter at the terminator (inert when strength = 0, e.g.
    // airless Mercury; tuned up for Venus/Earth later).
    float termBand = day * (1.0 - day) * 4.0;
    vec3 scatterCol = uScatterColor * termBand * uScatterStrength;

    vec3 nightCity = uNightColor * uNight * (1.0 - day) * (1.0 - ocean) * smoothstep(0.45, 0.6, nn);

    // Faint cool aurora on the night side — a soft, shimmering oval band near the
    // geographic poles (object-space latitude), only where the sun doesn't reach.
    vec3 auroraCol = vec3(0.0);
    if (uAuroraStrength > 0.0) {
      vec3 odir = normalize(vObjPos);
      float lat = abs(odir.y);
      float band = smoothstep(0.80, 0.90, lat) * (1.0 - smoothstep(0.97, 1.0, lat));
      float shimmer = fbm(odir * 6.0 + vec3(uTime * 0.15, 0.0, uTime * 0.1), 3) * 0.5 + 0.5;
      auroraCol = uAuroraColor * band * (1.0 - day) * shimmer * uAuroraStrength;
    }

    vec3 color = dayCol + starCol + scatterCol + nightCity + auroraCol
               + (spec + glint) * vec3(1.0, 0.97, 0.9);

    // Vibrance/saturation — a per-planet art knob (1.0 = realistic, >1 = punchier).
    color = max(mix(vec3(luma(color)), color, uSaturation), 0.0);

    gl_FragColor = vec4(color, 1.0);
  }
`

/**
 * Cloud shell — a slightly larger transparent sphere with drifting fbm. Lit by
 * the same sun direction so clouds fall into shadow at the terminator.
 */
export const cloudsFragment = /* glsl */ `
  precision highp float;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying vec3 vObjPos;
  varying vec2 vUv;

  uniform float uTime;
  uniform vec3 uSunDir;
  uniform float uOpacity;
  uniform float uSpeed;
  uniform float uSeed;
  uniform float uFreq;
  uniform vec3 uColor;      // cloud tint (white default; cream for Venus)
  uniform float uCoverage;  // 0..1, higher = a more complete cloud deck

  ${noiseGLSL}

  void main() {
    vec3 N = normalize(vWorldNormal);
    float day = smoothstep(-0.05, 0.25, dot(N, normalize(uSunDir)));
    vec3 dir = normalize(vObjPos);
    vec3 p = dir * (3.5 + uFreq * 2.0) + vec3(uTime * uSpeed, 0.0, 0.0) + uSeed;
    float c = fbm(p, 5) * 0.5 + 0.5;
    float lo = mix(0.6, 0.2, uCoverage); // lower threshold → more cloud
    c = smoothstep(lo, lo + 0.28, c);
    float a = c * uOpacity * (0.04 + day);
    gl_FragColor = vec4(uColor * (0.45 + day * 0.6), a);
  }
`

/**
 * Forward-scattering atmosphere shell (opt-in, for thick-atmosphere worlds like
 * Venus). Drawn on a slightly larger BackSide sphere with additive blending —
 * same as the shared sun glow, but the silhouette glow is concentrated on the
 * sun-facing limb, brightened where we look toward the sun through the haze
 * (forward scatter), and thickened into a bright arc at the terminator limb.
 * Reuse glowVertex for the vertex stage.
 */
export const atmosphereFragment = /* glsl */ `
  precision highp float;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;

  uniform vec3 uColor;
  uniform float uPower;
  uniform float uIntensity;
  uniform vec3 uSunDir;
  uniform float uForward; // forward-scatter strength

  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(cameraPosition - vWorldPos);
    vec3 L = normalize(uSunDir);

    float fres = pow(1.0 - max(dot(N, V), 0.0), uPower); // limb silhouette
    float lit = max(dot(N, L), 0.0);                     // sun-facing hemisphere
    float term = lit * (1.0 - lit) * 4.0;                // peaks at the terminator
    // Forward scattering: bright when the view ray points toward the sun.
    float mu = max(dot(-V, L), 0.0);
    float forward = pow(mu, 4.0) * uForward;

    float glow = fres * (0.2 + 0.8 * lit);  // asymmetric halo, dim on the night limb
    glow *= 1.0 + forward;                   // brighten toward the sun
    glow += fres * term * uForward * 0.4;    // golden twilight arc at the terminator

    float a = glow * uIntensity;
    gl_FragColor = vec4(uColor * a, a);
  }
`

/**
 * Ring shader (Saturn / faint Uranus). The radial density profile drives the
 * structure; the rings are front-lit (reflectance ∝ how opaque they are) OR
 * back-lit (sparse regions forward-scatter and glow, dense regions silhouette),
 * blended by view-vs-sun phase. The planet casts a soft shadow band onto them.
 * vR is the object-space radius set in the vertex stage.
 */
export const ringVertex = /* glsl */ `
  varying float vR;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  void main() {
    vR = length(position.xy);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

export const ringFragment = /* glsl */ `
  precision highp float;
  varying float vR;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;

  uniform float uInner;
  uniform float uOuter;
  uniform vec3 uColorInner;     // ring tint at the inner edge → outer edge (gradient)
  uniform vec3 uColorOuter;
  uniform float uOpacity;
  uniform vec3 uSunDir;
  uniform vec3 uPlanetCenter;   // planet world position
  uniform float uPlanetRadius;
  uniform float uForwardScatter; // backlit glow strength

  ${noiseGLSL}
  ${ringDensityGLSL}

  void main() {
    float t = (vR - uInner) / (uOuter - uInner);
    if (t < 0.0 || t > 1.0) discard;

    float dens = ringDensity(t);
    float edges = smoothstep(0.0, 0.025, t) * smoothstep(1.0, 0.96, t);
    dens *= edges;
    if (dens < 0.002) discard;

    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(cameraPosition - vWorldPos);
    vec3 L = normalize(uSunDir);

    // Planet shadow on the rings: the fragment is shadowed if it sits behind the
    // planet (anti-sunward) within the planet's radius — a soft cylinder of shade.
    vec3 rel = vWorldPos - uPlanetCenter;
    float along = dot(rel, L);
    float perp = length(rel - along * L);
    float planetShadow = along < 0.0 ? smoothstep(uPlanetRadius, uPlanetRadius * 0.82, perp) : 0.0;

    // Front-lit reflectance (off whichever face the sun hits) blended with a
    // back-lit forward-scatter glow (sun behind → sparse glows, dense silhouettes).
    float litFace = abs(dot(N, L));
    float front = 0.4 + 0.6 * litFace;
    float toward = max(dot(-V, L), 0.0);          // 1 = view looks toward the sun
    float backFactor = smoothstep(0.0, 0.6, dot(-V, L));
    float scatter = (1.0 - dens) * uForwardScatter * toward * toward;

    float bright = front * (1.0 - 0.85 * backFactor) + scatter * backFactor;
    bright *= 1.0 - 0.92 * planetShadow;

    float a = (dens + scatter * backFactor * 0.6) * uOpacity * (1.0 - 0.85 * planetShadow);
    a = clamp(a, 0.0, 1.0);

    // Warm-to-bright radial colour gradient gives the rings depth + pop.
    vec3 ringCol = mix(uColorInner, uColorOuter, t);
    gl_FragColor = vec4(ringCol * bright, a);
  }
`
