import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { NEBULA, PALETTE } from '../config/scene'
import { nebulaVertex, nebulaFragment } from './shaders/nebula.glsl'

interface PlaneConfig {
  position: [number, number, number]
  rotation: number
  scale: number
  seed: number
  colors: [THREE.Color, THREE.Color, THREE.Color]
  speed: number
}

const VIOLET = new THREE.Color(PALETTE.nebulaViolet)
const MAGENTA = new THREE.Color(PALETTE.nebulaMagenta)
const TEAL = new THREE.Color(PALETTE.nebulaTeal)
const INDIGO = new THREE.Color(PALETTE.indigoDeep)

/** One additive cloud plane. */
function NebulaPlane({ cfg }: { cfg: PlaneConfig }) {
  const matRef = useRef<THREE.ShaderMaterial>(null)

  const uniforms = useMemo(
    () => ({
      uTime: { value: Math.random() * 100 },
      uColorA: { value: cfg.colors[0] },
      uColorB: { value: cfg.colors[1] },
      uColorC: { value: cfg.colors[2] },
      uIntensity: { value: NEBULA.intensity },
      uSpeed: { value: cfg.speed },
      uSeed: { value: cfg.seed },
      uOctaves: { value: NEBULA.octaves },
    }),
    [cfg],
  )

  useFrame((_, delta) => {
    if (matRef.current) matRef.current.uniforms.uTime.value += delta
  })

  return (
    <mesh position={cfg.position} rotation={[0, 0, cfg.rotation]} scale={cfg.scale}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={nebulaVertex}
        fragmentShader={nebulaFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

/**
 * A scattering of large, soft, slowly-drifting nebula planes in the deep field.
 * They sit behind the parallax dust and far enough back to read as volume.
 */
export default function Nebula({ layers = NEBULA.layers }: { layers?: number }) {
  const planes = useMemo<PlaneConfig[]>(() => {
    const palettes: [THREE.Color, THREE.Color, THREE.Color][] = [
      [INDIGO, VIOLET, MAGENTA],
      [INDIGO, MAGENTA, TEAL],
      [VIOLET, TEAL, MAGENTA],
    ]
    const out: PlaneConfig[] = []
    for (let i = 0; i < layers; i++) {
      const z = -180 - i * 70 - Math.random() * 60
      out.push({
        position: [
          (Math.random() * 2 - 1) * 220,
          (Math.random() * 2 - 1) * 130,
          z,
        ],
        rotation: Math.random() * Math.PI,
        scale: 320 + Math.random() * 260,
        seed: Math.random() * 10,
        colors: palettes[i % palettes.length],
        speed: NEBULA.speed * (0.6 + Math.random() * 0.8),
      })
    }
    return out
  }, [layers])

  return (
    <group>
      {planes.map((cfg, i) => (
        <NebulaPlane key={i} cfg={cfg} />
      ))}
    </group>
  )
}
