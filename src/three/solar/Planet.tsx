import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import type { PlanetConfig } from '../../config/planets'
import { PLANET_LIGHT } from '../../config/planets'
import { planetPositions } from './planetRegistry'
import { DEBUG } from '../../lib/debug'
import { glowVertex, glowFragment } from '../shaders/sun.glsl'
import {
  planetVertex,
  planetFragment,
  cloudsFragment,
  atmosphereFragment,
  ringVertex,
  ringFragment,
} from '../shaders/planet.glsl'

interface PlanetProps {
  config: PlanetConfig
  index: number
}

/**
 * A single planet: orbits the sun on a (slightly inclined) ellipse, spins on a
 * tilted axis, and renders up to four shells — surface, atmosphere rim, cloud
 * layer and rings. The live sun direction is fed to every shader each frame so
 * the terminator and rim glow stay correct as it orbits, and the planet's world
 * position is published to the registry for the camera to follow.
 */
export default function Planet({ config, index }: PlanetProps) {
  const orbitRef = useRef<THREE.Group>(null)
  const spinRef = useRef<THREE.Group>(null)
  const surfMat = useRef<THREE.ShaderMaterial>(null)
  const cloudMat = useRef<THREE.ShaderMaterial>(null)
  const atmoMat = useRef<THREE.ShaderMaterial>(null)
  const ringMat = useRef<THREE.ShaderMaterial>(null)

  const sunDir = useRef(new THREE.Vector3(1, 0, 0))

  const surfaceUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSunDir: { value: sunDir.current },
      uColorA: { value: new THREE.Color(config.colorA) },
      uColorB: { value: new THREE.Color(config.colorB) },
      uFreq: { value: config.surfaceFreq },
      uBands: { value: config.bands },
      uSeed: { value: index * 13.7 },
      uOcean: { value: config.ocean },
      uOceanColor: { value: new THREE.Color(config.oceanColor) },
      uOceanLevel: { value: config.oceanLevel },
      uNightColor: { value: new THREE.Color(config.nightColor) },
      uNight: { value: config.night },
      uMap: { value: null as THREE.Texture | null },
      uUseMap: { value: 0.0 },
      // Grounded-realism lighting/relief.
      uRelief: { value: config.relief ?? 0 },
      uTermSoft: { value: config.terminatorSoftness ?? 1 },
      uSunColor: { value: new THREE.Color(PLANET_LIGHT.sunColor) },
      uNightLift: { value: PLANET_LIGHT.nightAmbient },
      uStarlight: { value: PLANET_LIGHT.starlight },
      uStarTint: { value: new THREE.Color(PLANET_LIGHT.starTint) },
      uScatterColor: {
        value: new THREE.Color(config.scatter?.color ?? config.atmosphere?.color ?? '#ffffff'),
      },
      uScatterStrength: { value: config.scatter?.strength ?? 0 },
      uHaze: { value: config.surfaceHaze ?? 0 },
      uHazeColor: { value: new THREE.Color(config.hazeColor ?? '#ffffff') },
      uOceanGlint: { value: config.oceanGlint ?? 0 },
      uAuroraColor: { value: new THREE.Color(config.aurora?.color ?? '#000000') },
      uAuroraStrength: { value: config.aurora?.strength ?? 0 },
      uBandFlow: { value: config.bandFlow ?? 0 },
      uGRSPos: { value: new THREE.Vector2(...(config.redSpot?.pos ?? [0, 0])) },
      uGRSSize: { value: new THREE.Vector2(...(config.redSpot?.size ?? [1, 1])) },
      uGRSStrength: { value: config.redSpot?.strength ?? 0 },
      uGRSSwirl: { value: config.redSpot?.swirl ?? 0 },
      uGRSSpin: { value: config.redSpot?.spin ?? 0 },
      // Ring shadow cast onto this planet (Saturn/Uranus). uRingCenter tracks the
      // orbiting planet each frame; the ring normal is the (fixed) tilted axis.
      uRingShadow: { value: config.ring ? 1 : 0 },
      uRingInner: { value: (config.ring?.inner ?? 1) * config.radius },
      uRingOuter: { value: (config.ring?.outer ?? 1) * config.radius },
      uRingNormal: {
        value: new THREE.Vector3(-Math.sin(config.tilt), Math.cos(config.tilt), 0),
      },
      uRingCenter: { value: new THREE.Vector3() },
      uSaturation: { value: config.saturation ?? 1 },
    }),
    [config, index],
  )

  // Load the planet texture asynchronously; updates the live uniform imperatively
  // so there's no flash — the planet shows procedurally until the texture arrives.
  useEffect(() => {
    if (!config.map) return
    const loader = new THREE.TextureLoader()
    loader.load(
      `/textures/planets/${config.map}`,
      (tex) => {
        if (!surfMat.current) return
        surfMat.current.uniforms.uMap.value = tex
        surfMat.current.uniforms.uUseMap.value = 1.0
      },
    )
  }, [config.map])

  // Forward-scattering atmospheres (Venus today) use a dedicated shell; the rest
  // keep the shared sun glow. Swap both shader + uniforms together.
  const useForwardAtmo = config.atmosphere?.forward != null

  const atmoUniforms = useMemo(() => {
    if (!config.atmosphere) return null
    const base = {
      uColor: { value: new THREE.Color(config.atmosphere.color) },
      uPower: { value: config.atmosphere.power },
      uIntensity: { value: config.atmosphere.intensity },
      uSunDir: { value: sunDir.current },
    }
    return config.atmosphere.forward != null
      ? { ...base, uForward: { value: config.atmosphere.forward } }
      : { ...base, uLitMix: { value: 1 } }
  }, [config])

  const cloudUniforms = useMemo(() => {
    if (!config.clouds) return null
    return {
      uTime: { value: 0 },
      uSunDir: { value: sunDir.current },
      uOpacity: { value: config.clouds.opacity },
      uSpeed: { value: config.clouds.speed },
      uSeed: { value: index * 7.3 },
      uFreq: { value: config.surfaceFreq * 1.3 },
      uColor: { value: new THREE.Color(config.clouds.color ?? '#ffffff') },
      uCoverage: { value: config.clouds.coverage ?? 0.25 },
    }
  }, [config, index])

  const ringUniforms = useMemo(() => {
    if (!config.ring) return null
    return {
      uInner: { value: config.ring.inner * config.radius },
      uOuter: { value: config.ring.outer * config.radius },
      uColorInner: { value: new THREE.Color(config.ring.colorInner ?? config.ring.color) },
      uColorOuter: { value: new THREE.Color(config.ring.colorOuter ?? config.ring.color) },
      uOpacity: { value: config.ring.opacity },
      uSunDir: { value: sunDir.current },
      uPlanetCenter: { value: new THREE.Vector3() }, // updated each frame
      uPlanetRadius: { value: config.radius },
      uForwardScatter: { value: config.ring.forwardScatter ?? 0 },
    }
  }, [config])

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const a = config.phase + t * config.orbitSpeed
    const x = Math.cos(a) * config.orbit
    const zFlat = Math.sin(a) * config.orbit

    if (orbitRef.current) {
      orbitRef.current.position.set(
        x,
        zFlat * Math.sin(config.inclination),
        zFlat * Math.cos(config.inclination),
      )
      // Publish world position + recompute sun direction (sun is at origin).
      planetPositions[index].copy(orbitRef.current.position)
      sunDir.current.copy(orbitRef.current.position).negate().normalize()
      // Ring shadow (surface) + planet shadow (ring) both need the live planet
      // world centre.
      surfMat.current?.uniforms.uRingCenter.value.copy(orbitRef.current.position)
      ringMat.current?.uniforms.uPlanetCenter.value.copy(orbitRef.current.position)
    }

    if (spinRef.current) spinRef.current.rotation.y += config.spin * delta
    if (surfMat.current) surfMat.current.uniforms.uTime.value += delta
    if (cloudMat.current) cloudMat.current.uniforms.uTime.value += delta
    // surface/atmosphere/ring uniforms share the same sunDir Vector3 object
    // (mutated above), so the terminator + rim glow update with no reassignment.
  })

  return (
    <group ref={orbitRef}>
      {/* Atmosphere rim (symmetric — no need to tilt/spin). Explicit renderOrder
          on every transparent shell: they share the planet's centre, so without
          it their camera-distance sort keys tie and the draw order flips with the
          camera angle — a flicker between the additive/normal-blended layers. */}
      {atmoUniforms && !DEBUG.noAtmo && (
        <mesh scale={config.radius * 1.06} renderOrder={1}>
          <sphereGeometry args={[1, 48, 48]} />
          <shaderMaterial
            ref={atmoMat}
            vertexShader={glowVertex}
            fragmentShader={useForwardAtmo ? atmosphereFragment : glowFragment}
            uniforms={atmoUniforms}
            transparent
            depthWrite={false}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}

      {/* Axial tilt group. */}
      <group rotation={[0, 0, config.tilt]}>
        <group ref={spinRef}>
          {/* Surface */}
          <mesh>
            <sphereGeometry args={[config.radius, 64, 64]} />
            <shaderMaterial
              ref={surfMat}
              vertexShader={planetVertex}
              fragmentShader={planetFragment}
              uniforms={surfaceUniforms}
            />
          </mesh>

          {/* Clouds */}
          {cloudUniforms && !DEBUG.noClouds && (
            <mesh scale={1.02} renderOrder={2}>
              <sphereGeometry args={[config.radius, 48, 48]} />
              <shaderMaterial
                ref={cloudMat}
                vertexShader={planetVertex}
                fragmentShader={cloudsFragment}
                uniforms={cloudUniforms}
                transparent
                depthWrite={false}
                blending={THREE.NormalBlending}
              />
            </mesh>
          )}
        </group>

        {/* Rings (in the equatorial plane, tilted with the axis). */}
        {ringUniforms && config.ring && !DEBUG.noRings && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
            <ringGeometry
              args={[config.ring.inner * config.radius, config.ring.outer * config.radius, 128]}
            />
            <shaderMaterial
              ref={ringMat}
              vertexShader={ringVertex}
              fragmentShader={ringFragment}
              uniforms={ringUniforms}
              transparent
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}
      </group>
    </group>
  )
}
