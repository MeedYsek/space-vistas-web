import { useCallback, useEffect, useRef, useState } from 'react'
import { useDeviceProfile } from './hooks/useDeviceProfile'
import { useReducedMotion } from './hooks/useReducedMotion'
import { useSmoothScroll, lockScroll, unlockScroll } from './lib/useSmoothScroll'
import Experience from './components/Experience'
import StaticFallback from './components/StaticFallback'
import Overlay from './components/Overlay'
import Preloader from './components/Preloader'
import Cursor from './components/Cursor'
import ScrollToTop from './components/ScrollToTop'

/**
 * App root.
 *  - Sniffs device capabilities (mobile / WebGL / low-power).
 *  - Wires Lenis smooth scroll + the page-level scroll-progress tracker.
 *  - Holds the single `ignited` flag: the preloader flips it on completion,
 *    which kicks the camera push (CameraRig), reveals the hero text and
 *    unlocks scrolling — all from one coordinated moment.
 */
export default function App() {
  const profile = useDeviceProfile()
  const reducedMotion = useReducedMotion()
  const [ignited, setIgnited] = useState(false)

  useSmoothScroll(reducedMotion)

  // Lock scrolling until the scene ignites. With no WebGL we skip the preloader
  // and reveal everything immediately so the content is never trapped.
  useEffect(() => {
    if (profile.hasWebGL) {
      lockScroll()
    } else {
      setIgnited(true)
      unlockScroll()
    }
  }, [profile.hasWebGL])

  const handleIgnite = useCallback(() => {
    setIgnited(true)
    unlockScroll()
  }, [])

  // Diagnostic: makes a black screen non-silent. Logs whether WebGL was detected
  // and which render path is active, so a broken viewer (e.g. an embedded
  // preview pane with no WebGL) is obvious in the console.
  const logged = useRef(false)
  useEffect(() => {
    if (logged.current) return
    logged.current = true
    // eslint-disable-next-line no-console
    console.info(
      `%c[A Cathedral of Night] WebGL ${
        profile.hasWebGL ? 'available — rendering 3D scene' : 'UNAVAILABLE — static fallback'
      } · ${profile.isMobile ? 'mobile' : 'desktop'} profile`,
      'color:#5ad7ff',
    )
  }, [profile.hasWebGL, profile.isMobile])

  return (
    <>
      {profile.hasWebGL ? (
        <Experience profile={profile} reducedMotion={reducedMotion} ignited={ignited} />
      ) : (
        <StaticFallback />
      )}

      <Overlay ignited={ignited} reducedMotion={reducedMotion} />

      {!profile.isMobile && <Cursor reducedMotion={reducedMotion} />}

      {profile.hasWebGL && <Preloader onComplete={handleIgnite} />}

      <ScrollToTop reducedMotion={reducedMotion} />
    </>
  )
}
