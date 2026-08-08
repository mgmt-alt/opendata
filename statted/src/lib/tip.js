// Lightweight DOM tooltip shared by all charts (avoids React re-renders on mousemove).
let el = null
function ensure() {
  if (!el) { el = document.createElement('div'); el.className = 'tt'; document.body.appendChild(el) }
  return el
}
export function showTip(html, ev) { const t = ensure(); t.innerHTML = html; t.style.opacity = 1; moveTip(ev) }
export function moveTip(ev) {
  const t = ensure(), p = 12, w = t.offsetWidth, h = t.offsetHeight
  let x = ev.clientX + p, y = ev.clientY + p
  if (x + w > innerWidth - 8) x = ev.clientX - w - p
  if (y + h > innerHeight - 8) y = ev.clientY - h - p
  t.style.left = x + 'px'; t.style.top = y + 'px'
}
export function hideTip() { if (el) el.style.opacity = 0 }
