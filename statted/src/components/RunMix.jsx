import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RUN_FAMILIES } from '../lib/constants.js'
import { teamEntities, fmt } from '../lib/scoring.js'
import { useFilteredPlayers } from '../lib/store.jsx'
import FilterBar from './FilterBar.jsx'
import ViewToggle from './ViewToggle.jsx'
import PageHead from './PageHead.jsx'
import { RunGlyph, GlyphKey } from './Glyph.jsx'
import { showTip, moveTip, hideTip } from '../lib/tip.js'

// The signature page: the most active off-ball runners, each row a spectrum of the
// six run families. A glyph marks each player's dominant family — the shape of how
// they move.
export default function RunMix() {
  const players = useFilteredPlayers()
  const [view, setView] = useState('players')
  const navigate = useNavigate()
  const team = view === 'teams'
  const rows = (team ? teamEntities() : players).filter((d) => d.runs != null)
    .map((d) => ({ d, total: RUN_FAMILIES.reduce((s, f) => s + (d['run__' + f.key] || 0), 0) }))
    .sort((a, b) => b.total - a.total).slice(0, team ? 13 : 16)
  const max = Math.max(1, ...rows.map((r) => r.total))
  const dominant = (d) => RUN_FAMILIES.reduce((best, f) => ((d['run__' + f.key] || 0) > (d['run__' + best.key] || 0) ? f : best), RUN_FAMILIES[0])

  return (
    <>
      <PageHead no="01" kicker="The vocabulary of movement"
        title="How the top runners <em>move</em>"
        sub="The season's busiest off-ball runners, each row broken into the six run families. The leading glyph is the player's dominant family — the shape of how they get free." />
      <FilterBar />

      <div className="card plain" style={{ paddingBottom: 8 }}>
        <div className="section-head" style={{ marginTop: 0 }}><span className="no">KEY</span><h2 style={{ fontSize: 16 }}>Six ways to move without the ball</h2></div>
        <GlyphKey compact />
      </div>

      <div className="card">
        <div className="row-between">
          <div className="legend">
            {RUN_FAMILIES.map((f) => (
              <span className="item" key={f.key}><span className="swatch" style={{ background: `var(${f.cvar})` }} />{f.short}</span>
            ))}
          </div>
          <ViewToggle view={view} setView={setView} />
        </div>
        {rows.map(({ d, total }, i) => {
          const dom = dominant(d)
          return (
            <div className="rm-row" key={d.player_id} style={{ cursor: team ? 'default' : 'pointer' }}
              onClick={() => !team && navigate('/profile?p=' + d.player_id)}>
              <div className="lb-rank">{i + 1}</div>
              <div className="rm-name">
                <RunGlyph family={dom} size={26} title={`Dominant: ${dom.key}`} />
                <div className="lb-nametext">
                  <span className="n">{d.player_short_name}</span>
                  <span className="m">{team ? `${d.players} players` : `${d.position_group} · ${d.team_short}`}</span>
                </div>
              </div>
              <div className="rm-track">
                {RUN_FAMILIES.map((f) => {
                  const v = d['run__' + f.key] || 0; if (v <= 0) return null
                  return <div key={f.key} className="rm-seg" style={{ width: (v / max * 100) + '%', background: `var(${f.cvar})` }}
                    onMouseEnter={(e) => showTip(`<b>${d.player_short_name}</b><div class="pos">${f.key} · ${f.note}</div><div class="r"><span>Runs /30</span><b>${fmt(v)}</b></div>`, e)}
                    onMouseMove={moveTip} onMouseLeave={hideTip} />
                })}
              </div>
              <div className="rm-val">{fmt(total)}</div>
            </div>
          )
        })}
        <p className="caption">Runs per 30 minutes in possession. Bar width is the total across families, normalised to the busiest {team ? 'club' : 'runner'}. Click a row for the full player card.</p>
      </div>
    </>
  )
}
