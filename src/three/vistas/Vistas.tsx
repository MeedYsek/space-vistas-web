import { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { VISTAS, ACTS } from '../../config/scene'
import { VISTAS_CONTENT } from '../../config/vistas'
import { vistaVertex, vistaFragment } from '../shaders/vistas.glsl'
import { flight } from '../../lib/flight'

const { clamp, lerp, smoothstep } = THREE.MathUtils

interface PlaneData {
  x: number
  y: number
  z: number
  rotY: number
  colorC: THREE.Color
  uniforms: {
    uTime: { value: number }
    uReveal: { value: number }
    uFade: { value: number }
    uSeed: { value: number }
    uKind: { value: number }
    uOctaves: { value: number }
    uColorA: { value: THREE.Color }
    uColorB: { value: THREE.Color }
    uColorC: { value: THREE.Color }
    uAspect: { value: number }
    uTex: { value: THREE.Texture }
    uUseTexture: { value: number }
    uImgAspect: { value: number }
  }
}

/**
 * The deep-space vistas gallery: a row of large procedural plates the camera
 * pans past during the VISTAS act. Each plate's reveal is driven by how near the
 * camera's pan (its x) is to the plate, and latched so it stays resolved once
 * seen. A faint additive backdrop tints toward whichever vista is centred, for
 * the palette-driven background shift.
 */
export default function Vistas({ lowPower = false }: { lowPower?: boolean }) {
  const camera = useThree((s) => s.camera)
  const matRefs = useRef<(THREE.ShaderMaterial | null)[]>([])
  const reveals = useRef<number[]>(VISTAS_CONTENT.map(() => 0))
  const backdropRef = useRef<THREE.ShaderMaterial>(null)
  const tint = useRef(new THREE.Color('#0a0a1a'))

  const blankTex = useMemo(() => {
    const t = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, THREE.RGBAFormat)
    t.needsUpdate = true
    return t
  }, [])

  const planes = useMemo<PlaneData[]>(() => {
    const n = VISTAS_CONTENT.length
    return VISTAS_CONTENT.map((v, i) => {
      const t = n === 1 ? 0.5 : i / (n - 1)
      return {
        x: lerp(-VISTAS.spreadX, VISTAS.spreadX, t),
        y: Math.sin(i * 1.7) * VISTAS.jitterY,
        z: VISTAS.z + Math.cos(i * 2.3) * VISTAS.jitterZ,
        rotY: Math.sin(i * 0.9) * 0.18,
        colorC: new THREE.Color(v.colors[2]),
        uniforms: {
          uTime: { value: Math.random() * 50 },
          uReveal: { value: 0 },
          uFade: { value: 1 },
          uSeed: { value: i * 4.13 + 1.0 },
          uKind: { value: v.kind },
          uOctaves: { value: lowPower ? 3 : 5 },
          uColorA: { value: new THREE.Color(v.colors[0]) },
          uColorB: { value: new THREE.Color(v.colors[1]) },
          uColorC: { value: new THREE.Color(v.colors[2]) },
          uAspect: { value: VISTAS.planeW / VISTAS.planeH },
          uTex: { value: blankTex },
          uUseTexture: { value: 0 },
          uImgAspect: { value: VISTAS.planeW / VISTAS.planeH },
        },
      }
    })
  }, [lowPower, blankTex])

  // Load real photos for vistas that have a src; swap in after load.
  useEffect(() => {
    const loader = new THREE.TextureLoader()
    VISTAS_CONTENT.forEach((v, i) => {
      if (!v.src) return
      loader.load(`/textures/${v.src}`, (tex) => {
        const m = matRefs.current[i]
        if (!m) return
        m.uniforms.uTex.value = tex
        m.uniforms.uUseTexture.value = 1
        m.uniforms.uImgAspect.value = tex.image.width / tex.image.height
      })
    })
  }, [])

  const backdropUniforms = useMemo(
    () => ({ uColor: { value: new THREE.Color('#0a0a1a') }, uIntensity: { value: 0.22 } }),
    [],
  )

  useFrame((_, delta) => {
    const camX = camera.position.x
    // Fade the whole gallery out as the return act begins so the journey can
    // collapse to a clean point of light.
    const fade = 1 - smoothstep(flight.scroll, ACTS.vistasEnd, ACTS.outerStart + 0.04)
    // Gate reveals to the vistas act only — the galaxy camera arc sweeps through
    // x values that overlap with plate positions, which would ghost-reveal plates early.
    const vistaGate = smoothstep(flight.scroll, ACTS.vistasStart - 0.02, ACTS.vistasStart + 0.02)
    let nearest = -1
    let nearestCloseness = 0

    planes.forEach((p, i) => {
      const dx = Math.abs(camX - p.x)
      const closeness = (1 - smoothstep(VISTAS.revealBand[1], VISTAS.revealBand[0], dx)) * vistaGate
      reveals.current[i] = Math.max(reveals.current[i], closeness) // latch
      const m = matRefs.current[i]
      if (m) {
        m.uniforms.uReveal.value = reveals.current[i]
        m.uniforms.uFade.value = fade
        m.uniforms.uTime.value += delta
      }
      if (closeness > nearestCloseness) {
        nearestCloseness = closeness
        nearest = i
      }
    })

    // Palette-driven backdrop tint toward the centred vista.
    const target = nearest >= 0 ? planes[nearest].colorC : tint.current
    tint.current.lerp(target, clamp(delta * 1.5, 0, 1))
    if (backdropRef.current) {
      backdropRef.current.uniforms.uColor.value.copy(tint.current)
      backdropRef.current.uniforms.uIntensity.value = 0.06 + nearestCloseness * 0.16
    }
  })

  return (
    <group>
      {/* Faint additive backdrop that tints toward the centred vista. */}
      <mesh position={[0, 0, VISTAS.z - 90]}>
        <planeGeometry args={[VISTAS.spreadX * 3.2, 420]} />
        <shaderMaterial
          ref={backdropRef}
          uniforms={backdropUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          vertexShader={`varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`}
          fragmentShader={`precision mediump float; varying vec2 vUv; uniform vec3 uColor; uniform float uIntensity;
            void main(){ float d=length(vUv-0.5); float a=smoothstep(0.7,0.0,d)*uIntensity; gl_FragColor=vec4(uColor,a); }`}
        />
      </mesh>

      {planes.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]} rotation={[0, p.rotY, 0]}>
          <planeGeometry args={[VISTAS.planeW, VISTAS.planeH, 1, 1]} />
          <shaderMaterial
            ref={(r) => (matRefs.current[i] = r)}
            vertexShader={vistaVertex}
            fragmentShader={vistaFragment}
            uniforms={p.uniforms}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}
