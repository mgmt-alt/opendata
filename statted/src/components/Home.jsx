import { Link } from 'react-router-dom'
import { DATA, META } from '../lib/data.js'
import { RUN_FAMILIES } from '../lib/constants.js'
import { fmt } from '../lib/scoring.js'
import { GlyphKey } from './Glyph.jsx'
import VectorField from './VectorField.jsx'
import Colophon from './Colophon.jsx'

const CONTENTS = [
  ['/runs', 'Runs', 'The vocabulary of movement — how the busiest players split their off-ball runs across the six families.'],
  ['/leaderboard', 'The Rating', 'One 0–100 score per player across eight silos, re-weightable by role or by archetype.'],
  ['/explorer', 'Explore', 'Plot any metric against any other. One dot per player, coloured by position.'],
  ['/athletic', 'Athletic', 'Peak sprint speed against work rate — the fast and the relentless, top-right.'],
  ['/passing', 'Passing', 'Volume against security, coloured by over- and under-performance versus xPass.'],
  ['/shooting', 'Shooting', 'The season’s busiest shot-takers over the ten fully tracked matches.'],
  ['/heatmaps', 'Territory', 'Where a player operates — touches, defending and runs, as pitch density.'],
  ['/profile', 'Player card', 'Eight silo faces and a per-metric drill-down for any player or club.'],
  ['/compare', 'Compare', 'Two players — or two clubs — across every silo, on one radar.'],
]

const bestBy = (key, dir = 1) =>
  DATA.filter((d) => d[key] != null).reduce((a, b) => (dir * (b[key] - a[key]) > 0 ? b : a), DATA.find((d) => d[key] != null))
const totalRuns = (d) => RUN_FAMILIES.reduce((s, f) => s + (d['run__' + f.key] || 0), 0)

export default function Home() {
  const fastest = bestBy('top_speed')
  const engine = bestBy('distance')
  const breaker = bestBy('linebreaks')
  const mover = DATA.filter((d) => d.runs != null).reduce((a, b) => (totalRuns(b) > totalRuns(a) ? b : a))
  const comp = META.competition?.replace('AUS - ', '') || 'A-League'

  const callouts = [
    { k: 'Fastest', v: fmt(fastest.top_speed, 1), u: 'km/h', who: fastest.player_short_name, sub: 'peak sprint (PSV99)' },
    { k: 'Biggest engine', v: fmt(engine.distance / 1000, 1), u: 'km', who: engine.player_short_name, sub: 'distance / match' },
    { k: 'Most off-ball runs', v: fmt(totalRuns(mover), 0), u: '/30', who: mover.player_short_name, sub: 'runs per 30 in poss.' },
    { k: 'Sharpest line-breaker', v: fmt(breaker.linebreaks, 1), u: '/30', who: breaker.player_short_name, sub: 'line-breaking passes' },
  ]

  return (
    <>
      <div className="wrap">
        <section className="hero">
          <VectorField height={560} />
          <div className="hero-inner">
            <div className="eyebrow">{comp} · {META.season} · an atlas of movement</div>
            <h1 className="title">STATTED<span className="l2">IN MOTION.</span></h1>
            <p className="lede">
              A season read through the shape of its tracking data. Not a dashboard with football
              inside it — the pitch and the six ways players move without the ball <em>are</em> the
              design. Built on {META.n_players} players of SkillCorner open broadcast tracking.
            </p>
            <div className="metaline">
              <span><b>{META.n_players}</b> players</span>
              <span><b>{META.n_teams}</b> clubs</span>
              <span><b>10</b> tracked matches</span>
              <span><b>84</b> metrics</span>
              <span><b>6</b> run families</span>
            </div>
          </div>
        </section>

        <div className="callouts">
          {callouts.map((c) => (
            <div className="callout" key={c.k}>
              <div className="k">{c.k}</div>
              <div className="v">{c.v}<u>{c.u}</u></div>
              <div className="w"><b>{c.who}</b> · {c.sub}</div>
            </div>
          ))}
        </div>

        <section style={{ marginTop: 44 }}>
          <div className="section-head"><span className="no">§ 01</span><h2>The vocabulary of movement</h2></div>
          <p className="sub" style={{ marginBottom: 18 }}>
            Every off-ball run in the data is classified into one of six families. They are this
            atlas's alphabet — each a direction on the pitch, a hue, and a job. Read them left to
            right; the ball attacks that way too.
          </p>
          <GlyphKey />
          <p className="caption">Angles are schematic — the pitch attacks left → right. Run counts throughout are per 30 minutes in possession, so high- and low-possession players compare fairly.</p>
        </section>

        <section className="contents" style={{ marginTop: 52 }}>
          <div className="section-head"><span className="no">§ 02</span><h2>Contents</h2></div>
          {CONTENTS.map(([to, title, desc], i) => (
            <Link className="idx" to={to} key={to}>
              <span className="no">{String(i + 1).padStart(2, '0')}</span>
              <span><span className="ti">{title}</span><span className="de">{desc}</span></span>
              <span className="arw">→</span>
            </Link>
          ))}
        </section>

        <Colophon />
      </div>
    </>
  )
}
