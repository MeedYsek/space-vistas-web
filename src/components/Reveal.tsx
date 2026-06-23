import { Fragment, useEffect, useRef, type ElementType, type ReactNode } from 'react'

interface RevealProps {
  /** The text to split + reveal (string only — split per word). */
  text: string
  /** Element to render as (h1/h2/p/span…). Defaults to a div. */
  as?: ElementType
  className?: string
  /** Stagger between words (seconds). */
  stagger?: number
  /** Reveal per line instead of per word (keeps long copy calmer). */
  by?: 'word' | 'line'
  reducedMotion?: boolean
  children?: ReactNode
}

/**
 * SplitText-style reveal: the text is split into words (or "lines" = a single
 * unit), each wrapped in a span that drifts up and resolves from a blur. The
 * whole thing animates the first time it scrolls into view, staggered. Pure CSS
 * transitions (no GSAP DOM thrash); IntersectionObserver fires the reveal once.
 *
 * Accessible: the original text is exposed via aria-label and each visual word
 * is aria-hidden, so screen readers read the sentence normally.
 */
export default function Reveal({
  text,
  as,
  className = '',
  stagger = 0.06,
  by = 'word',
  reducedMotion = false,
  children,
}: RevealProps) {
  const ref = useRef<HTMLElement>(null)
  const Tag = (as ?? 'div') as ElementType

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (reducedMotion) {
      el.classList.add('reveal--in')
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            el.classList.add('reveal--in')
            io.disconnect()
          }
        }
      },
      { threshold: 0.25 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [reducedMotion])

  const units = by === 'word' ? text.split(' ') : [text]

  return (
    <Tag ref={ref} className={`reveal ${className}`} aria-label={text}>
      {units.map((u, i) => (
        <Fragment key={i}>
          {/* Real whitespace text node BETWEEN word boxes so the gap survives
              (a space inside an inline-block collapses at its edge). */}
          {i > 0 ? ' ' : ''}
          <span className="reveal-word" aria-hidden="true">
            <span className="reveal-word__inner" style={{ transitionDelay: `${i * stagger}s` }}>
              {u}
            </span>
          </span>
        </Fragment>
      ))}
      {children}
    </Tag>
  )
}
