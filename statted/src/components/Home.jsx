import { Link } from 'react-router-dom'
import { DATA, META } from '../lib/data.js'
import { fmt } from '../lib/scoring.js'

const CARDS = [
  ['/leaderboard', 'Leaderboard', 'A FIFA-style 0–100 rating across eight silos, re-weightable by role or archetype.'],
  ['/explorer', 'Scatter explorer', 'Plot any metric against any other, one dot per player, coloured by position.'],
  ['/profile', 'Player card', 'Eight silo faces and a per-metric drill-down for any player or club.'],
  ['/compare', 'Compare', 'Two players (or clubs) across every silo on a radar.'],
  ['/heatmaps', 'Heat-maps', 'Where a player operates — touches, defending and runs (10-match sample).'],
]

export default function Home() {
  const fastest = DATA.filter((d) => d.top_speed != null).reduce((a, b) => (b.top_speed > a.top_speed ? b : a))
  const avgKm = DATA.reduce((s, d) => s + (d.distance || 0), 0) / DATA.length / 1000
  const tiles = [
    [META.n_players, 'Players profiled', '60+ min'],
    [META.n_teams, 'A-League clubs', ''],
    ['10', 'Fully tracked matches', ''],
    [fmt(fastest.top_speed, 1), 'Fastest — ' + fastest.player_short_name, 'km/h'],
    [fmt(avgKm, 1), 'Avg distance / match', 'km'],
  ]
  return (
    <>
      <h1>{META.competition?.replace('AUS - ', '') || 'A-League'} · {META.season}</h1>
      <p className="sub">Player &amp; team analytics built on SkillCorner open broadcast-tracking data.</p>
      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14 }}>
          {tiles.map(([v, l, u]) => (
            <div key={l}>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{v} {u && <span style={{ fontSize: 13, color: 'var(--muted)' }}>{u}</span>}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14 }}>
        {CARDS.map(([to, title, desc]) => (
          <Link key={to} to={to} className="card" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{title} →</div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{desc}</div>
          </Link>
        ))}
      </div>
      <p className="caption">Data: SkillCorner × PySport open data. Club badges are drawn stand-ins (no photos in the open data).</p>
    </>
  )
}
