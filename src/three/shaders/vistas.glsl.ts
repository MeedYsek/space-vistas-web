import { noiseGLSL } from './noise.glsl'

/**
 * Deep-space vista plane.
 *
 * The fragment shader paints a procedural cosmic scene (one of five `kind`s) from
 * the vista's three palette colours, then a noise-driven reveal wipe materialises
 * it as the camera pans it into frame: per-pixel a noise threshold gates
 * visibility against `uReveal`, the wipe front glows, and the UV is displaced
 * (easing to zero) so it resolves "out of focus" into focus. A soft frame
 * vignette keeps it reading as a framed image, not a hard rectangle.
 *
 * Uniforms: uTime, uReveal (0→1), uSeed, uKind, uColorA/B/C, uAspect.
 * To use a real photo instead, sample a `uTex` in place of vistaImage() (README).
 */
export const vistaVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const vistaFragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform float uTime;
  uniform float uReveal;
  uniform float uFade;
  uniform float uSeed;
  uniform int uKind;
  uniform int uOctaves; // fbm detail — lower on low-power devices
  uniform vec3 uColorA; // dark base
  uniform vec3 uColorB; // mid
  uniform vec3 uColorC; // glow / highlight
  uniform float uAspect;
  uniform sampler2D uTex;
  uniform int uUseTexture;
  uniform float uImgAspect; // real image aspect ratio for cover-fit UV

  ${noiseGLSL}

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  // Sprinkle of faint background stars.
  float stars(vec2 uv, float density, float sharp){
    vec2 g = floor(uv * density);
    float h = hash(g + uSeed);
    if (h < 0.86) return 0.0;
    vec2 f = fract(uv * density) - 0.5;
    return smoothstep(sharp, 0.0, length(f)) * (0.5 + 0.5 * hash(g + 3.1));
  }

  vec3 vistaImage(vec2 uv){
    vec3 col = uColorA;
    vec2 p = (uv - 0.5) * vec2(uAspect, 1.0);
    float t = uTime * 0.03;

    if (uKind == 1) {
      // Spiral galaxy: log-spiral arms + warm core falloff.
      float r = length(p);
      float a = atan(p.y, p.x);
      float arms = cos(a * 2.0 + r * 9.0 - t * 2.0) * 0.5 + 0.5;
      float disk = smoothstep(0.6, 0.0, r);
      float n = fbm(vec3(p * 4.0, t), uOctaves) * 0.5 + 0.5;
      float spiral = pow(arms, 2.0) * disk * n;
      float core = smoothstep(0.16, 0.0, r);
      col = mix(uColorA, uColorB, spiral);
      col += uColorC * (spiral * 0.6 + core * 1.2);
    } else if (uKind == 2) {
      // Aurora: vertical curtains shimmering across x.
      float curtain = fbm(vec3(uv.x * 5.0, uv.y * 1.2 - t * 2.0, uSeed), uOctaves) * 0.5 + 0.5;
      float band = smoothstep(0.0, 0.5, uv.y) * smoothstep(1.0, 0.5, uv.y);
      float ribbons = pow(curtain, 2.2) * band;
      col = mix(uColorA, uColorB, ribbons);
      col += uColorC * pow(ribbons, 1.5) * 0.8;
    } else if (uKind == 3) {
      // Ringed world: a lit sphere with an elliptical ring band.
      vec2 q = p + vec2(0.05, 0.04);
      float r = length(q);
      float planet = smoothstep(0.30, 0.27, r);
      float lit = clamp(dot(normalize(vec3(q, sqrt(max(0.0, 0.09 - r*r)))), normalize(vec3(-0.6, 0.5, 0.6))), 0.0, 1.0);
      vec2 rp = vec2(q.x, q.y * 3.0);
      float rr = length(rp);
      float ring = smoothstep(0.62, 0.60, rr) * smoothstep(0.40, 0.42, rr) * (1.0 - planet);
      float surf = fbm(vec3(q * 6.0, t), uOctaves) * 0.5 + 0.5;
      col = mix(uColorA, uColorB, planet * (0.3 + 0.7 * lit) * (0.6 + 0.4 * surf));
      col += uColorC * (ring * 0.9 + planet * lit * 0.3);
    } else if (uKind == 4) {
      // Pillars: towers of gas rising, bright-rimmed.
      float n = fbm(vec3(uv * vec2(3.0, 2.0) + vec2(0.0, t), uSeed), uOctaves) * 0.5 + 0.5;
      float pillars = smoothstep(0.42, 0.6, n + uv.y * 0.25);
      float rim = smoothstep(0.55, 0.62, n) * smoothstep(0.72, 0.6, n);
      col = mix(uColorA, uColorB, pillars);
      col += uColorC * rim * 1.1;
    } else {
      // Default nebula: layered fbm clouds.
      float n1 = fbm(vec3(p * 2.4, t), uOctaves) * 0.5 + 0.5;
      float n2 = fbm(vec3(p * 5.0 + 9.0, -t), uOctaves) * 0.5 + 0.5;
      float cloud = pow(n1, 1.6);
      col = mix(uColorA, uColorB, cloud);
      col += uColorC * pow(n2 * cloud, 2.0) * 1.3;
    }

    // Stars over everything.
    col += vec3(stars(uv, 90.0, 0.32)) * 0.9;
    col += vec3(0.8, 0.85, 1.0) * stars(uv + 5.0, 40.0, 0.42) * 0.5;
    return col;
  }

  void main() {
    // Displacement eases to zero as the vista resolves into focus.
    float defocus = 1.0 - uReveal;
    vec2 d = vec2(
      fbm(vec3(vUv * 3.0, uSeed), 3),
      fbm(vec3(vUv * 3.0 + 11.0, uSeed), 3)
    ) * defocus * 0.12;
    vec3 img;
    if (uUseTexture == 1) {
      // Cover-fit: scale UV so the image fills the plane without distortion.
      vec2 texUv = vUv + d;
      if (uImgAspect > uAspect) {
        texUv.x = (texUv.x - 0.5) * (uAspect / uImgAspect) + 0.5;
      } else {
        texUv.y = (texUv.y - 0.5) * (uImgAspect / uAspect) + 0.5;
      }
      img = texture2D(uTex, clamp(texUv, 0.001, 0.999)).rgb;
    } else {
      img = vistaImage(vUv + d);
    }

    // Per-pixel noise threshold gates the wipe; the front edge glows.
    float thr = fbm(vec3(vUv * 3.5, uSeed * 1.7), uOctaves) * 0.5 + 0.5;
    float edge = 0.12;
    float mask = smoothstep(thr - edge, thr + edge, uReveal);
    float front = smoothstep(edge, 0.0, abs(uReveal - thr)) * (1.0 - smoothstep(0.97, 1.0, uReveal));

    // Frame vignette so it reads as a framed plate.
    vec2 fv = abs(vUv - 0.5) * 2.0;
    float frame = smoothstep(1.0, 0.7, max(fv.x, fv.y));

    vec3 col = img + uColorC * front * 0.9;
    float alpha = mask * frame * uFade;
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(col, alpha);
  }
`
