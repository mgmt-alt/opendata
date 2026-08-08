import { useMemo, useState } from 'react'
import { DATA, SAMPLE_META } from '../lib/data.js'
import { teamEntities } from '../lib/scoring.js'
import ViewToggle from './ViewToggle.jsx'
import { showTip, moveTip, hideTip } from '../lib/tip.js'

const LAYERS = [['touch', 'Touches'], ['defend', 'Defending'], ['run', 'Runs']]
const RAMP = { touch: '#2563eb', defend: '#6d28d9', run: '#ec4899' }

export default function Heatmaps() {
  const [view, setView] = useState('players')
  const [layer, setLayer] = useState('touch')
  const [selId, setSelId] = useState(null)
  const team = view === 'teams'
  const pool = useMemo(() => (team ? teamEntities() : DATA).filter((d) => d.shot && d.shot.grid)
    .sort((a, b) => a.player_name.localeCompare(b.player_name)), [team])
  const d = pool.find((p) => String(p.player_id) === String(selId)) || pool[0]

  const cols = SAMPLE_META.grid_cols, rows = SAMPLE_META.grid_rows
  const grid = (d && d.shot.grid[layer]) || []
  const max = Math.max(1, ...grid)
  const W = 760, H = Math.round(W * (rows / cols) * 1.02), pad = 6
  const cw = (W - 2 * pad) / cols, ch = (H - 2 * pad) / rows
  const total = grid.reduce((a, b) => a + b, 0)

  return (
    <>
      <h1>Action heat-maps <span className="tag-s">10-match sample</span></h1>
      <p className="sub">Where a player or club operates across the tracked matches — touches, defending and runs. Attacking left → right.</p>
      <div className="card">
        <div className="hm-controls">
          <select value={d ? d.player_id : ''} onChange={(e) => setSelId(e.target.value)} style={{ font: 'inherit', fontSize: 14, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)' }}>
            {pool.map((p) => <option key={p.player_id} value={p.player_id}>{team ? p.player_name : `${p.player_name} — ${p.team_short}`}</option>)}
          </select>
          <div className="vseg">{LAYERS.map(([v, lab]) => <button key={v} aria-pressed={layer === v} onClick={() => setLayer(v)}>{lab}</button>)}</div>
          <ViewToggle view={view} setView={(v) => { setView(v); setSelId(null) }} />
        </div>
        {d && (
          <div className="chart-wrap">
            <svg className="chart" viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
              {Array.from({ length: rows }).map((_, r) => Array.from({ length: cols }).map((_, c) => {
                const v = grid[r * cols + c] || 0, t = v / max
                return <rect key={r + '-' + c} x={pad + c * cw} y={pad + r * ch} width={cw - 1} height={ch - 1} rx="2"
                  fill={RAMP[layer]} fillOpacity={(0.06 + 0.9 * Math.sqrt(t)).toFixed(3)}
                  onMouseEnter={v > 0 ? (e) => showTip(`<b>${LAYERS.find((l) => l[0] === layer)[1]}</b>: ${v}`, e) : undefined}
                  onMouseMove={moveTip} onMouseLeave={hideTip} />
              }))}
              <line className="pitch-line" x1={pad + cols / 2 * cw} x2={pad + cols / 2 * cw} y1={pad} y2={H - pad} />
              <circle className="pitch-line" cx={pad + cols / 2 * cw} cy={H / 2} r={Math.min(cw, ch) * 1.1} />
              <rect className="pitch-line" x={pad} y={pad} width={W - 2 * pad} height={H - 2 * pad} />
              <text className="axis" x={W - pad - 4} y={H - pad - 4} textAnchor="end">attack →</text>
            </svg>
          </div>
        )}
        {d && <p className="caption">{d.player_short_name}{d.isTeam ? ' (squad)' : ''} · {LAYERS.find((l) => l[0] === layer)[1]} · {total} actions across {d.shot.apps} tracked {d.shot.apps === 1 ? 'match' : 'matches'} · attacking left → right</p>}
      </div>
    </>
  )
}
