import { useEffect, useState } from 'react'

// Light/dark toggle. Persists an explicit choice; otherwise follows the system.
export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'system')
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') { root.removeAttribute('data-theme'); localStorage.removeItem('theme') }
    else { root.setAttribute('data-theme', theme); localStorage.setItem('theme', theme) }
  }, [theme])
  const next = { system: 'light', light: 'dark', dark: 'system' }
  const icon = { system: '🖥️', light: '☀️', dark: '🌙' }
  return (
    <button className="toolbtn" title={`Theme: ${theme} (click to change)`} onClick={() => setTheme(next[theme])}
      style={{ marginLeft: 'auto' }} aria-label="Toggle theme">{icon[theme]}</button>
  )
}
