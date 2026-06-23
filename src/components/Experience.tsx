import { useEffect } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import Scene from './Scene'
import { CAMERA, PALETTE, MAX_PIXEL_RATIO, MOBILE } from '../config/scene'
import { bindPointer } from '../lib/pointer'
import type { DeviceProfile } from '../hooks/useDeviceProfile'

interface ExperienceProps {
  profile: DeviceProfile
  reducedMotion: boolean
  ignited: boolean
}

/**
 * The single, persistent full-viewport <Canvas>. It mounts once and lives
 * behind all DOM content for the entire experience — never remounted per
 * section. Pointer events are disabled on the canvas (see index.css) so the
 * semantic DOM overlay stays fully interactive.
 */
export default function Experience({ profile, reducedMotion, ignited }: ExperienceProps) {
  // Attach the global pointer/gyro listeners for the lifetime of the canvas.
  useEffect(() => bindPointer(), [])

  const maxDpr = profile.isMobile ? MOBILE.maxPixelRatio : MAX_PIXEL_RATIO

  return (
    <Canvas
      className="experience-canvas"
      // R3F sets inline styles (position:relative; width/height:100%) on its
      // container div, which override anything from a stylesheet class. So the
      // persistent full-viewport positioning MUST be passed via `style` (R3F
      // merges it *after* its defaults) — otherwise the canvas collapses into
      // normal document flow and scrolls off the top of the page.
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
      }}
      dpr={[1, maxDpr]}
      gl={{
        antialias: !profile.isMobile,
        powerPreference: 'high-performance',
        alpha: false,
        stencil: false,
        depth: true,
      }}
      camera={{ position: CAMERA.start, fov: CAMERA.fov, near: 0.1, far: 2000 }}
      onCreated={({ gl, scene }) => {
        gl.setClearColor(new THREE.Color(PALETTE.void), 1)
        scene.background = new THREE.Color(PALETTE.void)
        // Slight fog deepens the void and hides the far cull plane.
        scene.fog = new THREE.FogExp2(new THREE.Color(PALETTE.void), 0.0009)
      }}
    >
      <Scene profile={profile} reducedMotion={reducedMotion} ignited={ignited} />
    </Canvas>
  )
}
