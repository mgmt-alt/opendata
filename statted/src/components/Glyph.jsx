import { RUN_FAMILIES } from '../lib/constants.js'

// The run-family vector — the atlas's signature mark. A directional arrow drawn
// on a unit field, rotated to the family's pitch angle, tinted by its hue. Some
// families carry a characteristic shaft (overlap arcs wide; support doubles back;
// half-space kinks through the channel) so the six read apart at a glance.
export function RunGlyph({ family, size = 34, weight = 2.4, muted = false, title }) {
  const f = typeof family === 'string' ? RUN_FAMILIES.find((r) => r.key === family) : family
  if (!f) return null
  const col = muted ? 'var(--rule-2)' : `var(${f.cvar})`
  const shaft = SHAFTS[f.key] || SHAFTS.default
  return (
    <svg className="glyph" width={size} height={size} viewBox="0 0 40 40" role="img"
      aria-label={title || f.key} style={{ overflow: 'visible' }}>
      <title>{title || f.key}</title>
      <g transform={`rotate(${f.angle} 20 20)`} fill="none" stroke={col}
        strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="7" cy="20" r="1.9" fill={col} stroke="none" />
        <path d={shaft} />
        <path d="M27 14.5 L34 20 L27 25.5" />
      </g>
    </svg>
  )
}

// shaft paths, all reading left→right in the glyph's own frame (before rotation)
const SHAFTS = {
  default: 'M7 20 H34',
  'In behind': 'M7 20 H34',
  'Ahead of ball': 'M7 20 H34',
  'Cross receiver': 'M7 20 C 18 20, 22 20, 34 20',
  'Wide / overlap': 'M7 20 C 14 8, 26 8, 34 20',      // bows out and back in
  'Support / short': 'M7 20 H34',                       // rotated to 180° = doubles back
  'Half-space': 'M7 20 L 18 20 L 24 12 L 34 12',        // kinks up into the channel
}

// A compact key of all six families with their read.
export function GlyphKey({ compact = false }) {
  return (
    <ul className={'glyph-key' + (compact ? ' compact' : '')}>
      {RUN_FAMILIES.map((f, i) => (
        <li key={f.key}>
          <RunGlyph family={f} size={compact ? 30 : 40} />
          <div className="gk-text">
            <span className="gk-name"><i className="gk-idx">{String(i + 1).padStart(2, '0')}</i>{f.short}</span>
            {!compact && <span className="gk-note">{f.note}</span>}
          </div>
        </li>
      ))}
    </ul>
  )
}
