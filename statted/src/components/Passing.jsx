import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { teamEntities, fmt } from '../lib/scoring.js'
import { useFilteredPlayers } from '../lib/store.jsx'
import FilterBar from './FilterBar.jsx'
import ViewToggle from './ViewToggle.jsx'
import Scatter from './Scatter.jsx'
import PageHead from './PageHead.jsx'

// Pass volume vs completion, coloured by over/under-performance against xPass.
export default function Passing() {
  const players = useFilteredPlayers()
  const [view, setView] = useState('players')
  const navigate = useNavigate()
  const team = view === 'teams'
  const rows = (team ? teamEntities() : players).filter((d) => d.pass_vol != null && d.pass_pct != null)
  const fill = (d) => {
    const o = d.pass_over
    if (o == null) return 'var(--muted)'
    return o > 1 ? 'var(--pos)' : o < -1 ? 'var(--neg)' : 'var(--axis)'
  }
  return (
    <>
      <PageHead no="05" kicker="Passing"
        title="Volume, security &amp; <em>risk</em>"
        sub="Pass volume against completion rate. Blue completes more than expected given difficulty (xPass); red completes fewer." />
      <FilterBar />
      <div className="card">
        <div className="row-between">
          <div className="legend">
            <span className="item">vs xPass:</span>
            <span className="item"><span className="swatch" style={{ background: 'var(--neg)' }} />below</span>
            <span className="item"><span className="swatch" style={{ background: 'var(--axis)' }} />as expected</span>
            <span className="item"><span className="swatch" style={{ background: 'var(--pos)' }} />above</span>
          </div>
          <ViewToggle view={view} setView={setView} />
        </div>
        <Scatter rows={rows} x={(d) => d.pass_vol} y={(d) => d.pass_pct}
          xlab="Passes / 30 in possession →" ylab="Completion % →" fill={fill}
          label={(rs) => [...rs].sort((a, b) => b.pass_vol - a.pass_vol).slice(0, 5)}
          onClick={(d) => !team && navigate('/profile?p=' + d.player_id)}
          tip={(d) => `<b>${d.player_short_name}</b><div class="pos">${team ? d.players + ' players' : d.position_group + ' · ' + d.team_short}</div>
            <div class="r"><span>Volume /30</span><b>${fmt(d.pass_vol)}</b></div>
            <div class="r"><span>Completion</span><b>${fmt(d.pass_pct)}%</b></div>
            <div class="r"><span>vs xPass</span><b>${d.pass_over > 0 ? '+' : ''}${fmt(d.pass_over)}</b></div>`} />
        <p className="caption">The xPass bar is SkillCorner's model of how likely each pass was to be completed.</p>
      </div>
    </>
  )
}
