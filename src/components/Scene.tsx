import Starfield from '../three/Starfield'
import Nebula from '../three/Nebula'
import ParallaxDust from '../three/ParallaxDust'
import PostFX from '../three/PostFX'
import CameraRig from '../three/CameraRig'
import SolarSystem from '../three/solar/SolarSystem'
import Galaxy from '../three/galaxy/Galaxy'
import Singularity from '../three/singularity/Singularity'
import Vistas from '../three/vistas/Vistas'
import { STARFIELD, NEBULA, DUST, GALAXY, MOBILE, POSTFX } from '../config/scene'
import type { DeviceProfile } from '../hooks/useDeviceProfile'

interface SceneProps {
  profile: DeviceProfile
  reducedMotion: boolean
  ignited: boolean
}

/**
 * The scene graph inside the persistent Canvas. Purely compositional:
 * <CameraRig /> owns all camera motion and each layer owns its own animation.
 *
 * Two adaptive paths:
 *  - "light" (mobile OR low-power desktop) drops particle counts, nebula layers,
 *    chromatic aberration and bloom so mid devices stay smooth.
 *  - Under reduced motion the camera is pinned at the hero, so the scenes it
 *    would fly to (solar / galaxy / vistas) are never on screen — we skip
 *    mounting them entirely (a calm static starfield + the full DOM narrative),
 *    which is both the safest vestibular choice and the cheapest to render.
 */
export default function Scene({ profile, reducedMotion, ignited }: SceneProps) {
  const light = profile.isMobile || profile.isLowPower

  const starCount = light ? MOBILE.starCount : STARFIELD.count
  const heroCount = light ? MOBILE.heroCount : STARFIELD.heroCount
  const nebulaLayers = light ? MOBILE.nebulaLayers : NEBULA.layers
  const dustCounts = light ? MOBILE.dustCounts : DUST.counts
  const galaxyCount = light ? MOBILE.galaxyCount : GALAXY.count

  return (
    <>
      <CameraRig ignited={ignited} reducedMotion={reducedMotion} />

      <Nebula layers={nebulaLayers} />
      <ParallaxDust counts={dustCounts} />
      <Starfield count={starCount} heroCount={heroCount} />

      {/* Heavy scenes: only when the camera will actually fly through them. */}
      {!reducedMotion && (
        <>
          <SolarSystem showOrbits={!light} />
          <Galaxy count={galaxyCount} />
          <Singularity />
          <Vistas lowPower={light} />
        </>
      )}

      <PostFX
        enableChromaticAberration={!light && !MOBILE.disableChromaticAberration}
        enableGrain={!MOBILE.disableFilmGrain || !light}
        bloomIntensity={light ? MOBILE.bloomIntensity : POSTFX.bloom.intensity}
      />
    </>
  )
}
