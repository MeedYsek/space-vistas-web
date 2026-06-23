import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import { SINGULARITY, ACTS } from '../../config/scene'
import { flight } from '../../lib/flight'
import { blackholeVertex, makeBlackholeFragment } from '../shaders/singularity.glsl'

interface SingularityProps {
  /** Low-power devices integrate fewer photon steps. */
  lowPower?: boolean
}

/**
 * The Singularity showpiece: a gravitationally-lensed black hole.
 *
 * A single camera-facing billboard ray-marches photon paths through curved
 * space (see singularity.glsl), so the accretion disk genuinely lenses up and
 * over the event horizon, a thin photon ring rims the shadow, and the disk
 * shows Doppler beaming — the iconic "Gargantua" look from one shader pass.
 *
 * The whole group only renders while the camera is actually flying through the
 * singularity act (the ray-march is the scene's most expensive pass).
 */
export default function Singularity({ lowPower = false }: SingularityProps) {
  const S = SINGULARITY
  const groupRef = useRef<THREE.Group>(null)
  const diskRef = useRef<THREE.ShaderMaterial>(null)

  // Billboard sized to cover the disk plus its lensed halo with margin.
  const plate = S.radius * S.diskOuterMul * 2.8

  const fragment = useMemo(() => makeBlackholeFragment(lowPower ? 72 : 150), [lowPower])

  const bhUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uCenter: { value: new THREE.Vector3(...S.position) },
      uRs: { value: S.radius },
      uDiskInner: { value: S.diskInnerMul },
      uDiskOuter: { value: S.diskOuterMul },
      uColInner: { value: new THREE.Color('#eaf3ff') }, // hot blue-white
      uColMid: { value: new THREE.Color('#ff9a3c') }, // amber (site glowAmber-ish)
      uColOuter: { value: new THREE.Color('#b5179e') }, // deep magenta (palette)
      uBrightness: { value: 0.8 },
    }),
    [S.position, S.radius, S.diskInnerMul, S.diskOuterMul],
  )

  useFrame((_, delta) => {
    // Only spend the ray-march while the camera is in (or crossfading into) the
    // singularity act — outside that window the hole is off-screen.
    const s = flight.scroll
    const visible = s > ACTS.galaxyEnd - 0.06 && s < ACTS.vistasStart + 0.06
    if (groupRef.current) groupRef.current.visible = visible
    if (!visible) return

    if (diskRef.current) diskRef.current.uniforms.uTime.value += Math.min(delta, 0.05)
  })

  return (
    <group ref={groupRef}>
      {/* Lensed black hole — billboard ray-marcher. Positioned at the BH centre
          and kept facing the camera; the shader reconstructs true world rays. */}
      <Billboard position={S.position}>
        <mesh>
          <planeGeometry args={[plate, plate]} />
          <shaderMaterial
            ref={diskRef}
            vertexShader={blackholeVertex}
            fragmentShader={fragment}
            uniforms={bhUniforms}
            transparent
            depthWrite={false}
            blending={THREE.NormalBlending}
          />
        </mesh>
      </Billboard>
    </group>
  )
}
