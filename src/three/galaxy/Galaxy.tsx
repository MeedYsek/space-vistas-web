import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import { GALAXY, ACTS, MAX_PIXEL_RATIO } from '../../config/scene'
import { flight } from '../../lib/flight'
import { galaxyVertex, galaxyFragment } from '../shaders/galaxy.glsl'
import { haloVertex, haloFragment } from '../shaders/sun.glsl'

interface GalaxyProps {
  count?: number
}

/**
 * The centerpiece: a procedurally-generated spiral galaxy of ~120k additive
 * particles. Positions are baked once into a branching, wound spiral (warm core
 * → cool arms); the shader then spins the core faster than the rim each frame.
 * A soft billboard core-glow gives Bloom a bright nucleus to flare.
 *
 * The whole disk lives in a tilted group at GALAXY.position, so from the hero it
 * reads as a distant smudge (a hint of the destination) and the camera arcs in
 * to fill the frame with it during the galaxy act (see CameraRig).
 */
export default function Galaxy({ count = GALAXY.count }: GalaxyProps) {
  const groupRef = useRef<THREE.Group>(null)
  const matRef = useRef<THREE.ShaderMaterial>(null)

  const { geometry, uniforms } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const radii = new Float32Array(count)

    const R = GALAXY.radius
    const inside = new THREE.Color(GALAXY.insideColor)
    const mid = new THREE.Color(GALAXY.midColor)
    const outside = new THREE.Color(GALAXY.outsideColor)
    const col = new THREE.Color()
    const TAU = Math.PI * 2

    for (let i = 0; i < count; i++) {
      // sqrt → uniform *areal* density. (Uniform-in-radius packs a 1/r spike of
      // additive overlap into the core that Bloom blows out to a white blob; a
      // flatter disk keeps the spiral arms readable.) Each particle belongs to
      // one of N arms, wound by spinAngle.
      const radius = Math.sqrt(Math.random()) * R
      const rf = radius / R
      const branchAngle = ((i % GALAXY.branches) / GALAXY.branches) * TAU
      const spinAngle = rf * GALAXY.armWind * TAU
      const angle = branchAngle + spinAngle

      // Randomness: concentrated along the arm (power curve), growing with radius.
      const scatter = () =>
        Math.pow(Math.random(), GALAXY.randomnessPower) *
        (Math.random() < 0.5 ? 1 : -1) *
        GALAXY.randomness *
        radius
      const rx = scatter()
      const ry = scatter() * GALAXY.thickness // thin disk
      const rz = scatter()

      positions[i * 3 + 0] = Math.cos(angle) * radius + rx
      positions[i * 3 + 1] = ry
      positions[i * 3 + 2] = Math.sin(angle) * radius + rz

      // Two-segment gradient: warm core → magenta mid → cool arms.
      if (rf < 0.5) col.copy(inside).lerp(mid, rf / 0.5)
      else col.copy(mid).lerp(outside, (rf - 0.5) / 0.5)
      // Keep particles mostly below the Bloom threshold so only the densest
      // nucleus pokes through and glows — the rest reads as crisp dust. The
      // innermost particles are *dimmed* (coreDim) to counter the way all arms
      // converge at r→0, which would otherwise pile additive overlap into a
      // blown-out white blob.
      const coreDim = 0.22 + 0.78 * Math.min(1, rf / 0.22)
      const b = (0.26 + (1 - rf) * 0.18) * coreDim * GALAXY.brightness
      colors[i * 3 + 0] = col.r * b
      colors[i * 3 + 1] = col.g * b
      colors[i * 3 + 2] = col.b * b

      sizes[i] = (0.5 + Math.random() * 0.8) * (1 + (1 - rf) * 0.8) // bigger near core
      radii[i] = radius
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    geo.setAttribute('aRadius', new THREE.BufferAttribute(radii, 1))

    const u = {
      uTime: { value: 0 },
      uSize: { value: GALAXY.size },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO) },
      uRotation: { value: GALAXY.rotationSpeed },
      uCoreSpin: { value: GALAXY.coreSpin },
      uRimSpin: { value: GALAXY.rimSpin },
      uRadius: { value: R },
    }

    return { geometry: geo, uniforms: u }
  }, [count])

  const haloUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(GALAXY.insideColor) },
      uIntensity: { value: GALAXY.coreGlow },
    }),
    [],
  )

  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame((_, delta) => {
    const visible = flight.scroll >= ACTS.galaxyStart - 0.05
    if (groupRef.current) groupRef.current.visible = visible
    if (!visible) return
    if (matRef.current) matRef.current.uniforms.uTime.value += delta
  })

  return (
    <group ref={groupRef} position={GALAXY.position} rotation={[GALAXY.tilt, 0, 0]}>
      <points geometry={geometry} frustumCulled={false}>
        <shaderMaterial
          ref={matRef}
          vertexShader={galaxyVertex}
          fragmentShader={galaxyFragment}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Soft galactic-core glow for Bloom to flare (optional — the particle
          density already lights the nucleus, so this stays subtle/off). */}
      {GALAXY.coreGlow > 0 && (
        <Billboard>
          <mesh>
            <planeGeometry args={[GALAXY.radius * 0.45, GALAXY.radius * 0.45]} />
            <shaderMaterial
              vertexShader={haloVertex}
              fragmentShader={haloFragment}
              uniforms={haloUniforms}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </Billboard>
      )}
    </group>
  )
}
