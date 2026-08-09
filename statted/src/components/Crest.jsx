import { TEAM_COLOR, TEAM_COLOR2 } from '../lib/constants.js'

// Optional real logos: any file in src/logos/ (e.g. sydney-fc.png) is picked up at build
// time; a club with a logo shows it, otherwise the drawn shield crest below.
const LOGOS = import.meta.glob('../logos/*.{png,svg,webp,jpg,jpeg}', { eager: true, query: '?url', import: 'default' })
const LOGO_BY_SLUG = {}
for (const path in LOGOS) {
  const slug = path.split('/').pop().replace(/\.[^.]+$/, '').toLowerCase()
  LOGO_BY_SLUG[slug] = LOGOS[path]
}
const slug = (t) => (t || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function textOn(hex) {
  if (!hex || hex[0] !== '#') return '#fff'
  const c = hex.slice(1)
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? '#141414' : '#fff'
}
function initials(d) {
  const nm = (d.player_name || '').trim()
  if (d.isTeam) { const w = nm.split(/\s+/); return (w.length > 1 ? w[0][0] + w[1][0] : nm.slice(0, 2)).toUpperCase() }
  const w = nm.split(/\s+/).filter(Boolean)
  return ((w[0]?.[0] || '') + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase()
}

export default function Crest({ d, size = 30 }) {
  const logo = LOGO_BY_SLUG[slug(d.team_short)]
  if (logo) return <img className="crest logo" src={logo} alt={d.team_short || ''} title={d.team_short || ''} style={{ width: size, height: size }} />
  const p = TEAM_COLOR[d.team_short] || '#64748b'
  const s = TEAM_COLOR2[d.team_short] || '#ffffff'
  return (
    <svg className="crest" width={size} height={Math.round(size * 1.08)} viewBox="0 0 40 43" role="img" aria-label={d.team_short || ''}>
      <title>{d.team_short || ''}</title>
      <path d="M4 4 H36 V21 C36 31 29 37.5 20 41 C11 37.5 4 31 4 21 Z" fill={p} stroke={s} strokeWidth="3" strokeLinejoin="round" />
      <text x="20" y="20" textAnchor="middle" dominantBaseline="central" fill={textOn(TEAM_COLOR[d.team_short])}
        fontSize="16" fontWeight="800" style={{ fontFamily: 'inherit' }}>{initials(d)}</text>
    </svg>
  )
}
