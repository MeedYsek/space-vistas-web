import { useEffect, useRef, useState } from 'react'

/**
 * Optional ambient drone. OFF by default and only ever started by an explicit
 * user click (browsers require a user gesture for audio anyway). Builds a soft
 * spatial pad from a couple of detuned oscillators through a low-pass filter —
 * no audio files. Cleans up its AudioContext on unmount.
 */
export default function AmbientAudio() {
  const [on, setOn] = useState(false)
  const ctxRef = useRef<AudioContext | null>(null)
  const gainRef = useRef<GainNode | null>(null)

  const build = () => {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const master = ctx.createGain()
    master.gain.value = 0
    master.connect(ctx.destination)

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 520
    filter.Q.value = 0.7
    filter.connect(master)

    // A low drone with detuned partials for a slow beating pad.
    const freqs = [55, 82.4, 110, 164.8]
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator()
      osc.type = i % 2 === 0 ? 'sine' : 'triangle'
      osc.frequency.value = f
      osc.detune.value = (i - 1.5) * 6
      const g = ctx.createGain()
      g.gain.value = i === 0 ? 0.5 : 0.18
      // Gentle LFO on amplitude for breathing.
      const lfo = ctx.createOscillator()
      const lfoGain = ctx.createGain()
      lfo.frequency.value = 0.05 + i * 0.017
      lfoGain.gain.value = 0.08
      lfo.connect(lfoGain).connect(g.gain)
      osc.connect(g).connect(filter)
      osc.start()
      lfo.start()
    })

    ctxRef.current = ctx
    gainRef.current = master
    return { ctx, master }
  }

  const toggle = () => {
    if (!on) {
      const { ctx, master } = ctxRef.current && gainRef.current
        ? { ctx: ctxRef.current, master: gainRef.current }
        : build()
      ctx.resume()
      master.gain.cancelScheduledValues(ctx.currentTime)
      master.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 2.5)
      setOn(true)
    } else {
      const ctx = ctxRef.current
      const master = gainRef.current
      if (ctx && master) {
        master.gain.cancelScheduledValues(ctx.currentTime)
        master.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2)
      }
      setOn(false)
    }
  }

  useEffect(() => {
    return () => {
      ctxRef.current?.close()
    }
  }, [])

  return (
    <button
      type="button"
      data-cursor
      onClick={toggle}
      aria-pressed={on}
      className="link-glow inline-flex items-center gap-3 text-sm text-white/55"
    >
      <span
        aria-hidden="true"
        className={`relative flex h-2.5 w-2.5 items-center justify-center rounded-full border ${
          on ? 'border-glow-cyan' : 'border-white/40'
        }`}
      >
        {on && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-glow-cyan" />}
      </span>
      {on ? 'Ambient drone — on' : 'Ambient drone — off'}
    </button>
  )
}
