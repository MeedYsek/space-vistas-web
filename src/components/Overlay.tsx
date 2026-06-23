import { useState } from 'react'
import { HERO_TITLE, HERO_SUBTITLE, HERO_KICKER } from '../config/scene'
import { CARDS } from '../config/planets'
import { VISTAS_CONTENT } from '../config/vistas'
import PlanetCards from './PlanetCards'
import Reveal from './Reveal'
import VistasSection from './VistasSection'
import AmbientAudio from './AmbientAudio'
import { useMagnetic } from '../lib/useMagnetic'

/**
 * The semantic DOM layer above the canvas. ALL real text content lives here as
 * proper HTML so the experience is readable, selectable, keyboard-navigable and
 * screen-reader friendly even with the 3D removed.
 *
 * Milestone 5 adds the vistas gallery (+ lightbox), the closing "Return" section
 * with a floating footer (credits, newsletter, socials, ambient-audio toggle),
 * and per-word type reveals on the section headings.
 */
export default function Overlay({
  ignited,
  reducedMotion,
}: {
  ignited: boolean
  reducedMotion: boolean
}) {
  const [subscribed, setSubscribed] = useState(false)
  const ctaRef = useMagnetic<HTMLButtonElement>(12, reducedMotion)

  // The tall scroll regions exist to give the camera dwell/flight time. Under
  // reduced motion the camera is pinned, so collapse them to a single screen.
  const tall = (vh: string) => (reducedMotion ? undefined : { minHeight: vh })

  return (
    <main className="relative z-10">
      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section
        className="relative flex min-h-screen flex-col justify-center px-6 md:px-16"
        aria-label={HERO_TITLE}
      >
        <div className={`max-w-4xl ${ignited ? 'hero-reveal' : 'opacity-0'}`}>
          <p className="label text-glow-cyan/80">{HERO_KICKER}</p>
          <h1 className="font-display mt-6 text-[clamp(2.75rem,9vw,8rem)] font-bold leading-[0.92]">
            {HERO_TITLE}
          </h1>
          <p className="mt-7 max-w-md text-base text-white/60 md:text-lg">{HERO_SUBTITLE}</p>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-center">
          <p className="label text-white/40">Scroll to drift</p>
          <div className="scroll-cue mx-auto mt-3 h-10 w-[1px] bg-gradient-to-b from-white/50 to-transparent" />
        </div>
      </section>

      {/* ── The Solar System (tall region = camera dwell time per planet) ──── */}
      <section
        id="solar-system"
        aria-label="The Solar System"
        className="relative min-h-screen"
        style={tall('520vh')}
      >
        <div className="flex min-h-screen items-center px-6 md:px-16">
          <div className="max-w-xl">
            <p className="label text-glow-cyan/80">II · The Solar System</p>
            <Reveal
              as="h2"
              text="An orrery of light"
              reducedMotion={reducedMotion}
              className="font-display mt-5 text-4xl font-medium leading-[1.02] md:text-6xl"
            />
            <p className="mt-6 text-base text-white/55 md:text-lg">
              Keep scrolling — the camera flies out from the sun and lingers on each
              world in turn. Move your pointer to orbit whichever planet is in view.
            </p>
          </div>
        </div>

        <ul className="sr-only">
          {CARDS.map((c) => (
            <li key={c.name}>
              {c.name} — {c.stat}. {c.line}
            </li>
          ))}
        </ul>
      </section>

      {/* ── The Galaxy (tall region = camera arc time around the centerpiece) ─ */}
      <section
        id="galaxy"
        aria-label="The Galaxy"
        className="relative min-h-screen"
        style={tall('250vh')}
      >
        <div className="flex min-h-screen items-center px-6 md:px-16">
          <div className="max-w-xl">
            <p className="label text-glow-cyan/80">III · The Galaxy</p>
            <Reveal
              as="h2"
              text="A hundred thousand suns"
              reducedMotion={reducedMotion}
              className="font-display mt-5 text-4xl font-medium leading-[1.02] md:text-6xl"
            />
            <p className="mt-6 text-base text-white/55 md:text-lg">
              A spiral of more than a hundred thousand points of light — warm at the
              core, cooling to its edges, the centre turning faster than the rim.
              Keep scrolling: the camera arcs slowly around the whole disk.
            </p>
          </div>
        </div>
      </section>

      {/* ── Deep-Space Vistas (gallery + lightbox) ─────────────────────────── */}
      <section
        id="vistas"
        aria-label="Deep-Space Vistas"
        className="relative min-h-screen"
        style={tall('300vh')}
      >
        <div className="flex min-h-screen items-center">
          <VistasSection reducedMotion={reducedMotion} />
        </div>

        {/* Accessible equivalent of the gallery. */}
        <ul className="sr-only">
          {VISTAS_CONTENT.map((v) => (
            <li key={v.key}>
              {v.title} — {v.kicker}. {v.caption}
            </li>
          ))}
        </ul>
      </section>

      {/* ── Return / closing + floating footer ─────────────────────────────── */}
      <section
        id="return"
        aria-label="Return"
        className="relative flex min-h-screen flex-col justify-between"
        style={tall('160vh')}
      >
        <div className="flex flex-1 items-center px-6 md:px-16">
          <div className="max-w-xl">
            <p className="label text-glow-cyan/80">V · Return</p>
            <Reveal
              as="h2"
              text="A single point of light"
              reducedMotion={reducedMotion}
              className="font-display mt-5 text-4xl font-medium leading-[1.02] md:text-6xl"
            />
            <p className="mt-6 text-base text-white/55 md:text-lg">
              The camera pulls back until the whole journey collapses to one pale
              point — everything you have ever known, adrift in the quiet dark.
            </p>
          </div>
        </div>

        <footer className="relative px-6 pb-16 pt-24 md:px-16">
          {/* Scrim so the floating footer stays legible over the starfield. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-void via-void/70 to-transparent"
          />
          <div className="relative mx-auto grid max-w-6xl gap-12 border-t border-white/10 pt-12 md:grid-cols-[1.2fr_1fr_auto]">
            <div>
              <p className="font-display text-2xl">A Cathedral of Night</p>
              <p className="mt-3 max-w-xs text-sm text-white/40">
                An interactive journey through the cosmos. Built with React Three
                Fiber, GSAP and Lenis. Imagery placeholder — procedural.
              </p>
              <div className="mt-6">
                <AmbientAudio />
              </div>
            </div>

            {/* Newsletter — placeholder only; does not transmit anything. */}
            <form
              className="self-start"
              onSubmit={(e) => {
                e.preventDefault()
                setSubscribed(true)
              }}
            >
              <label htmlFor="news" className="label block text-white/50">
                Dispatches from the dark
              </label>
              {subscribed ? (
                <p className="mt-4 text-sm text-glow-cyan">Thank you — see you out there.</p>
              ) : (
                <div className="mt-4 flex items-center gap-3 border-b border-white/20 pb-2">
                  <input
                    id="news"
                    type="email"
                    required
                    placeholder="you@somewhere.earth"
                    data-cursor
                    className="w-full bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
                  />
                  <button
                    ref={ctaRef}
                    type="submit"
                    data-cursor
                    className="magnetic link-glow whitespace-nowrap text-sm text-white/70"
                  >
                    Subscribe →
                  </button>
                </div>
              )}
            </form>

            <nav aria-label="Social links" className="flex gap-6 md:flex-col md:gap-3">
              {['Instagram', 'Behance', 'GitHub'].map((s) => (
                <a
                  key={s}
                  href="#"
                  data-cursor
                  className="link-glow label text-white/50"
                  onClick={(e) => e.preventDefault()}
                >
                  {s}
                </a>
              ))}
            </nav>
          </div>
          <p className="label mt-12 text-center text-white/25">
            A Cathedral of Night — Milestone 5 build
          </p>
        </footer>
      </section>

      {/* Floating planet info-cards (driven by the camera's focus). */}
      <PlanetCards />
    </main>
  )
}
