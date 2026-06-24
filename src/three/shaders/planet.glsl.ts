import { noiseGLSL } from './noise.glsl'

/**
 * Planet surface shader.
 *  - Day/night terminator from the live sun direction (soft smoothstep edge).
 *  - Procedural surface via fbm (no textures yet — swap in a `map` here later).
 *  - Latitude banding for the gas giants (uBands).
 *  - Earth-style ocean mask (uOcean) with a Blinn-Phong specular glint and a
 *    warm night-side glow on the land (uNight) to read as city lights.
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

  ${noiseGLSL}

  float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }

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
      surf = texture2D(uMap, vUv).rgb;

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
    vec3 H = normalize(L + V);
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
 * Ring shader (Saturn / faint Uranus). Radial position drives concentric
 * banding + a crude Cassini-style gap. Lit softly by the sun direction.
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
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform vec3 uSunDir;

  ${noiseGLSL}

  void main() {
    float t = (vR - uInner) / (uOuter - uInner);
    if (t < 0.0 || t > 1.0) discard;

    float bands = 0.5 + 0.5 * sin(t * 70.0);
    float grain = fbm(vec3(t * 40.0, 0.0, 0.0), 3) * 0.5 + 0.5;

    // Soft inner/outer fade + a darker gap around the middle.
    float edges = smoothstep(0.0, 0.05, t) * smoothstep(1.0, 0.93, t);
    float gap = 1.0 - 0.6 * exp(-pow((t - 0.52) * 14.0, 2.0));

    float a = (0.4 + 0.5 * bands) * grain * edges * gap * uOpacity;

    float lit = 0.5 + 0.5 * max(dot(normalize(vWorldNormal), normalize(uSunDir)), 0.0);
    gl_FragColor = vec4(uColor * (0.6 + 0.4 * bands) * lit, a);
  }
`
