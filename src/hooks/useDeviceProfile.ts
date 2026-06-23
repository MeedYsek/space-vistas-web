import { useEffect, useState } from 'react'

export interface DeviceProfile {
  /** Small viewport OR coarse pointer — we treat these as "mobile". */
  isMobile: boolean
  /** True when WebGL2 (or WebGL) is available at all. */
  hasWebGL: boolean
  /** Rough low-power heuristic (few cores / coarse pointer / small screen). */
  isLowPower: boolean
}

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    )
  } catch {
    return false
  }
}

/**
 * One-shot device capability sniff used to pick desktop vs mobile config and
 * to trigger the static fallback when WebGL is unavailable.
 */
export function useDeviceProfile(): DeviceProfile {
  const [profile, setProfile] = useState<DeviceProfile>({
    isMobile: false,
    hasWebGL: true,
    isLowPower: false,
  })

  useEffect(() => {
    const coarse = window.matchMedia('(pointer: coarse)').matches
    const smallViewport = window.matchMedia('(max-width: 820px)').matches
    const cores = navigator.hardwareConcurrency ?? 8
    const isMobile = coarse || smallViewport
    const isLowPower = isMobile || cores <= 4
    setProfile({ isMobile, hasWebGL: detectWebGL(), isLowPower })
  }, [])

  return profile
}
