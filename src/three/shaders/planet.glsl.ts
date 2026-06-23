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
  varying vec3 vObjPos;   // object-space position → surface pattern sticks to the planet
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vObjPos = position;
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

  ${noiseGLSL}

  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 L = normalize(uSunDir);
    float ndl = dot(N, L);
    float day = smoothstep(-0.08, 0.22, ndl); // soft terminator

    // Procedural surface, sampled in object space so detail is radius-independent
    // and fixed to the planet (rotates with spin, doesn't crawl as it orbits).
    vec3 dir = normalize(vObjPos);
    vec3 sp = dir * (3.0 + uFreq * 3.0);
    float n = fbm(sp + uSeed, 5);
    float nn = n * 0.5 + 0.5;

    // Latitude banding (gas giants).
    float bands = 0.5 + 0.5 * sin(dir.y * 16.0 + n * 3.0);
    vec3 surf = mix(uColorA, uColorB, nn);
    surf = mix(surf, mix(uColorA, uColorB, bands), uBands);

    // Ocean.
    float ocean = step(nn, uOceanLevel) * uOcean;
    surf = mix(surf, uOceanColor, ocean);

    // Specular glint on water.
    vec3 V = normalize(cameraPosition - vWorldPos);
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), 80.0) * ocean * day;

    vec3 dayCol = surf * (0.04 + day * 0.91);
    vec3 nightCol = uNightColor * uNight * (1.0 - day) * (1.0 - ocean) * smoothstep(0.45, 0.6, nn);
    vec3 color = dayCol + nightCol + spec * vec3(1.0, 0.96, 0.85);

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

  ${noiseGLSL}

  void main() {
    vec3 N = normalize(vWorldNormal);
    float day = smoothstep(-0.05, 0.25, dot(N, normalize(uSunDir)));
    vec3 dir = normalize(vObjPos);
    vec3 p = dir * (3.5 + uFreq * 2.0) + vec3(uTime * uSpeed, 0.0, 0.0) + uSeed;
    float c = fbm(p, 5) * 0.5 + 0.5;
    c = smoothstep(0.5, 0.78, c);
    float a = c * uOpacity * (0.04 + day);
    gl_FragColor = vec4(vec3(1.0) * (0.45 + day * 0.6), a);
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
