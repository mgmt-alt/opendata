import { META } from '../lib/data.js'

// The colophon keeps the data provenance and the honest limits of the source
// visible on every page — a requirement of the project, and good editorial form.
export default function Colophon() {
  return (
    <footer className="colophon">
      <div className="colo-grid">
        <div>
          <div className="colo-brand">stat<i>ted</i></div>
          <p style={{ marginTop: 10 }}>
            An atlas of movement in the {META.competition?.replace('AUS - ', '') || 'A-League'},
            season {META.season}. Built entirely on the shape of the tracking data — the six
            off-ball run families are the visual language, not decoration on a dashboard.
          </p>
        </div>
        <div>
          <h4>Source</h4>
          <p>
            <a href="https://skillcorner.com" target="_blank" rel="noreferrer">SkillCorner</a> ×{' '}
            <a href="https://pysport.org" target="_blank" rel="noreferrer">PySport</a> open
            broadcast-tracking data. {META.n_players} players (60+ min), {META.n_teams} clubs,
            and 10 fully tracked matches.
          </p>
          <p>Club badges are drawn stand-ins — official crests are trademarked and no photos exist in the open data.</p>
        </div>
        <div>
          <h4>Honest limits</h4>
          <ul>
            <li>Two data tiers: Pace, Physical, Passing, Creation &amp; Movement are full-season; Shooting, Defending &amp; Dribbling come only from the 10 tracked matches (a small sample — 1–4 apps/player).</li>
            <li>≈97% tracking-ID accuracy; no per-shot xG or on-target flag.</li>
            <li>Broadcast tracking is possession-centric, so a centre-back's positional defending is under-measured.</li>
          </ul>
        </div>
      </div>
    </footer>
  )
}
