import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFilteredPlayers } from '../lib/store.jsx'
import { ALL_NAMES, SAMPLE_NAMES, SEASON_NAMES, SILO_COLORS, LB_MODES, balanced } from '../lib/constants.js'
import { overall, siloContribs, siloVal, fmt } from '../lib/scoring.js'
import { teamEntities } from '../lib/scoring.js'
import FilterBar from './FilterBar.jsx'
import ViewToggle from './ViewToggle.jsx'
import Crest from './Crest.jsx'
import { showTip, moveTip, hideTip } from '../lib/tip.js'

export default function Leaderboard() {
  const players = useFilteredPlayers()
  const [view, setView] = useState('players')
  const [preset, setPreset] = useState('By position')
  const [customW, setCustomW] = useState(() => balanced())
  const [limit, setLimit] = useState(15)
  const navigate = useNavigate()

  const mode = preset === 'By position' ? 'role' : 'custom'
  const pool = view === 'teams' ? teamEntities() : players

  const rows = useMemo(() => {
    const elig = pool.filter((d) => ALL_NAMES.every((s) => d['silo__' + s] != null))
    elig.forEach((d) => { d._score = overall(d, mode, customW) })
    return elig.slice().sort((a, b) => b._score - a._score)
  }, [pool, mode, customW])

  const team = view === 'teams'
  const shown = team ? rows : rows.slice(0, limit)
  const maxS = shown.length ? shown[0]._score : 100

  function pickPreset(name) {
    setPreset(name); setLimit(15)
    if (LB_MODES[name]) { const w = balanced(); ALL_NAMES.forEach((s) => (w[s] = LB_MODES[name][s] ?? 0)); setCustomW(w) }
  }
  function setW(s, v) { setPreset('Custom'); setCustomW((p) => ({ ...p, [s]: v })) }

  const sumW = ALL_NAMES.reduce((a, s) => a + (customW[s] || 0), 0) || 1

  return (
    <>
      <h1>The Statted Score</h1>
      <p className="sub">One 0–100 rating per player across eight silos — re-weight by role or archetype.</p>
      <FilterBar />
      <div className="card">
        <div className="row-between"><ViewToggle view={view} setView={setView} /></div>
        <div className="presets">
          {Object.keys(LB_MODES).map((name) => (
            <button key={name} className={'pill' + (preset === name ? ' active' : '')} onClick={() => pickPreset(name)}>{name}</button>
          ))}
        </div>
        <div className={'weights' + (mode === 'role' ? ' dim' : '')}>
          {ALL_NAMES.map((s) => (
            <div className="wrow" key={s}>
              <div className="top">
                <span><span className="swatch" style={{ background: SILO_COLORS[s], display: 'inline-block', marginRight: 6 }} />{s}{SAMPLE_NAMES.includes(s) ? ' *' : ''}</span>
                <span style={{ color: 'var(--muted)' }}>{Math.round((customW[s] || 0) / sumW * 100)}%</span>
              </div>
              <input type="range" min="0" max="100" value={(customW[s] ?? 1) * 10}
                onChange={(e) => setW(s, (+e.target.value / 10) || 0.0001)} style={{ width: '100%' }} />
            </div>
          ))}
        </div>
        <div className="legend">
          {ALL_NAMES.map((s) => (
            <span className="item" key={s}><span className="swatch" style={{ background: SILO_COLORS[s] }} />{s}{SAMPLE_NAMES.includes(s) ? ' *' : ''}</span>
          ))}
          <span className="item" style={{ color: 'var(--muted)' }}>* 10-match sample · bar = weighted contribution</span>
        </div>

        <div className="lb-row head">
          <div className="lb-rank">#</div><div>{team ? 'Team' : 'Player'}</div>
          <div>{ALL_NAMES.join(' · ')}</div><div className="lb-score">OVR</div>
        </div>
        {shown.map((d, i) => {
          const c = siloContribs(d, mode, customW)
          return (
            <div className="lb-row" key={d.player_id} onClick={() => !team && navigate('/profile?p=' + d.player_id)}>
              <div className="lb-rank">{i + 1}</div>
              <div className="lb-name">
                <Crest d={d} size={32} />
                <div className="lb-nametext">
                  <div className="n">{d.player_short_name}</div>
                  <div className="m">{team ? `${d.players} players` : `${d.position_group} · ${d.team_short} · ${d.matches} matches`}</div>
                </div>
              </div>
              <div className="lb-bar">
                {ALL_NAMES.map((s) => {
                  const part = c[s] || 0; if (part <= 0) return null
                  return <div key={s} className="lb-seg" style={{ width: (part / maxS * 100) + '%', background: SILO_COLORS[s] }}
                    onMouseEnter={(e) => showTip(`<b>${d.player_short_name}</b><div class="pos">${s} silo${SAMPLE_NAMES.includes(s) ? ' · 10-match' : ''} · ${mode === 'role' ? 'vs position' : 'league-wide'}</div><div class="r"><span>Silo</span><b>${fmt(siloVal(d, s, mode), 0)}</b></div>`, e)}
                    onMouseMove={moveTip} onMouseLeave={hideTip} />
                })}
              </div>
              <div className="lb-score">{fmt(d._score, 1)}</div>
            </div>
          )
        })}
        <div className="more">
          {!team && limit < rows.length && <button className="toolbtn" onClick={() => setLimit((l) => l + 15)}>Show more ({rows.length - limit})</button>}
        </div>
        <p className="caption">
          {team ? `Ranking ${rows.length} clubs (squad averages). ` : `Ranking ${rows.length} players in the 10-match sample. `}
          {mode === 'role' ? 'Silos percentiled within position (role-fit), combined by position weights.' : 'Silos percentiled league-wide (absolute) so a custom mix compares everyone on one scale.'}
        </p>
      </div>
    </>
  )
}
