import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { teamEntities } from '../lib/scoring.js'
import { useFilteredPlayers } from '../lib/store.jsx'
import FilterBar from './FilterBar.jsx'
import ViewToggle from './ViewToggle.jsx'
import Crest from './Crest.jsx'
import PageHead from './PageHead.jsx'

// Top shot-takers over the 10 tracked matches (shots, with goals highlighted).
export default function Shooting() {
  const players = useFilteredPlayers()
  const [view, setView] = useState('players')
  const navigate = useNavigate()
  const team = view === 'teams'
  const rows = (team ? teamEntities() : players).filter((d) => d.shot)
    .sort((a, b) => b.shot.shots - a.shot.shots || b.shot.goals - a.shot.goals)
    .slice(0, team ? 13 : 18)
  const max = rows.length ? rows[0].shot.shots || 1 : 1

  return (
    <>
      <PageHead no="06" kicker="Shooting" tag="10-match sample"
        title="Who <em>shoots</em>"
        sub="Shot volume across the ten tracked matches, goals highlighted. There is no xG in the open data — this is volume and goals only." />
      <FilterBar />
      <div className="card">
        <div className="row-between">
          <div className="legend">
            <span className="item"><span className="swatch" style={{ background: 'var(--c1)' }} />Shots</span>
            <span className="item"><span className="swatch" style={{ background: 'var(--good)' }} />Goals</span>
          </div>
          <ViewToggle view={view} setView={setView} />
        </div>
        {rows.map((d) => {
          const sh = d.shot, ng = Math.max(0, sh.shots - sh.goals)
          return (
            <div className="bar-row" key={d.player_id} style={{ cursor: team ? 'default' : 'pointer' }} onClick={() => !team && navigate('/profile?p=' + d.player_id)}>
              <div className="bar-name"><Crest d={d} size={24} /><span>{d.player_short_name}</span></div>
              <div className="bar-track">
                {ng > 0 && <div className="bar-seg" style={{ width: (ng / max * 100) + '%', background: 'var(--c1)' }} />}
                {sh.goals > 0 && <div className="bar-seg" style={{ width: (sh.goals / max * 100) + '%', background: 'var(--good)' }} />}
              </div>
              <div className="bar-val">{sh.shots}{sh.goals ? <span className="g"> · {sh.goals}G</span> : ''}</div>
            </div>
          )
        })}
        <p className="caption">Goals = shots whose possession led to a goal. “Apps” elsewhere = tracked matches the player featured in.</p>
      </div>
    </>
  )
}
