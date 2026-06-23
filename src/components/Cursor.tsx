import { useEffect, useRef } from 'react'

/**
 * Custom cursor: a small glowing dot that tracks the pointer exactly, plus a
 * larger ring that trails it with a little zero-G lag. Over interactive targets
 * (links, buttons, anything with [data-cursor]) the ring swells and brightens.
 *
 * Pointer-fine devices only (touch keeps the native behaviour). Under
 * reduced-motion the ring follows without lag. Driven by a single rAF loop on
 * refs — no React re-renders per frame.
 */
export default function Cursor({ reducedMotion }: { reducedMotion: boolean }) {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Skip entirely on coarse-pointer (touch) devices.
    if (!window.matchMedia('(pointer: fine)').matches) return

    document.body.classList.add('has-custom-cursor')

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const ring = { x: target.x, y: target.y }
    let hovering = false
    let visible = false
    let raf = 0

    const onMove = (e: MouseEvent) => {
      target.x = e.clientX
      target.y = e.clientY
      if (!visible) {
        visible = true
        dotRef.current?.style.setProperty('opacity', '1')
        ringRef.current?.style.setProperty('opacity', '1')
      }
      // Hover state: interactive elements under the pointer.
      const el = e.target as HTMLElement | null
      const interactive = !!el?.closest('a, button, input, [data-cursor], [role="button"]')
      if (interactive !== hovering) {
        hovering = interactive
        ringRef.current?.classList.toggle('cursor-ring--hover', hovering)
      }
    }

    const onLeave = () => {
      visible = false
      dotRef.current?.style.setProperty('opacity', '0')
      ringRef.current?.style.setProperty('opacity', '0')
    }

    const ease = reducedMotion ? 1 : 0.18
    const loop = () => {
      ring.x += (target.x - ring.x) * ease
      ring.y += (target.y - ring.y) * ease
      if (dotRef.current)
        dotRef.current.style.transform = `translate3d(${target.x}px, ${target.y}px, 0) translate(-50%, -50%)`
      if (ringRef.current)
        ringRef.current.style.transform = `translate3d(${ring.x}px, ${ring.y}px, 0) translate(-50%, -50%)`
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    window.addEventListener('mousemove', onMove, { passive: true })
    document.addEventListener('mouseleave', onLeave)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', onLeave)
      document.body.classList.remove('has-custom-cursor')
    }
  }, [reducedMotion])

  return (
    <div aria-hidden="true" className="cursor-layer">
      <div ref={dotRef} className="cursor-dot" style={{ opacity: 0 }} />
      <div ref={ringRef} className="cursor-ring" style={{ opacity: 0 }} />
    </div>
  )
}
