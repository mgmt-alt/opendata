import { useMemo, useState } from 'react'
import { DATA, SAMPLE_META } from '../lib/data.js'
import { teamEntities } from '../lib/scoring.js'
import ViewToggle from './ViewToggle.jsx'
import PageHead from './PageHead.jsx'
import { showTip, moveTip, hideTip } from '../lib/tip.js'

const LAYERS = [['touch', 'Touches'], ['defend', 'Defending'], ['run', 'Runs']]
const RAMP = { touch: 'var(--run-5)', defend: 'var(--run-6)', run: 'var(--run-1)' }

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
      <PageHead no="07" kicker="Territory" tag="10-match sample"
        title="Where a player <em>lives</em>"
        sub="Density of touches, defending and runs across the ten tracked matches, drawn onto the pitch. Attacking left → right." />
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
              {(() => {
                const pl = pad, pt = pad, pw = W - 2 * pad, ph = H - 2 * pad
                const cx = pl + pw / 2, cy = pt + ph / 2
                const bw = pw * 0.157, bh = ph * 0.6, gw = pw * 0.055, gh = ph * 0.28
                return (
                  <g className="pitch-line">
                    <rect x={pl} y={pt} width={pw} height={ph} />
                    <line x1={cx} x2={cx} y1={pt} y2={pt + ph} />
                    <circle cx={cx} cy={cy} r={ph * 0.13} />
                    <circle cx={cx} cy={cy} r={2.2} fill="var(--axis)" />
                    <rect x={pl} y={cy - bh / 2} width={bw} height={bh} />
                    <rect x={pl + pw - bw} y={cy - bh / 2} width={bw} height={bh} />
                    <rect x={pl} y={cy - gh / 2} width={gw} height={gh} />
                    <rect x={pl + pw - gw} y={cy - gh / 2} width={gw} height={gh} />
                  </g>
                )
              })()}
              <text className="axis" x={W - pad - 6} y={H - pad - 6} textAnchor="end">attack →</text>
            </svg>
          </div>
        )}
        {d && <p className="caption">{d.player_short_name}{d.isTeam ? ' (squad)' : ''} · {LAYERS.find((l) => l[0] === layer)[1]} · {total} actions across {d.shot.apps} tracked {d.shot.apps === 1 ? 'match' : 'matches'} · attacking left → right</p>}
      </div>
    </>
  )
}
