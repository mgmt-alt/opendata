import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { META } from '../lib/data.js'
import { teamEntities, fmt } from '../lib/scoring.js'
import { useFilteredPlayers } from '../lib/store.jsx'
import FilterBar from './FilterBar.jsx'
import ViewToggle from './ViewToggle.jsx'
import Crest from './Crest.jsx'
import { showTip, moveTip, hideTip } from '../lib/tip.js'

const RUN_COLORS = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)']

// The most active off-ball runners and the make-up of their runs across families.
export default function RunMix() {
  const players = useFilteredPlayers()
  const [view, setView] = useState('players')
  const navigate = useNavigate()
  const team = view === 'teams'
  const fams = META.run_families
  const rows = (team ? teamEntities() : players).filter((d) => d.runs != null)
    .sort((a, b) => b.runs - a.runs).slice(0, team ? 13 : 14)
  const max = Math.max(1, ...rows.map((d) => fams.reduce((s, f) => s + (d['run__' + f] || 0), 0)))

  return (
    <>
      <h1>How the top runners move</h1>
      <p className="sub">The most active off-ball runners (per 30 min in possession) and the make-up of their runs across six movement families.</p>
      <FilterBar />
      <div className="card">
        <div className="row-between">
          <div className="legend">
            {fams.map((f, i) => <span className="item" key={f}><span className="swatch" style={{ background: RUN_COLORS[i % RUN_COLORS.length] }} />{f}</span>)}
          </div>
          <ViewToggle view={view} setView={setView} />
        </div>
        {rows.map((d) => {
          const total = fams.reduce((s, f) => s + (d['run__' + f] || 0), 0)
          return (
            <div className="bar-row" key={d.player_id} style={{ cursor: team ? 'default' : 'pointer' }} onClick={() => !team && navigate('/profile?p=' + d.player_id)}>
              <div className="bar-name"><Crest d={d} size={24} /><span>{d.player_short_name}</span></div>
              <div className="bar-track">
                {fams.map((f, i) => {
                  const v = d['run__' + f] || 0; if (v <= 0) return null
                  return <div key={f} className="bar-seg" style={{ width: (v / max * 100) + '%', background: RUN_COLORS[i % RUN_COLORS.length] }}
                    onMouseEnter={(e) => showTip(`<b>${d.player_short_name}</b><div class="pos">${f}</div><div class="r"><span>Runs /30</span><b>${fmt(v)}</b></div>`, e)}
                    onMouseMove={moveTip} onMouseLeave={hideTip} />
                })}
              </div>
              <div className="bar-val">{fmt(total)}</div>
            </div>
          )
        })}
        <p className="caption">Runs are per 30 minutes in possession, so high- and low-possession players compare fairly.</p>
      </div>
    </>
  )
}
