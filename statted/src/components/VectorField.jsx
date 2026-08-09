import { useEffect, useRef } from 'react'

// The hero's living identity: a flow field of the pitch. Particles stream along a
// smooth vector field that trends left→right (the direction of attack), tinted by
// the six run-family hues — the data's movement rendered as terrain. Falls back to
// a static field when the viewer prefers reduced motion.
export default function VectorField({ height = 520 }) {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0, W = 0, H = 0, dpr = 1, particles = [], t = 0, running = true

    const readPalette = () => {
      const cs = getComputedStyle(document.documentElement)
      return {
        bg: cs.getPropertyValue('--bg').trim() || '#0b0f16',
        runs: [1, 2, 3, 4, 5, 6].map((i) => cs.getPropertyValue('--run-' + i).trim()),
      }
    }
    let pal = readPalette()

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1)
      W = canvas.clientWidth; H = canvas.clientHeight
      canvas.width = Math.max(1, Math.floor(W * dpr))
      canvas.height = Math.max(1, Math.floor(H * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const n = Math.round(Math.min(720, (W * H) / 1500))
      particles = Array.from({ length: n }, spawn)
      // fresh ground on resize / theme change
      ctx.fillStyle = pal.bg; ctx.fillRect(0, 0, W, H)
      if (reduce) drawStatic()
    }
    function spawn() {
      return { x: Math.random() * W, y: Math.random() * H, life: 40 + Math.random() * 90, age: Math.random() * 120,
        col: pal.runs[(Math.random() * 6) | 0] }
    }
    // smooth field angle at (x,y): two rolling sinusoids + a forward bias
    function field(x, y) {
      const nx = x / W, ny = y / H
      const a = Math.sin(nx * 4.2 + t) * 0.9 + Math.cos(ny * 3.4 - t * 0.8) * 0.9 + Math.sin((nx + ny) * 2.6) * 0.5
      const vx = Math.cos(a) * 0.55 + 0.62      // rightward bias = direction of attack
      const vy = Math.sin(a) * 0.62
      const m = Math.hypot(vx, vy) || 1
      return [vx / m, vy / m]
    }
    function drawStatic() {
      ctx.fillStyle = pal.bg; ctx.fillRect(0, 0, W, H)
      const step = 34
      for (let y = step / 2; y < H; y += step) for (let x = step / 2; x < W; x += step) {
        const [vx, vy] = field(x, y); const len = 13
        ctx.strokeStyle = pal.runs[((x / step + y / step) | 0) % 6]; ctx.globalAlpha = 0.32
        ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x - vx * len, y - vy * len)
        const hx = x + vx * len, hy = y + vy * len; ctx.lineTo(hx, hy)
        const ang = Math.atan2(vy, vx)
        ctx.lineTo(hx - Math.cos(ang - 0.5) * 5, hy - Math.sin(ang - 0.5) * 5)
        ctx.moveTo(hx, hy); ctx.lineTo(hx - Math.cos(ang + 0.5) * 5, hy - Math.sin(ang + 0.5) * 5)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }
    function frame() {
      if (!running) return
      t += 0.0016
      // fade previous frame toward the ground colour → trails
      ctx.globalAlpha = 0.09; ctx.fillStyle = pal.bg; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1
      ctx.lineWidth = 1.25; ctx.lineCap = 'round'
      for (const p of particles) {
        const [vx, vy] = field(p.x, p.y); const sp = 1.15
        const px = p.x, py = p.y
        p.x += vx * sp * 1.6; p.y += vy * sp * 1.6; p.age++
        ctx.strokeStyle = p.col; ctx.globalAlpha = 0.5
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(p.x, p.y); ctx.stroke()
        if (p.age > p.life || p.x < -4 || p.x > W + 4 || p.y < -4 || p.y > H + 4) Object.assign(p, spawn())
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(frame)
    }

    resize()
    if (!reduce) raf = requestAnimationFrame(frame)
    window.addEventListener('resize', resize)
    const refreshTheme = () => { pal = readPalette(); if (reduce) drawStatic() }
    const mo = new MutationObserver(refreshTheme)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    const mq = matchMedia('(prefers-color-scheme: dark)'); mq.addEventListener?.('change', refreshTheme)
    const onVis = () => { running = !document.hidden; if (running && !reduce) raf = requestAnimationFrame(frame) }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      running = false; cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', onVis)
      mo.disconnect(); mq.removeEventListener?.('change', refreshTheme)
    }
  }, [])
  return <canvas ref={ref} className="hero-field" style={{ height }} aria-hidden="true" />
}
