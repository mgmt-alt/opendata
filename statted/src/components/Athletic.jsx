import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { META } from '../lib/data.js'
import { POS_COLOR } from '../lib/constants.js'
import { teamEntities, fmt } from '../lib/scoring.js'
import { useFilteredPlayers } from '../lib/store.jsx'
import FilterBar from './FilterBar.jsx'
import ViewToggle from './ViewToggle.jsx'
import Scatter from './Scatter.jsx'

// Peak sprint speed vs work rate — top-right players are fast AND relentless.
export default function Athletic() {
  const players = useFilteredPlayers()
  const [view, setView] = useState('players')
  const navigate = useNavigate()
  const team = view === 'teams'
  const rows = (team ? teamEntities() : players).filter((d) => d.top_speed != null && d.m_per_min != null)
  return (
    <>
      <h1>The athletic map</h1>
      <p className="sub">Peak sprint speed (PSV99) against work rate (metres per minute). Top-right = fast and relentless.</p>
      <FilterBar />
      <div className="card">
        <div className="row-between">
          <div className="legend">
            {!team ? META.positions.map((p) => <span className="item" key={p}><span className="swatch" style={{ background: POS_COLOR[p] }} />{p}</span>)
              : <span className="item">Each dot = one club</span>}
          </div>
          <ViewToggle view={view} setView={setView} />
        </div>
        <Scatter rows={rows} x={(d) => d.top_speed} y={(d) => d.m_per_min}
          xlab="Peak sprint speed (km/h) →" ylab="Work rate (m / min) →"
          fill={(d) => (team ? 'var(--series-1)' : (POS_COLOR[d.position_group] || 'var(--series-1)'))}
          label={(rs) => [...rs].sort((a, b) => (b.top_speed + b.m_per_min / 10) - (a.top_speed + a.m_per_min / 10)).slice(0, 6)}
          onClick={(d) => !team && navigate('/profile?p=' + d.player_id)}
          tip={(d) => `<b>${d.player_short_name}</b><div class="pos">${team ? d.players + ' players' : d.position_group + ' · ' + d.team_short}</div>
            <div class="r"><span>Peak speed</span><b>${fmt(d.top_speed)} km/h</b></div>
            <div class="r"><span>Work rate</span><b>${fmt(d.m_per_min)} m/min</b></div>
            <div class="r"><span>Distance</span><b>${fmt(d.distance / 1000, 1)} km</b></div>`} />
        <p className="caption">Peak sprint speed = PSV99 (99th-percentile of a player's short-window speeds), in km/h.</p>
      </div>
    </>
  )
}
