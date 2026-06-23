import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { SINGULARITY } from '../../config/scene'
import { glowVertex, glowFragment } from '../shaders/sun.glsl'
import {
  diskVertex,
  diskFragment,
  lensingVertex,
  lensingFragment,
  jetVertex,
  jetFragment,
} from '../shaders/singularity.glsl'

/**
 * The Singularity showpiece: a stellar-mass black hole with accretion disk,
 * photon ring, gravitational lensing dome, and relativistic jets.
 *
 * Layered geometry (all centred at SINGULARITY.position):
 *  1. Event horizon — opaque black sphere (the shadow).
 *  2. Photon ring   — BackSide sphere at r×1.03, sharp fresnel via glowFragment.
 *  3. Accretion disk — RingGeometry tilted from horizontal with temperature/
 *                      Doppler shader; AdditiveBlending + DoubleSide.
 *  4. Lensing dome  — large BackSide sphere with a direction-bending shader that
 *                      compresses background stars near the shadow and draws a
 *                      faint Einstein arc at the photon-sphere angle.
 *  5. Jets           — two groups of crossed planes (X cross) above/below the
 *                      event horizon; additive blue-white beam fading to the tip.
 */
export default function Singularity() {
  const S = SINGULARITY
  const innerR = S.radius * S.diskInnerMul
  const outerR = S.radius * S.diskOuterMul
  const jetLen = S.jetLength
  const jetW = S.radius * 0.45

  const diskRef = useRef<THREE.ShaderMaterial>(null)
  const lensingRef = useRef<THREE.ShaderMaterial>(null)

  const diskUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uInnerR: { value: innerR },
      uOuterR: { value: outerR },
    }),
    [innerR, outerR],
  )

  // Reuse the existing glow shader for the photon ring — just needs much higher
  // power to produce a razor-thin bright band instead of a wide corona.
  const photonUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color('#ddeeff') },
      uPower: { value: 14.0 },
      uIntensity: { value: 2.8 },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uLitMix: { value: 0 },
    }),
    [],
  )

  const lensingUniforms = useMemo(
    () => ({
      uCenter: { value: new THREE.Vector3(...SINGULARITY.position) },
      uTime: { value: 0 },
    }),
    [],
  )

  // Separate uniform objects per jet direction so uT0 differs (0 = up, 1 = down).
  const jetUpUniforms = useMemo(
    () => ({ uTime: { value: 0 }, uIntensity: { value: 0.52 }, uT0: { value: 0.0 } }),
    [],
  )
  const jetDownUniforms = useMemo(
    () => ({ uTime: { value: 0 }, uIntensity: { value: 0.52 }, uT0: { value: 1.0 } }),
    [],
  )

  useFrame((_, delta) => {
    if (diskRef.current) diskRef.current.uniforms.uTime.value += delta
    if (lensingRef.current) lensingRef.current.uniforms.uTime.value += delta
    jetUpUniforms.uTime.value += delta
    jetDownUniforms.uTime.value = jetUpUniforms.uTime.value
  })

  const jetMat = (uniforms: typeof jetUpUniforms) => ({
    vertexShader: jetVertex,
    fragmentShader: jetFragment,
    uniforms,
    blending: THREE.AdditiveBlending as THREE.Blending,
    depthWrite: false,
    transparent: true,
    side: THREE.DoubleSide as THREE.Side,
  })

  return (
    <group position={S.position}>
      {/* 1. Event horizon */}
      <mesh>
        <sphereGeometry args={[S.radius, 64, 64]} />
        <meshBasicMaterial color="black" />
      </mesh>

      {/* 2. Photon ring */}
      <mesh>
        <sphereGeometry args={[S.radius * 1.03, 64, 32]} />
        <shaderMaterial
          vertexShader={glowVertex}
          fragmentShader={glowFragment}
          uniforms={photonUniforms}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          transparent
        />
      </mesh>

      {/* 3. Accretion disk — RingGeometry rotated from XY plane to horizontal */}
      <mesh rotation={[-Math.PI / 2 + S.diskTilt, 0, 0]}>
        <ringGeometry args={[innerR, outerR, 128, 8]} />
        <shaderMaterial
          ref={diskRef}
          vertexShader={diskVertex}
          fragmentShader={diskFragment}
          uniforms={diskUniforms}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 4. Lensing dome */}
      <mesh>
        <sphereGeometry args={[S.lensingRadius, 64, 32]} />
        <shaderMaterial
          ref={lensingRef}
          vertexShader={lensingVertex}
          fragmentShader={lensingFragment}
          uniforms={lensingUniforms}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          transparent
        />
      </mesh>

      {/* 5a. Upper relativistic jet — two crossed planes */}
      <group position={[0, S.radius + jetLen * 0.5, 0]}>
        <mesh>
          <planeGeometry args={[jetW, jetLen, 1, 16]} />
          <shaderMaterial {...jetMat(jetUpUniforms)} />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[jetW, jetLen, 1, 16]} />
          <shaderMaterial {...jetMat(jetUpUniforms)} />
        </mesh>
      </group>

      {/* 5b. Lower relativistic jet */}
      <group position={[0, -(S.radius + jetLen * 0.5), 0]}>
        <mesh>
          <planeGeometry args={[jetW, jetLen, 1, 16]} />
          <shaderMaterial {...jetMat(jetDownUniforms)} />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[jetW, jetLen, 1, 16]} />
          <shaderMaterial {...jetMat(jetDownUniforms)} />
        </mesh>
      </group>
    </group>
  )
}
