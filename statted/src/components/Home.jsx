import { Link } from 'react-router-dom'
import { DATA, META } from '../lib/data.js'
import { RUN_FAMILIES } from '../lib/constants.js'
import { GlyphKey } from './Glyph.jsx'
import { Reveal, Tally } from './Motion.jsx'
import Colophon from './Colophon.jsx'

const CONTENTS = [
  ['/runs', 'Runs', 'The vocabulary of movement — how the busiest players split their off-ball runs across the six families.'],
  ['/leaderboard', 'The Rating', 'One 0–100 score per player across eight silos, re-weightable by role or by archetype.'],
  ['/explorer', 'Explore', 'Plot any metric against any other. One dot per player, coloured by position.'],
  ['/athletic', 'Athletic', 'Peak sprint speed against work rate — the fast and the relentless, together.'],
  ['/passing', 'Passing', 'Volume against security, coloured by over- and under-performance versus xPass.'],
  ['/shooting', 'Shooting', 'The season’s busiest shot-takers over the ten fully tracked matches.'],
  ['/heatmaps', 'Territory', 'Where a player operates — touches, defending and runs, as pitch density.'],
  ['/profile', 'Player card', 'Eight silo faces and a per-metric drill-down for any player or club.'],
  ['/compare', 'Compare', 'Two players — or two clubs — across every silo, on one plate.'],
]

const bestBy = (key) => DATA.filter((d) => d[key] != null).reduce((a, b) => (b[key] > a[key] ? b : a))
const totalRuns = (d) => RUN_FAMILIES.reduce((s, f) => s + (d['run__' + f.key] || 0), 0)

export default function Home() {
  const fastest = bestBy('top_speed')
  const engine = bestBy('distance')
  const breaker = bestBy('linebreaks')
  const mover = DATA.filter((d) => d.runs != null).reduce((a, b) => (totalRuns(b) > totalRuns(a) ? b : a))
  const comp = META.competition?.replace('AUS - ', '') || 'A-League'

  const numbers = [
    { k: 'Fastest', v: fastest.top_speed, dp: 1, u: 'km/h', who: fastest.player_short_name, sub: 'peak sprint, PSV99' },
    { k: 'Biggest engine', v: engine.distance / 1000, dp: 1, u: 'km', who: engine.player_short_name, sub: 'distance per match' },
    { k: 'Most off-ball runs', v: totalRuns(mover), dp: 0, u: 'per 30', who: mover.player_short_name, sub: 'in possession' },
    { k: 'Line-breaker', v: breaker.linebreaks, dp: 1, u: 'per 30', who: breaker.player_short_name, sub: 'line-breaking passes' },
  ]

  return (
    <div className="wrap">
      {/* COVER */}
      <header className="nameplate">
        <Reveal className="kick">An Atlas of Movement</Reveal>
        <Reveal as="h1" className="title" delay={1}>stat<i>ted</i></Reveal>
      </header>
      <Reveal><hr className="rule-d" /></Reveal>
      <Reveal as="p" className="dateline">
        <span>The <b>{comp}</b></span><span>Season <b>{META.season}</b></span>
        <span><b>In Numbers</b></span><span>Vol. <b>I</b></span>
      </Reveal>
      <Reveal><hr className="rule-d" /></Reveal>

      <Reveal as="div" className="standfirst">
        <p>
          A whole season read through the shape of its tracking data. This is not a dashboard with
          football poured into it — the pitch, and the six ways a player moves without the ball, <em>are</em>
          the design. Every figure here is drawn from {META.n_players} players of {META.n_teams} clubs, captured by
          SkillCorner’s open broadcast tracking and set, like an old sporting annual, in ink on paper.
        </p>
        <p>
          Begin with the vocabulary of movement overleaf; then the rating, the maps, and the plates that
          follow. Where the data is thin, the pages say so — an honest annual keeps its footnotes in view.
        </p>
      </Reveal>

      {/* THE SEASON IN NUMBERS */}
      <Reveal as="div" className="numbers" style={{ marginTop: 36 }}>
        {numbers.map((c) => (
          <div className="cell" key={c.k}>
            <div className="k">{c.k}</div>
            <div className="v"><Tally value={c.v} decimals={c.dp} /><u>{c.u}</u></div>
            <div className="w"><b>{c.who}</b> · {c.sub}</div>
          </div>
        ))}
      </Reveal>

      {/* PLATE I — the run families */}
      <section style={{ marginTop: 56 }}>
        <Reveal as="div" className="eyebrow"><span className="fol">Plate I</span> The vocabulary of movement</Reveal>
        <Reveal as="h2" className="em" style={{ fontFamily: 'var(--serif)', fontWeight: 800, fontSize: 'clamp(24px,3.4vw,36px)', letterSpacing: '-.02em', margin: '10px 0 6px', color: 'var(--ink)' }}>
          Six ways to move without the ball
        </Reveal>
        <Reveal as="p" className="sub" style={{ marginBottom: 20 }}>
          Every off-ball run is classified into one of six families — each a direction on the pitch, an ink,
          and a job. They are this atlas’s alphabet. Read them the way the ball attacks: left to right.
        </Reveal>
        <Reveal><GlyphKey /></Reveal>
        <p className="caption">Angles are schematic. Run counts throughout are per 30 minutes in possession, so high- and low-possession players compare fairly.</p>
      </section>

      {/* CONTENTS */}
      <section className="contents" style={{ marginTop: 60 }}>
        <Reveal as="div" className="eyebrow" style={{ marginBottom: 6 }}><span className="fol">Contents</span> The plates</Reveal>
        <div className="toc">
          {CONTENTS.map(([to, title, desc], i) => (
            <Reveal key={to}>
              <Link className="toc-row" to={to}>
                <span className="toc-line">
                  <span className="fol">{String(i + 1).padStart(2, '0')}</span>
                  <span className="ti">{title}</span>
                  <span className="dots" />
                  <span className="pg">turn →</span>
                </span>
                <span className="toc-de">{desc}</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <Colophon />
    </div>
  )
}
