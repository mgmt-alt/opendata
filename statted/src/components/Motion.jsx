import { useEffect, useRef, useState } from 'react'

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

// Fade/rise a block into view once, the way ink settles onto a page. Honours
// reduced-motion (renders immediately).
export function Reveal({ children, delay = 0, as: Tag = 'div', className = '', ...rest }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el || reduced()) { el && el.classList.add('is-in'); return }
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target) } })
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const d = delay ? ` d${delay}` : ''
  return <Tag ref={ref} className={`reveal${d} ${className}`} {...rest}>{children}</Tag>
}

// A figure that tallies up to its value once, on first view.
export function Tally({ value, decimals = 0, duration = 1100 }) {
  const [n, setN] = useState(reduced() ? value : 0)
  const ref = useRef(null)
  useEffect(() => {
    if (reduced()) { setN(value); return }
    const el = ref.current
    const io = new IntersectionObserver((es) => {
      if (!es[0].isIntersecting) return
      io.disconnect()
      const t0 = performance.now()
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / duration)
        const e = 1 - Math.pow(1 - p, 3)
        setN(value * e)
        if (p < 1) requestAnimationFrame(tick)
        else setN(value)
      }
      requestAnimationFrame(tick)
    }, { threshold: 0.6 })
    io.observe(el)
    return () => io.disconnect()
  }, [value])
  const shown = n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  return <span ref={ref}>{shown}</span>
}
