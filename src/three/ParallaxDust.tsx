import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { DUST, MAX_PIXEL_RATIO } from '../config/scene'
import { pointer } from '../lib/pointer'

/** Minimal soft-point shader for dust motes (round, additive, faintly tinted). */
const dustVertex = /* glsl */ `
  uniform float uSize;
  uniform float uPixelRatio;
  attribute float aSize;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uSize * uPixelRatio * (300.0 / -mv.z);
    vAlpha = aSize;
    gl_Position = projectionMatrix * mv;
  }
`
const dustFragment = /* glsl */ `
  precision mediump float;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(uColor, a * a * uOpacity);
  }
`

interface DustLayerProps {
  count: number
  depth: number
  parallax: number
  color: THREE.Color
  spread: number
  opacity: number
}

function DustLayer({ count, depth, parallax, color, spread, opacity }: DustLayerProps) {
  const groupRef = useRef<THREE.Group>(null)
  const matRef = useRef<THREE.ShaderMaterial>(null)

  const { geometry, uniforms } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() * 2 - 1) * spread
      positions[i * 3 + 1] = (Math.random() * 2 - 1) * spread * 0.6
      positions[i * 3 + 2] = depth + (Math.random() * 2 - 1) * 20
      sizes[i] = 0.4 + Math.random() * 1.2
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    const u = {
      uSize: { value: 14 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO) },
      uColor: { value: color },
      uOpacity: { value: opacity },
    }
    return { geometry: geo, uniforms: u }
  }, [count, depth, spread, color, opacity])

  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame((state) => {
    if (!groupRef.current) return
    // Pointer parallax — near layers (high parallax) react most.
    const t = state.clock.elapsedTime
    groupRef.current.position.x = pointer.ex * parallax * 6 + Math.sin(t * 0.05) * parallax
    groupRef.current.position.y = -pointer.ey * parallax * 6
  })

  return (
    <group ref={groupRef}>
      <points geometry={geometry} frustumCulled={false}>
        <shaderMaterial
          ref={matRef}
          vertexShader={dustVertex}
          fragmentShader={dustFragment}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  )
}

/**
 * Three depth layers of drifting dust between the camera and the far stars.
 * Each moves at a different rate with the pointer for a living, parallaxed feel.
 */
export default function ParallaxDust({ counts = DUST.counts }: { counts?: [number, number, number] }) {
  const colors = useMemo(
    () => [new THREE.Color('#9fb4ff'), new THREE.Color('#cdbdf0'), new THREE.Color('#7f8fd8')],
    [],
  )
  return (
    <group>
      {([0, 1, 2] as const).map((i) => (
        <DustLayer
          key={i}
          count={counts[i]}
          depth={DUST.depth[i]}
          parallax={DUST.parallax[i]}
          color={colors[i]}
          spread={120 + i * 90}
          opacity={0.5 - i * 0.12}
        />
      ))}
    </group>
  )
}
