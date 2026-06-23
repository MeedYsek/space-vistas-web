import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { STARFIELD, PALETTE, MAX_PIXEL_RATIO } from '../config/scene'
import { starfieldVertex, starfieldFragment } from './shaders/starfield.glsl'
import { flight } from '../lib/flight'

interface StarfieldProps {
  count?: number
  heroCount?: number
  radius?: number
}

/**
 * 26k (desktop) instanced stars rendered as GL points with a custom shader.
 * Colour, size, twinkle phase + speed and "hero" flag vary per star. The whole
 * field drifts as one very slow rotation; twinkle happens in the shader.
 */
export default function Starfield({
  count = STARFIELD.count,
  heroCount = STARFIELD.heroCount,
  radius = STARFIELD.radius,
}: StarfieldProps) {
  const groupRef = useRef<THREE.Group>(null)
  const matRef = useRef<THREE.ShaderMaterial>(null)

  // Build all per-star attribute buffers once.
  const { geometry, uniforms } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const phases = new Float32Array(count)
    const twinkles = new Float32Array(count)
    const heroes = new Float32Array(count)

    const cWarm = new THREE.Color(PALETTE.starWarm)
    const cCool = new THREE.Color(PALETTE.starCool)
    const cWhite = new THREE.Color(PALETTE.starWhite)
    const tmp = new THREE.Color()

    const [twMin, twMax] = STARFIELD.twinkleSpeed

    for (let i = 0; i < count; i++) {
      // Scatter through a spherical shell (denser toward the outer radius).
      const dir = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
      ).normalize()
      const r = radius * (0.35 + Math.random() * 0.65)
      positions[i * 3 + 0] = dir.x * r
      positions[i * 3 + 1] = dir.y * r
      positions[i * 3 + 2] = dir.z * r

      // Colour: mostly white/cool, a warm minority.
      const roll = Math.random()
      if (roll < 0.12) tmp.copy(cWarm)
      else if (roll < 0.5) tmp.copy(cCool)
      else tmp.copy(cWhite)
      // Slight per-star brightness variation.
      const b = 0.65 + Math.random() * 0.35
      colors[i * 3 + 0] = tmp.r * b
      colors[i * 3 + 1] = tmp.g * b
      colors[i * 3 + 2] = tmp.b * b

      sizes[i] = 0.6 + Math.pow(Math.random(), 2.5) * 2.4 // mostly small, few big
      phases[i] = Math.random() * Math.PI * 2
      twinkles[i] = twMin + Math.random() * (twMax - twMin)
      heroes[i] = 0
    }

    // Promote a handful of bright "hero" stars near the front hemisphere.
    for (let h = 0; h < heroCount; h++) {
      const i = Math.floor(Math.random() * count)
      heroes[i] = 1
      sizes[i] = 2.6 + Math.random() * 1.6
      colors[i * 3 + 0] = 1
      colors[i * 3 + 1] = 1
      colors[i * 3 + 2] = 1
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
    geo.setAttribute('aTwinkle', new THREE.BufferAttribute(twinkles, 1))
    geo.setAttribute('aHero', new THREE.BufferAttribute(heroes, 1))

    const u = {
      uTime: { value: 0 },
      uSize: { value: STARFIELD.size },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO) },
      uWarp: { value: 0 },
    }

    return { geometry: geo, uniforms: u }
  }, [count, heroCount, radius])

  // Dispose geometry on unmount to avoid GPU leaks.
  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame((_, delta) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value += delta
      matRef.current.uniforms.uWarp.value = flight.warp
    }
    if (groupRef.current) groupRef.current.rotation.y += STARFIELD.driftSpeed * delta
  })

  return (
    <group ref={groupRef}>
      <points geometry={geometry} frustumCulled={false}>
        <shaderMaterial
          ref={matRef}
          vertexShader={starfieldVertex}
          fragmentShader={starfieldFragment}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  )
}
