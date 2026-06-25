import { useMemo } from 'react'
import type { ReactElement } from 'react'
import * as THREE from 'three'
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Vignette,
  Noise,
} from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { POSTFX } from '../config/scene'
import { DEBUG } from '../lib/debug'

interface PostFXProps {
  /** Mobile / low-power drops the costlier effects. */
  enableChromaticAberration?: boolean
  enableGrain?: boolean
  bloomIntensity?: number
  /** MSAA samples for the composer's scene target. 0 = off (light path). The
      Canvas `antialias` flag doesn't reach the composer's own render target, so
      without this, geometry edges (planet limbs, Saturn's ring edge-on, the thin
      orbit guides) hard-alias and shimmer/flicker at grazing camera angles. */
  multisampling?: number
}

/**
 * Cinematic post stack:
 *   Bloom → OFF by default (POSTFX.bloom.enabled) for the grounded-realism look —
 *           real astrophotography doesn't bloom. Flip the flag to restore the glow.
 *   ChromaticAberration → faint colour fringing toward the frame edges
 *   Vignette → focuses the eye, deepens the void
 *   Noise → subtle film grain so the image reads filmic, not clinical
 *
 * Effects render conditionally (Bloom/CA/Grain can each be null) — Vignette is
 * always present, so the composer never ends up with no children. MSAA is set on
 * the composer's own target since the Canvas `antialias` flag doesn't reach it.
 */
export default function PostFX({
  enableChromaticAberration = true,
  enableGrain = true,
  bloomIntensity = POSTFX.bloom.intensity,
  multisampling = 4,
}: PostFXProps) {
  const caOffset = useMemo(
    () => new THREE.Vector2(POSTFX.chromaticAberration.offset, POSTFX.chromaticAberration.offset),
    [],
  )

  return (
    <EffectComposer multisampling={multisampling}>
      {(POSTFX.bloom.enabled && !DEBUG.noBloom ? (
        <Bloom
          intensity={bloomIntensity}
          luminanceThreshold={POSTFX.bloom.luminanceThreshold}
          luminanceSmoothing={POSTFX.bloom.luminanceSmoothing}
          mipmapBlur={POSTFX.bloom.mipmapBlur}
        />
      ) : null) as ReactElement}
      {(enableChromaticAberration ? (
        <ChromaticAberration
          offset={caOffset}
          blendFunction={BlendFunction.NORMAL}
          radialModulation={false}
          modulationOffset={0}
        />
      ) : null) as ReactElement}
      <Vignette offset={POSTFX.vignette.offset} darkness={POSTFX.vignette.darkness} />
      {(enableGrain ? (
        <Noise opacity={POSTFX.filmGrain.opacity} blendFunction={BlendFunction.OVERLAY} />
      ) : null) as ReactElement}
    </EffectComposer>
  )
}
