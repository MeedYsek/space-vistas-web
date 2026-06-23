import { useEffect, useRef } from 'react'

/**
 * Magnetic hover: the element leans toward the pointer while hovered and springs
 * back on leave. Returns a ref to attach. Disabled on coarse pointers and under
 * reduced motion. `strength` is the px pull at the element's edge.
 */
export function useMagnetic<T extends HTMLElement>(strength = 14, reducedMotion = false) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (reducedMotion || !window.matchMedia('(pointer: fine)').matches) return

    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect()
      const mx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2)
      const my = (e.clientY - (r.top + r.height / 2)) / (r.height / 2)
      el.style.transform = `translate(${mx * strength}px, ${my * strength}px)`
    }
    const onLeave = () => {
      el.style.transform = 'translate(0, 0)'
    }

    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
    }
  }, [strength, reducedMotion])

  return ref
}
