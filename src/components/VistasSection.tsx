import { useRef, useState } from 'react'
import gsap from 'gsap'
import { VISTAS_CONTENT, type Vista } from '../config/vistas'
import Reveal from './Reveal'

/** A CSS stand-in for the vista's procedural imagery, built from its palette. */
function vistaBackground(v: Vista): string {
  const [a, b, c] = v.colors
  return (
    `radial-gradient(120% 90% at 30% 20%, ${c}55 0%, transparent 45%),` +
    `radial-gradient(140% 120% at 75% 80%, ${b}66 0%, transparent 55%),` +
    `linear-gradient(135deg, ${a} 0%, ${b}aa 60%, ${a} 100%)`
  )
}

/**
 * The deep-space vistas gallery (DOM layer). The cinematic reveal lives in the
 * WebGL plates (three/vistas); this is the accessible, interactive counterpart:
 * a heading that reveals per word, a row of clickable plates, and a lightbox
 * that animates the chosen plate up to a full-screen detail view (GSAP FLIP-
 * style) with its caption. Real NASA/ESO imagery can replace the CSS art later.
 */
export default function VistasSection({ reducedMotion }: { reducedMotion: boolean }) {
  const [open, setOpen] = useState<number | null>(null)
  const mediaRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const lastCardRect = useRef<DOMRect | null>(null)

  const openVista = (i: number, e: React.MouseEvent<HTMLButtonElement>) => {
    lastCardRect.current = (e.currentTarget.querySelector('.vista-thumb') ?? e.currentTarget).getBoundingClientRect()
    setOpen(i)
    // Animate on the next frame, once the lightbox DOM exists.
    requestAnimationFrame(() => {
      const media = mediaRef.current
      const rect = lastCardRect.current
      if (!media || !rect) return
      gsap.set(backdropRef.current, { autoAlpha: 0 })
      gsap.to(backdropRef.current, { autoAlpha: 1, duration: 0.4, ease: 'power2.out' })
      if (reducedMotion) {
        gsap.set(panelRef.current, { autoAlpha: 1 })
        return
      }
      // FLIP: start the media at the card's rect, expand to its laid-out size.
      const target = media.getBoundingClientRect()
      gsap.fromTo(
        media,
        {
          x: rect.left - target.left,
          y: rect.top - target.top,
          scaleX: rect.width / target.width,
          scaleY: rect.height / target.height,
          transformOrigin: 'top left',
        },
        { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.7, ease: 'expo.out' },
      )
      gsap.fromTo(
        panelRef.current?.querySelectorAll('.vista-detail-text > *') ?? [],
        { y: 24, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.6, stagger: 0.08, delay: 0.18, ease: 'power3.out' },
      )
    })
  }

  const close = () => {
    const media = mediaRef.current
    const rect = lastCardRect.current
    const done = () => setOpen(null)
    gsap.to(backdropRef.current, { autoAlpha: 0, duration: 0.4, ease: 'power2.in' })
    if (reducedMotion || !media || !rect) {
      gsap.to(panelRef.current, { autoAlpha: 0, duration: 0.3, onComplete: done })
      return
    }
    const target = media.getBoundingClientRect()
    gsap.to(media, {
      x: rect.left - target.left,
      y: rect.top - target.top,
      scaleX: rect.width / target.width,
      scaleY: rect.height / target.height,
      transformOrigin: 'top left',
      duration: 0.5,
      ease: 'power3.inOut',
      onComplete: done,
    })
    gsap.to(panelRef.current?.querySelector('.vista-detail-text') ?? null, {
      autoAlpha: 0,
      duration: 0.25,
    })
  }

  const active = open !== null ? VISTAS_CONTENT[open] : null

  return (
    <>
      <div className="mx-auto max-w-6xl px-6 md:px-16">
        <p className="label text-glow-cyan/80">IV · Deep-Space Vistas</p>
        <Reveal
          as="h2"
          text="A gallery of distances"
          reducedMotion={reducedMotion}
          className="font-display mt-5 text-4xl font-medium leading-[1.02] md:text-6xl"
        />
        <p className="mt-6 max-w-xl text-base text-white/55 md:text-lg">
          Scenes resolved from noise as the camera drifts past. Select any plate to
          open it full-screen.
        </p>

        <ul className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {VISTAS_CONTENT.map((v, i) => (
            <li key={v.key}>
              <button
                type="button"
                data-cursor
                onClick={(e) => openVista(i, e)}
                className="group block w-full text-left"
                aria-label={`Open ${v.title} — ${v.caption}`}
              >
                <div
                  className="vista-thumb relative aspect-[3/2] overflow-hidden rounded-lg border border-white/10 transition-transform duration-500 group-hover:scale-[1.02]"
                  style={{ background: vistaBackground(v) }}
                >
                  {v.src && (
                    <img
                      src={`/textures/${v.src}`}
                      alt={v.title}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <span className="absolute bottom-3 left-4 right-4">
                    <span className="label block text-[0.55rem] text-white/60">{v.kicker}</span>
                    <span className="font-display mt-1 block text-xl text-white/90">{v.title}</span>
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Full-screen detail view. */}
      {active && (
        <div
          ref={panelRef}
          className="fixed inset-0 z-[70] flex items-center justify-center p-6 md:p-12"
          role="dialog"
          aria-modal="true"
          aria-label={`${active.title} — ${active.caption}`}
        >
          <div
            ref={backdropRef}
            className="absolute inset-0 bg-void/85 backdrop-blur-sm"
            onClick={close}
          />
          <div className="relative grid max-h-full w-full max-w-5xl gap-8 md:grid-cols-[1.4fr_1fr] md:items-center">
            <div
              ref={mediaRef}
              className="aspect-[3/2] w-full overflow-hidden rounded-xl border border-white/15 shadow-2xl"
              style={{ background: vistaBackground(active) }}
            >
              {active.src && (
                <img
                  src={`/textures/${active.src}`}
                  alt={active.title}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="vista-detail-text">
              <p className="label text-glow-cyan/80">{active.kicker}</p>
              <h3 className="font-display mt-3 text-4xl font-medium md:text-5xl">{active.title}</h3>
              <p className="mt-5 text-lg italic text-white/70">{active.caption}</p>
              {active.credit ? (
                <p className="mt-6 text-xs uppercase tracking-widest text-white/35">
                  {active.credit}
                </p>
              ) : (
                <p className="mt-6 text-xs uppercase tracking-widest text-white/35">
                  Shader-generated · procedural imagery
                </p>
              )}
              <button
                type="button"
                data-cursor
                onClick={close}
                className="link-glow mt-8 inline-flex items-center gap-2 text-sm text-white/70"
              >
                <span aria-hidden="true">←</span> Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
