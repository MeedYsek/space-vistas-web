import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { CAMERA, FLIGHT, ACTS, GALAXY, SINGULARITY } from '../config/scene'
import { PLANETS, SUN } from '../config/planets'
import { sunPosition, planetPositions } from './solar/planetRegistry'
import { flight } from '../lib/flight'
import { solarStore } from '../lib/solarStore'
import { easePointer, pointer } from '../lib/pointer'

interface CameraRigProps {
  ignited: boolean
  reducedMotion: boolean
}

const { clamp, smoothstep, lerp } = THREE.MathUtils

/**
 * The camera director. Blends three acts by scroll progress:
 *
 *   HERO   — a fixed wide pose looking toward the distant sun (+ idle breathing).
 *   SOLAR  — follows the live planet positions, dwelling on each ("pinning" via a
 *            plateaued ease) and framing the lit face from the far-from-sun side.
 *            While focused, the pointer orbits the view around the planet.
 *   GALAXY — a slow orbital arc around the particle galaxy (the centerpiece).
 *   OUTER  — peeling away on a short lerp until the galaxy is a point of light.
 *
 * The acts crossfade with smoothstep weights so the whole thing reads as one
 * continuous flight. Under reduced motion the camera simply holds at the hero
 * pose. The active body is published to solarStore for the DOM info-cards.
 */
export default function CameraRig({ ignited, reducedMotion }: CameraRigProps) {
  const camera = useThree((s) => s.camera)

  const v = useMemo(
    () => ({
      heroPos: new THREE.Vector3(),
      heroLook: new THREE.Vector3(),
      solarPos: new THREE.Vector3(),
      solarLook: new THREE.Vector3(),
      galaxyPos: new THREE.Vector3(),
      galaxyLook: new THREE.Vector3(),
      galaxyCenter: new THREE.Vector3(...GALAXY.position),
      singularityPos: new THREE.Vector3(),
      singularityLook: new THREE.Vector3(),
      singularityCenter: new THREE.Vector3(...SINGULARITY.position),
      vistasPos: new THREE.Vector3(),
      vistasLook: new THREE.Vector3(),
      outerPos: new THREE.Vector3(),
      outerLook: new THREE.Vector3(),
      finalPos: new THREE.Vector3(),
      finalLook: new THREE.Vector3(),
      a: new THREE.Vector3(),
      b: new THREE.Vector3(),
      outward: new THREE.Vector3(),
      up: new THREE.Vector3(0, 1, 0),
      tangent: new THREE.Vector3(),
      offset: new THREE.Vector3(),
    }),
    [],
  )

  // Ignite once the preloader completes.
  useEffect(() => {
    if (!ignited) return
    if (reducedMotion) {
      flight.introZ = 0
      flight.warp = 0
      return
    }
    flight.warp = FLIGHT.warpStart
    gsap.to(flight, { introZ: 0, duration: FLIGHT.introDuration, ease: 'expo.out' })
    gsap.to(flight, { warp: 0, duration: FLIGHT.introDuration * 1.15, ease: 'power2.out' })
  }, [ignited, reducedMotion])

  const stopPos = (k: number, out: THREE.Vector3) =>
    k === 0 ? out.copy(sunPosition) : out.copy(planetPositions[k - 1])
  const stopRadius = (k: number) => (k === 0 ? SUN.radius : PLANETS[k - 1].radius)

  /** Solar act: returns the active stop index (0 = sun, 1..8 = planets). */
  const computeSolar = (localP: number): number => {
    const N = PLANETS.length
    const seg = clamp(localP, 0, 1) * N
    const i = Math.min(Math.floor(seg), N - 1)
    const f = seg - i
    // dwell on a planet for the first solarDwellFrac of the segment, then ease to the next
    const t = smoothstep(f, ACTS.solarDwellFrac, 1.0)

    stopPos(i, v.a)
    stopPos(i + 1, v.b)

    // Slerp the look-target around the sun instead of lerping through it.
    // When two planets are on opposite sides the linear path cuts through the
    // sun center, causing the camera to briefly stare into the star. We arc
    // the direction vector around the sun so the transition sweeps off to the
    // side rather than punching through.
    const dA = v.a.distanceTo(sunPosition)
    const dB = v.b.distanceTo(sunPosition)
    if (dA > 1 && dB > 1) {
      v.outward.copy(v.a).sub(sunPosition).normalize() // dirA (temp)
      v.tangent.copy(v.b).sub(sunPosition).normalize() // dirB (temp)
      let dot = clamp(v.outward.dot(v.tangent), -1, 1)
      // For near-antiparallel vectors (planets nearly opposite), lift both
      // slightly above the orbital plane so the slerp arc goes up-and-over
      // rather than remaining ambiguous in-plane.
      if (dot < -0.9) {
        v.outward.y += 0.3; v.outward.normalize()
        v.tangent.y  += 0.3; v.tangent.normalize()
        dot = clamp(v.outward.dot(v.tangent), -1, 1)
      }
      const θ = Math.acos(dot)
      const sinθ = Math.sin(θ)
      const wA = sinθ > 1e-6 ? Math.sin((1 - t) * θ) / sinθ : 1 - t
      const wB = sinθ > 1e-6 ? Math.sin(t * θ) / sinθ : t
      v.solarLook
        .set(
          v.outward.x * wA + v.tangent.x * wB,
          v.outward.y * wA + v.tangent.y * wB,
          v.outward.z * wA + v.tangent.z * wB,
        )
        .multiplyScalar(lerp(dA, dB, t))
        .add(sunPosition)
    } else {
      // One stop is the sun itself — linear lerp is fine.
      v.solarLook.lerpVectors(v.a, v.b, t)
    }

    // When two planets are nearly antipodal (dot < -0.9) the Y-lift applied to
    // v.outward/v.tangent means the slerp endpoints no longer equal v.a and v.b.
    // Clamp to exact planet positions at the dwell boundaries so the camera
    // always centres the focused planet (t≈0 → stop i, t≈1 → stop i+1).
    if (t < 1e-6) v.solarLook.copy(v.a)
    else if (t > 1 - 1e-6) v.solarLook.copy(v.b)

    const r = lerp(stopRadius(i), stopRadius(i + 1), t)

    // outward = sun → planet direction. The camera must sit on the SUN side of
    // the planet (i.e. offset toward -outward) so it looks at the lit hemisphere,
    // not the dark night side.
    v.outward.copy(v.solarLook).sub(sunPosition)
    // When looking directly at the Sun (distance ≈ 0), choose a fallback
    // direction that keeps the camera on the SAME z-side as the hero pose
    // (z > 0). The original (0.4, 0.3, 1) put the camera at z ≈ -22, requiring
    // a ~172° rotation from the hero; (-0.857, 0, -0.515) places it at
    // (0, 11.7, 27.4), only ~21° from the hero — a smooth cinematic zoom-in.
    if (v.outward.lengthSq() < 1e-4) v.outward.set(-0.857, 0, -0.515)
    v.outward.normalize()
    v.tangent.crossVectors(v.up, v.outward).normalize()

    const dist = r * FLIGHT.focusBack + FLIGHT.focusBase
    v.offset
      .set(0, 0, 0)
      .addScaledVector(v.tangent, FLIGHT.focusSide)
      .addScaledVector(v.outward, -FLIGHT.focusSunward) // toward the sun
      .addScaledVector(v.up, FLIGHT.focusUp)
      .normalize()
      .multiplyScalar(dist)

    // Pointer orbits the view around the focused planet.
    v.offset.applyAxisAngle(v.up, pointer.ex * FLIGHT.orbitAzimuth)
    v.offset.applyAxisAngle(v.tangent, -pointer.ey * FLIGHT.orbitElevation)

    v.solarPos.copy(v.solarLook).add(v.offset)
    return f < 0.5 ? i : i + 1
  }

  /** Galaxy act: orbit the galaxy centre, sweeping azimuth as radius/height ease. */
  const computeGalaxy = (gp: number) => {
    const g = FLIGHT.galaxy
    const p = clamp(gp, 0, 1)

    let az = g.startAngle + p * g.sweep
    let r = lerp(g.radius[0], g.radius[1], p) - Math.sin(p * Math.PI) * g.radiusDip
    let h = lerp(g.height[0], g.height[1], p)

    // Pointer nudges the orbit for a touch of agency.
    az += pointer.ex * g.orbitAzimuth
    h += -pointer.ey * g.orbitHeight

    v.galaxyPos.set(
      v.galaxyCenter.x + Math.sin(az) * r,
      v.galaxyCenter.y + h,
      v.galaxyCenter.z + Math.cos(az) * r,
    )
    v.galaxyLook.copy(v.galaxyCenter)
  }

  /** Singularity act: orbit the black hole, starting high (face-on disk) and descending. */
  const computeSingularity = (sp: number) => {
    const g = FLIGHT.singularity
    const p = clamp(sp, 0, 1)

    let az = g.startAngle + p * g.sweep
    let r = lerp(g.radius[0], g.radius[1], p)
    let h = lerp(g.height[0], g.height[1], p)

    az += pointer.ex * g.orbitAzimuth
    h += -pointer.ey * g.orbitHeight

    v.singularityPos.set(
      v.singularityCenter.x + Math.sin(az) * r,
      v.singularityCenter.y + h,
      v.singularityCenter.z + Math.cos(az) * r,
    )
    v.singularityLook.copy(v.singularityCenter)
  }

  /** Vistas act: a horizontal pan across the gallery corridor. */
  const computeVistas = (vp: number) => {
    const g = FLIGHT.vistas
    const p = clamp(vp, 0, 1)
    const x = lerp(-g.panX, g.panX, p)
    const z = g.camZ + Math.sin(p * Math.PI) * g.dolly
    v.vistasPos.set(x + pointer.ex * 8, g.camY - pointer.ey * 5, z)
    v.vistasLook.set(x * g.lookLead, 2, g.lookZ)
  }

  const computeOuter = (op: number) => {
    const poses = FLIGHT.outer
    const n = poses.length
    const seg = clamp(op, 0, 1) * (n - 1)
    const i = Math.min(Math.floor(seg), n - 2)
    const f = seg - i
    v.a.set(...poses[i].pos)
    v.b.set(...poses[i + 1].pos)
    v.outerPos.lerpVectors(v.a, v.b, f)
    v.a.set(...poses[i].look)
    v.b.set(...poses[i + 1].look)
    v.outerLook.lerpVectors(v.a, v.b, f)
  }

  useFrame((state) => {
    easePointer(CAMERA.pointerEase)

    const s = reducedMotion ? 0 : clamp(flight.scroll, 0, 1)
    const t = state.clock.elapsedTime

    // Act weights (crossfade): hero → solar → galaxy → singularity → vistas → outer/return.
    const enterSolar       = smoothstep(s, ACTS.heroEnd,          ACTS.solarStart)
    // Pure-Neptune zone: solarEnd (0.44) → midpoint (0.48) = 60 vh of dwell before
    // the galaxy crossfade begins. Blend ends at galaxyStart (0.52) so the galaxy
    // text and the galaxy camera arrive together, matching the DOM section timing.
    const enterGalaxy      = smoothstep(s, (ACTS.solarEnd + ACTS.galaxyStart) * 0.5, ACTS.galaxyStart)
    const enterSingularity = smoothstep(s, ACTS.galaxyEnd,        ACTS.singularityStart)
    const enterVistas      = smoothstep(s, ACTS.singularityEnd,   ACTS.vistasStart)
    const enterOuter       = smoothstep(s, ACTS.vistasEnd,        ACTS.outerStart)
    const wHero        = 1 - enterSolar
    const wSolar       = enterSolar       * (1 - enterGalaxy)
    const wGalaxy      = enterGalaxy      * (1 - enterSingularity)
    const wSingularity = enterSingularity * (1 - enterVistas)
    const wVistas      = enterVistas      * (1 - enterOuter)
    const wOuter       = enterOuter
    const total = wHero + wSolar + wGalaxy + wSingularity + wVistas + wOuter || 1

    // HERO pose (+ idle breathing — cut under reduced motion).
    v.heroPos.set(...FLIGHT.hero.pos)
    if (!reducedMotion) v.heroPos.y += Math.sin(t * CAMERA.idleSpeed) * CAMERA.idleAmplitude
    v.heroLook.set(...FLIGHT.hero.look)

    // SOLAR pose.
    const localP = (s - ACTS.solarStart) / (ACTS.solarEnd - ACTS.solarStart)
    const activeStop = computeSolar(localP)

    // GALAXY pose.
    const gp = (s - ACTS.galaxyStart) / (ACTS.galaxyEnd - ACTS.galaxyStart)
    computeGalaxy(gp)

    // SINGULARITY pose.
    const sp = (s - ACTS.singularityStart) / (ACTS.singularityEnd - ACTS.singularityStart)
    computeSingularity(sp)

    // VISTAS pose.
    const vp = (s - ACTS.vistasStart) / (ACTS.vistasEnd - ACTS.vistasStart)
    computeVistas(vp)

    // OUTER pose.
    const op = (s - ACTS.outerStart) / (1 - ACTS.outerStart)
    computeOuter(op)

    // Blend.
    v.finalPos
      .set(0, 0, 0)
      .addScaledVector(v.heroPos, wHero)
      .addScaledVector(v.solarPos, wSolar)
      .addScaledVector(v.galaxyPos, wGalaxy)
      .addScaledVector(v.singularityPos, wSingularity)
      .addScaledVector(v.vistasPos, wVistas)
      .addScaledVector(v.outerPos, wOuter)
      .multiplyScalar(1 / total)
    v.finalLook
      .set(0, 0, 0)
      .addScaledVector(v.heroLook, wHero)
      .addScaledVector(v.solarLook, wSolar)
      .addScaledVector(v.galaxyLook, wGalaxy)
      .addScaledVector(v.singularityLook, wSingularity)
      .addScaledVector(v.vistasLook, wVistas)
      .addScaledVector(v.outerLook, wOuter)
      .multiplyScalar(1 / total)

    // Ignite push, plus a light global pointer sway outside the solar act
    // (inside solar the pointer already orbits the planet).
    v.finalPos.z += flight.introZ
    const swayW = (wHero + wOuter) / total
    v.finalPos.x += pointer.ex * CAMERA.pointerSway * swayW
    v.finalPos.y += -pointer.ey * CAMERA.pointerSway * swayW

    camera.position.copy(v.finalPos)
    camera.lookAt(v.finalLook)

    // Drive the DOM info-cards (only while the solar act is dominant).
    solarStore.setActive(wSolar / total > 0.5 ? activeStop : -1)
  })

  return null
}
