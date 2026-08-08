import { useMemo, useState } from 'react'
import { DATA } from '../lib/data.js'
import { ALL_NAMES, SILO_COLORS } from '../lib/constants.js'
import { teamEntities, fmt } from '../lib/scoring.js'
import ViewToggle from './ViewToggle.jsx'
import { showTip, moveTip, hideTip } from '../lib/tip.js'

const W = 460, cx = W / 2, cy = W / 2, R = W * 0.3

export default function Radar() {
  const [view, setView] = useState('players')
  const team = view === 'teams'
  const universe = useMemo(() => (team ? teamEntities() : DATA).slice().sort((a, b) => a.player_name.localeCompare(b.player_name)), [team])
  const defA = team ? universe[0] : (DATA.find((d) => d.position_group === 'Wide Attacker' && d.shot) || DATA[0])
  const defB = team ? universe[1] : (DATA.find((d) => d.position_group === 'Central Defender' && d.shot) || DATA[1])
  const [aId, setAId] = useState(defA.player_id)
  const [bId, setBId] = useState(defB.player_id)
  const A = universe.find((d) => String(d.player_id) === String(aId)) || universe[0]
  const B = universe.find((d) => String(d.player_id) === String(bId)) || universe[1]

  const n = ALL_NAMES.length
  const ang = (i) => -Math.PI / 2 + i * 2 * Math.PI / n
  const pt = (i, r) => [cx + Math.cos(ang(i)) * r * R / 100, cy + Math.sin(ang(i)) * r * R / 100]
  const poly = (d) => ALL_NAMES.map((s, i) => pt(i, d['silo__' + s] ?? 0).map((v) => v.toFixed(1)).join(',')).join(' ')

  const sel = (val, set) => (
    <select value={val} onChange={(e) => set(e.target.value)} style={{ font: 'inherit', fontSize: 14, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', maxWidth: '100%' }}>
      {universe.map((d) => <option key={d.player_id} value={d.player_id}>{team ? d.player_name : `${d.player_name} — ${d.team_short}`}</option>)}
    </select>
  )

  return (
    <>
      <h1>Compare — silo radar</h1>
      <p className="sub">Two players (or clubs) across every silo. Percentile within position, 0–100.</p>
      <div className="card">
        <div className="row-between"><ViewToggle view={view} setView={(v) => { setView(v); }} /></div>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: '0 1 240px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className="swatch" style={{ background: 'var(--c1)' }} />{sel(aId, setAId)}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className="swatch" style={{ background: 'var(--c2)' }} />{sel(bId, setBId)}</div>
          </div>
          <div style={{ flex: '1 1 320px', minWidth: 280, maxWidth: '100%' }}>
            <svg className="chart" viewBox={`0 0 ${W} ${W}`} width={W} height={W}>
              {[25, 50, 75, 100].map((rr) => (
                <polygon key={rr} points={ALL_NAMES.map((_, i) => pt(i, rr).map((v) => v.toFixed(1)).join(',')).join(' ')} fill="none" stroke="var(--grid)" />
              ))}
              {ALL_NAMES.map((s, i) => {
                const [x, y] = pt(i, 100); const [lx, ly] = pt(i, 116)
                return (
                  <g key={s}>
                    <line x1={cx} y1={cy} x2={x} y2={y} stroke="var(--grid)" />
                    <text x={lx} y={ly} textAnchor={Math.abs(lx - cx) < 8 ? 'middle' : (lx > cx ? 'start' : 'end')} dominantBaseline="middle"
                      style={{ fill: SILO_COLORS[s], fontWeight: 700, fontSize: 10 }}>{s.toUpperCase()}</text>
                  </g>
                )
              })}
              {[[A, 'var(--c1)'], [B, 'var(--c2)']].map(([d, col], k) => (
                <g key={k}>
                  <polygon points={poly(d)} fill={col} fillOpacity="0.14" stroke={col} strokeWidth="2.4" strokeLinejoin="round" />
                  {ALL_NAMES.map((s, i) => {
                    const v = d['silo__' + s]; if (v == null) return null
                    const [x, y] = pt(i, v)
                    return <circle key={s} cx={x} cy={y} r="3.5" fill={col}
                      onMouseEnter={(e) => showTip(`<b>${d.player_name}</b><div class="pos">${s}</div><div class="r"><span>Percentile</span><b>${fmt(v, 0)}</b></div>`, e)}
                      onMouseMove={moveTip} onMouseLeave={hideTip} />
                  })}
                </g>
              ))}
            </svg>
          </div>
        </div>
        <div className="legend" style={{ marginTop: 10 }}>
          <span className="item"><span className="swatch" style={{ background: 'var(--c1)' }} />{A.player_name}</span>
          <span className="item"><span className="swatch" style={{ background: 'var(--c2)' }} />{B.player_name}</span>
        </div>
      </div>
    </>
  )
}
