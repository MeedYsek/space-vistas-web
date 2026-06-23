import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import { SUN } from '../../config/planets'
import {
  sunVertex,
  sunFragment,
  glowVertex,
  glowFragment,
  haloVertex,
  haloFragment,
} from '../shaders/sun.glsl'

/**
 * The sun: a plasma-shaded sphere, an additive corona shell, and a broad
 * camera-facing halo. Bloom (in PostFX) turns all of this into the lens flare.
 * Sits at the system origin (0,0,0).
 */
export default function Sun() {
  const surfRef = useRef<THREE.ShaderMaterial>(null)

  const surfaceUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColorDeep: { value: new THREE.Color(SUN.colorDeep) },
      uColorHot: { value: new THREE.Color(SUN.colorHot) },
      uBrightness: { value: SUN.brightness },
    }),
    [],
  )

  const coronaUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(SUN.colorHot) },
      uPower: { value: 2.0 },
      uIntensity: { value: 1.1 },
      uSunDir: { value: new THREE.Vector3(0, 0, 1) },
      uLitMix: { value: 0 },
    }),
    [],
  )

  const haloUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color('#ffb15a') },
      uIntensity: { value: 0.6 },
    }),
    [],
  )

  useFrame((_, delta) => {
    if (surfRef.current) surfRef.current.uniforms.uTime.value += delta
  })

  return (
    <group>
      {/* Plasma surface */}
      <mesh>
        <sphereGeometry args={[SUN.radius, 64, 64]} />
        <shaderMaterial
          ref={surfRef}
          vertexShader={sunVertex}
          fragmentShader={sunFragment}
          uniforms={surfaceUniforms}
        />
      </mesh>

      {/* Corona shell */}
      <mesh>
        <sphereGeometry args={[SUN.radius * 1.35, 32, 32]} />
        <shaderMaterial
          vertexShader={glowVertex}
          fragmentShader={glowFragment}
          uniforms={coronaUniforms}
          transparent
          depthWrite={false}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Broad soft halo */}
      <Billboard>
        <mesh>
          <planeGeometry args={[SUN.radius * 5.5, SUN.radius * 5.5]} />
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
    </group>
  )
}
