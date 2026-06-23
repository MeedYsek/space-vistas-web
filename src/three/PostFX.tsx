import { useMemo, type ReactElement } from 'react'
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

interface PostFXProps {
  /** Mobile / low-power drops the costlier effects. */
  enableChromaticAberration?: boolean
  enableGrain?: boolean
  bloomIntensity?: number
}

/**
 * Cinematic post stack:
 *   Bloom (threshold-based, mipmap) → makes stars / glows bleed light
 *   ChromaticAberration → faint colour fringing toward the frame edges
 *   Vignette → focuses the eye, deepens the void
 *   Noise → subtle film grain so the image reads filmic, not clinical
 *
 * Selective bloom (sun, planet rims) arrives in Milestone 3; threshold bloom
 * already lights up the brightest stars beautifully. Effects are rendered
 * conditionally so disabling one never leaves an empty composer child.
 */
export default function PostFX({
  enableChromaticAberration = true,
  enableGrain = true,
  bloomIntensity = POSTFX.bloom.intensity,
}: PostFXProps) {
  const caOffset = useMemo(
    () => new THREE.Vector2(POSTFX.chromaticAberration.offset, POSTFX.chromaticAberration.offset),
    [],
  )

  const caEffect = (enableChromaticAberration ? (
    <ChromaticAberration
      offset={caOffset}
      blendFunction={BlendFunction.NORMAL}
      radialModulation={false}
      modulationOffset={0}
    />
  ) : null) as ReactElement

  const grainEffect = (enableGrain ? (
    <Noise opacity={POSTFX.filmGrain.opacity} blendFunction={BlendFunction.OVERLAY} />
  ) : null) as ReactElement

  return (
    <EffectComposer multisampling={0}>
      <Bloom
        intensity={bloomIntensity}
        luminanceThreshold={POSTFX.bloom.luminanceThreshold}
        luminanceSmoothing={POSTFX.bloom.luminanceSmoothing}
        mipmapBlur={POSTFX.bloom.mipmapBlur}
      />
      {caEffect}
      <Vignette offset={POSTFX.vignette.offset} darkness={POSTFX.vignette.darkness} />
      {grainEffect}
    </EffectComposer>
  )
}
