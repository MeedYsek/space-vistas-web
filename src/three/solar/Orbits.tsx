import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { PLANETS } from '../../config/planets'

/**
 * Faint elliptical orbit guides — one inclined ring per planet. Built as real
 * THREE.LineLoop objects and dropped in via <primitive> (avoids the <line>
 * JSX/SVG ambiguity). Subtle + additive so they structure the system without
 * stealing focus from the planets.
 */
export default function Orbits() {
  const lines = useMemo(() => {
    const SEG = 160
    return PLANETS.map((p) => {
      const positions = new Float32Array(SEG * 3)
      for (let i = 0; i < SEG; i++) {
        const a = (i / SEG) * Math.PI * 2
        const flatZ = Math.sin(a) * p.orbit
        positions[i * 3 + 0] = Math.cos(a) * p.orbit
        positions[i * 3 + 1] = flatZ * Math.sin(p.inclination)
        positions[i * 3 + 2] = flatZ * Math.cos(p.inclination)
      }
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      const mat = new THREE.LineBasicMaterial({
        color: new THREE.Color('#5a6bbf'),
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
      return new THREE.LineLoop(geo, mat)
    })
  }, [])

  useEffect(
    () => () =>
      lines.forEach((l) => {
        l.geometry.dispose()
        ;(l.material as THREE.Material).dispose()
      }),
    [lines],
  )

  return (
    <group>
      {lines.map((l, i) => (
        <primitive key={i} object={l} />
      ))}
    </group>
  )
}
