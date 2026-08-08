import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DATA, METRICS } from '../lib/data.js'
import { ALL_NAMES, SAMPLE_NAMES, SILO_COLORS, ALL_SILOS } from '../lib/constants.js'
import { metricVal, metricPct, fmtMetric, positionOverall, teamEntities, samplePeers, fmt } from '../lib/scoring.js'
import ViewToggle from './ViewToggle.jsx'
import Crest from './Crest.jsx'

const comboLabel = (d) => (d.isTeam ? d.player_name : `${d.player_name} — ${d.team_short}`)

function MiniHist({ m, d, peers, val, height = 46 }) {
  const W = 240, H = height
  const vals = peers.map((p) => metricVal(p, m.key)).filter((x) => x != null)
  if (!vals.length || val == null) return <svg className="mc-hist" viewBox={`0 0 ${W} ${H}`}><text className="axis" x={W / 2} y={H / 2} textAnchor="middle">no peers</text></svg>
  const min = Math.min(...vals), max = Math.max(...vals), span = (max - min) || 1
  const N = Math.min(20, Math.max(6, Math.round(Math.sqrt(vals.length))))
  const bins = new Array(N).fill(0)
  vals.forEach((v) => { let i = Math.floor((v - min) / span * N); if (i >= N) i = N - 1; if (i < 0) i = 0; bins[i]++ })
  const bmax = Math.max(...bins), pad = 3, bw = (W - 2 * pad) / N, base = H - 13
  const myBin = Math.min(N - 1, Math.max(0, Math.floor((val - min) / span * N)))
  const mx = pad + ((val - min) / span) * (W - 2 * pad)
  return (
    <svg className="mc-hist" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height }}>
      {bins.map((c, i) => { const h = c / bmax * (base - 4); return <rect key={i} x={pad + i * bw + 0.6} y={base - h} width={bw - 1.2} height={h} rx="1.5" fill={i === myBin ? SILO_COLORS[m.silo] : 'var(--grid)'} /> })}
      <line x1={mx} x2={mx} y1="2" y2={base} stroke={SILO_COLORS[m.silo]} strokeWidth="2" />
      <circle cx={mx} cy="3.5" r="3.2" fill={SILO_COLORS[m.silo]} />
      <text className="axis" x={pad} y={H - 2}>{fmt(min, 0)}</text>
      <text className="axis" x={W - pad} y={H - 2} textAnchor="end">{fmt(max, 0)}</text>
    </svg>
  )
}

function MetricCard({ m, d, peers, weight }) {
  const val = metricVal(d, m.key), p = metricPct(m.key, d, peers)
  const good = p == null ? 'var(--muted)' : (p >= 50 ? 'var(--pos)' : 'var(--neg)')
  return (
    <div className="mc">
      <div className="mc-top"><span className="mc-lab">{m.label}</span>{weight ? <span className="wt" title={`weight ×${weight}`}>×{weight}</span> : (m.scoring ? <span className="wt">✓</span> : null)}</div>
      <div className="mc-fig"><span className="mc-val">{fmtMetric(m.key, val)}</span><span className="mc-pct" style={{ color: good }}>{p == null ? '—' : Math.round(p)}</span></div>
      <MiniHist m={m} d={d} peers={peers} val={val} />
      <div className="mc-foot">{p == null ? 'no peer data' : `${p >= 50 ? 'top' : 'bottom'} ${p >= 50 ? Math.round(100 - p) : Math.round(p)}% · pctl ${Math.round(p)}`}</div>
    </div>
  )
}

export default function Profile() {
  const [sp, setSp] = useSearchParams()
  const [view, setView] = useState('players')
  const [silo, setSilo] = useState(null)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const boxRef = useRef(null)
  const team = view === 'teams'
  const universe = team ? teamEntities() : DATA

  const initial = sp.get('p')
  const [selId, setSelId] = useState(initial || null)
  useEffect(() => { if (initial) { setView('players'); setSelId(initial) } }, [initial])

  const d = useMemo(() => universe.find((x) => String(x.player_id) === String(selId)) ||
    (team ? [...universe].sort((a, b) => (b._overall ?? 0) - (a._overall ?? 0))[0]
      : DATA.filter((x) => x.top_speed != null).reduce((a, b) => (b.top_speed > a.top_speed ? b : a))), [universe, selId, team])

  const peers = team ? teamEntities() : DATA.filter((p) => p.position_group === d.position_group)
  const sPeers = samplePeers(team, teamEntities())

  function pick(id) { setSelId(id); setQ(''); setOpen(false); setSp(id ? { p: id } : {}) }
  const matches = useMemo(() => {
    const ql = q.trim().toLowerCase()
    return [...universe].sort((a, b) => a.player_name.localeCompare(b.player_name))
      .filter((x) => !ql || x.player_name.toLowerCase().includes(ql) || (x.team_short || '').toLowerCase().includes(ql)).slice(0, 40)
  }, [q, universe])

  if (!d) return null
  const ovr = team ? d._overall : positionOverall(d)

  return (
    <>
      <h1>Player card</h1>
      <p className="sub">Eight silo faces and a per-metric drill-down. Search any player or club.</p>
      <div className="card">
        <div className="row-between">
          <div className="combo" ref={boxRef}>
            <input value={open ? q : comboLabel(d)} placeholder={team ? 'Search club…' : 'Search player…'}
              onFocus={() => { setQ(''); setOpen(true) }} onChange={(e) => { setQ(e.target.value); setOpen(true) }}
              onBlur={() => setTimeout(() => setOpen(false), 150)} />
            <div className={'combo-list' + (open ? ' show' : '')}>
              {matches.map((x) => (
                <div key={x.player_id} className={'combo-row' + (String(x.player_id) === String(selId) ? ' on' : '')}
                  onMouseDown={(e) => { e.preventDefault(); pick(x.player_id) }}>
                  <Crest d={x} size={22} /><span>{comboLabel(x)}</span>
                </div>
              ))}
              {!matches.length && <div className="combo-row"><span>No match</span></div>}
            </div>
          </div>
          <ViewToggle view={view} setView={(v) => { setView(v); setSilo(null); setSelId(null) }} />
        </div>

        <div className="pf-head">
          <Crest d={d} size={44} />
          <div className="pf-headtext">
            <span className="name">{d.player_name}</span>
            <span className="meta">{team ? `${d.players} players (60+ min)` : `${d.position_group} · ${d.team_short} · ${d.matches} matches · ${fmt(d.minutes, 0)} min/match`}</span>
          </div>
        </div>

        <div className="pf-faces">
          <div className="pf-ovr"><div className="big">{ovr == null ? '—' : Math.round(ovr)}</div><div className="lbl">OVR</div></div>
          {ALL_NAMES.map((s) => {
            const v = d['silo__' + s], avail = v != null, sample = SAMPLE_NAMES.includes(s)
            return (
              <div key={s} className={'pf-face' + (sample ? ' sample' : '') + (silo === s ? ' active' : '')} role="button" tabIndex={0}
                onClick={() => setSilo(silo === s ? null : s)}>
                <div className="fv" style={{ color: avail ? SILO_COLORS[s] : 'var(--muted)' }}>{avail ? Math.round(v) : '—'}</div>
                <div className="fl">{s}{sample ? ' *' : ''}</div>
                <div className="fbar"><i style={{ width: (avail ? v : 0) + '%', background: avail ? SILO_COLORS[s] : 'var(--grid)' }} /></div>
              </div>
            )
          })}
        </div>

        {!silo ? (
          <>
            <p className="caption">Percentile vs peers for each scoring metric. Click a silo face to deconstruct it.</p>
            {ALL_NAMES.map((s) => (
              <div key={s}>
                <div className="pf-group"><span><span style={{ color: SILO_COLORS[s] }}>■</span> {s}{SAMPLE_NAMES.includes(s) ? ' 10-match' : ''}</span>
                  <span className="pf-siloscore" style={{ color: d['silo__' + s] == null ? 'var(--muted)' : SILO_COLORS[s] }}>{d['silo__' + s] == null ? '—' : Math.round(d['silo__' + s])}</span></div>
                {METRICS.filter((m) => m.silo === s && m.scoring).map((m) => {
                  const p = metricPct(m.key, d, m.src === 'sample' ? sPeers : peers)
                  const above = p >= 50, half = p == null ? 0 : Math.abs(p - 50)
                  return (
                    <div className="pf-row" key={m.key}>
                      <div className="pf-lab">{m.label}</div>
                      <div className="pf-track"><div className="pf-mid" />{p != null && <div className="pf-fill" style={{ background: above ? 'var(--pos)' : 'var(--neg)', width: half + '%', left: above ? '50%' : (50 - half) + '%' }} />}</div>
                      <div className="pf-val" style={{ color: p == null ? 'var(--muted)' : above ? 'var(--pos)' : 'var(--neg)' }}>{p == null ? '—' : Math.round(p)}</div>
                    </div>
                  )
                })}
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="dd-head">
              <div style={{ fontSize: 14, color: 'var(--ink-2)' }}><span style={{ color: SILO_COLORS[silo] }}>■</span> Deconstructing <b style={{ color: SILO_COLORS[silo] }}>{silo}</b> · silo score <b style={{ color: SILO_COLORS[silo] }}>{d['silo__' + silo] == null ? '—' : Math.round(d['silo__' + silo])}</b></div>
              <button className="toolbtn" onClick={() => setSilo(null)}>← all silos</button>
            </div>
            <div className="sm-grid">
              {METRICS.filter((m) => m.silo === silo).slice().sort((a, b) => (b.scoring ? 1 : 0) - (a.scoring ? 1 : 0)).map((m) => (
                <MetricCard key={m.key} m={m} d={d} peers={m.src === 'sample' ? sPeers : peers} weight={ALL_SILOS[silo][m.key]} />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}
