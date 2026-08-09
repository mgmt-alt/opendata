import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DATA, METRICS, METRIC_BY_KEY, META } from '../lib/data.js'
import { ALL_NAMES, SAMPLE_NAMES, SILO_COLORS, POS_COLOR } from '../lib/constants.js'
import { metricVal, fmtMetric, teamEntities } from '../lib/scoring.js'
import { useFilteredPlayers } from '../lib/store.jsx'
import FilterBar from './FilterBar.jsx'
import ViewToggle from './ViewToggle.jsx'
import { showTip, moveTip, hideTip } from '../lib/tip.js'
import PageHead from './PageHead.jsx'

const W = 900, H = 520, M = { l: 58, r: 20, t: 16, b: 52 }

export default function Explorer() {
  const players = useFilteredPlayers()
  const [view, setView] = useState('players')
  const [tab, setTab] = useState('All')
  const [xk, setXk] = useState('top_speed')
  const [yk, setYk] = useState('takeons')
  const navigate = useNavigate()
  const team = view === 'teams'
  const pool = team ? teamEntities() : players

  const rows = useMemo(() => pool.filter((d) => metricVal(d, xk) != null && metricVal(d, yk) != null), [pool, xk, yk])
  const mx = METRIC_BY_KEY[xk], my = METRIC_BY_KEY[yk]

  const axisOpts = (key) => {
    const inTab = tab === 'All' || METRIC_BY_KEY[key].silo === tab
    const list = tab === 'All' ? METRICS : METRICS.filter((m) => m.silo === tab)
    const opts = list.map((m) => ({ v: m.key, t: m.label + (m.src === 'sample' ? ' *' : '') }))
    if (!inTab) opts.unshift({ v: key, t: METRIC_BY_KEY[key].label + ' — ' + METRIC_BY_KEY[key].silo + ' (current)' })
    return opts
  }

  const geom = useMemo(() => {
    if (!rows.length) return null
    const xs = rows.map((d) => metricVal(d, xk)), ys = rows.map((d) => metricVal(d, yk))
    const xmin = Math.min(...xs), xmax = Math.max(...xs), ymin = Math.min(...ys), ymax = Math.max(...ys)
    const pdx = (xmax - xmin) * 0.05 || 1, pdy = (ymax - ymin) * 0.08 || 1
    const X = (v) => M.l + ((v - (xmin - pdx)) / ((xmax + pdx) - (xmin - pdx))) * (W - M.r - M.l)
    const Y = (v) => (H - M.b) - ((v - (ymin - pdy)) / ((ymax + pdy) - (ymin - pdy))) * (H - M.b - M.t)
    const ticks = (a, b) => { const o = []; for (let i = 0; i <= 5; i++) o.push(a + (b - a) / 5 * i); return o }
    return { X, Y, xt: ticks(xmin - pdx, xmax + pdx), yt: ticks(ymin - pdy, ymax + pdy) }
  }, [rows, xk, yk])

  const labelled = useMemo(() => {
    const k = my && my.better === -1 ? -1 : 1
    return [...rows].sort((a, b) => k * (metricVal(b, yk) - metricVal(a, yk))).slice(0, 7)
  }, [rows, yk, my])

  return (
    <>
      <PageHead no="03" kicker="Explore"
        title="Any metric, <em>against</em> any other"
        sub="One dot per player. Pick a silo tab to narrow the axis menus; your picks persist across tabs, so you can cross silos." />
      <FilterBar />
      <div className="card">
        <div className="row-between"><ViewToggle view={view} setView={setView} /></div>
        <div className="silo-tabs">
          {['All', ...ALL_NAMES].map((t) => (
            <button key={t} className={'stab' + (tab === t ? ' active' : '') + (SAMPLE_NAMES.includes(t) ? ' samp' : '')}
              style={t !== 'All' ? { '--tabc': SILO_COLORS[t] } : undefined} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
        <div className="xp-controls">
          <label>X axis<select value={xk} onChange={(e) => setXk(e.target.value)}>{axisOpts(xk).map((o) => <option key={o.v} value={o.v}>{o.t}</option>)}</select></label>
          <label>Y axis<select value={yk} onChange={(e) => setYk(e.target.value)}>{axisOpts(yk).map((o) => <option key={o.v} value={o.v}>{o.t}</option>)}</select></label>
          <button className="toolbtn" onClick={() => { setXk(yk); setYk(xk) }}>⇄ swap</button>
        </div>
        <div className="legend">
          {!team ? META.positions.map((p) => <span className="item" key={p}><span className="swatch" style={{ background: POS_COLOR[p] }} />{p}</span>)
            : <span className="item">Each dot = one club</span>}
        </div>
        <div className="chart-wrap">
          <svg className="chart" viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
            {geom && geom.yt.map((t, i) => (
              <g key={'y' + i}>
                <line className="gridline" x1={M.l} x2={W - M.r} y1={geom.Y(t)} y2={geom.Y(t)} />
                <text className="axis" x={M.l - 8} y={geom.Y(t) + 3} textAnchor="end">{Math.round(t)}</text>
              </g>
            ))}
            {geom && geom.xt.map((t, i) => (
              <text className="axis" key={'x' + i} x={geom.X(t)} y={H - M.b + 18} textAnchor="middle">{Math.round(t)}</text>
            ))}
            <line className="baseline" x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} />
            <line className="baseline" x1={M.l} x2={M.l} y1={M.t} y2={H - M.b} />
            <text className="axis-title" x={(M.l + W - M.r) / 2} y={H - 10} textAnchor="middle">{(mx?.label || xk)} →</text>
            <text className="axis-title" transform={`translate(16 ${(M.t + H - M.b) / 2}) rotate(-90)`} textAnchor="middle">{(my?.label || yk)} →</text>
            {geom && rows.map((d) => (
              <circle key={d.player_id} className="dot" cx={geom.X(metricVal(d, xk))} cy={geom.Y(metricVal(d, yk))} r="5.5"
                fill={team ? 'var(--series-1)' : (POS_COLOR[d.position_group] || 'var(--series-1)')}
                style={{ cursor: team ? 'default' : 'pointer' }}
                onMouseEnter={(e) => { showTip(`<b>${d.player_short_name}</b><div class="pos">${team ? d.players + ' players' : d.position_group + ' · ' + d.team_short}</div><div class="r"><span>${my?.label || yk}</span><b>${fmtMetric(yk, metricVal(d, yk))}</b></div><div class="r"><span>${mx?.label || xk}</span><b>${fmtMetric(xk, metricVal(d, xk))}</b></div>`, e); e.target.setAttribute('r', 7.5) }}
                onMouseMove={moveTip} onMouseLeave={(e) => { hideTip(); e.target.setAttribute('r', 5.5) }}
                onClick={() => !team && navigate('/profile?p=' + d.player_id)} />
            ))}
            {geom && labelled.map((d) => {
              const cx = geom.X(metricVal(d, xk)), cy = geom.Y(metricVal(d, yk)), flip = cx > W - 150
              return <text key={'l' + d.player_id} className="axis" style={{ fontWeight: 700, fill: 'var(--ink)' }}
                x={flip ? cx - 9 : cx + 9} y={cy + 4} textAnchor={flip ? 'end' : 'start'}>{d.player_short_name}</text>
            })}
          </svg>
        </div>
        <p className="caption">{rows.length} {team ? 'clubs' : 'players'} · one dot each · click a dot to open the card · * = 10-match sample metric</p>
      </div>
    </>
  )
}
