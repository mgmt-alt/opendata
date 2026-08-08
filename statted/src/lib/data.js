// Loads the embedded JSON, merges the 10-match sample onto each player, builds the sample
// composites, and computes both percentile bases (within-position + league-wide) per silo.
// Everything the components need is derived once here and exported.
import season from '../data/season_players.json'
import sample from '../data/sample_events.json'
import { SEASON_SILOS, SAMPLE_SILOS, ALL_SILOS, ALL_NAMES } from './constants.js'

export const META = season.meta
export const METRICS = META.metrics
export const METRIC_BY_KEY = Object.fromEntries(METRICS.map((m) => [m.key, m]))
export const SAMPLE_META = sample.meta
const SAMPLE = sample.players
export const DATA = season.players

// merge the sample block onto each player
DATA.forEach((d) => { d.shot = SAMPLE[d.player_id] || null })

// sample composites (identical to the dashboard): Shooting/Dribbling volume totals,
// Defending a per-appearance rate of last-line actions.
DATA.forEach((d) => {
  const sh = d.shot
  d.shotval_total = sh ? sh.shots + 3 * sh.goals : null
  d.defval_total = sh ? (2 * (sh.clearances || 0) + 3 * (sh.danger_prevented || 0) + 0.5 * sh.regains) / (sh.apps || 1) : null
  d.dribval_total = sh ? sh.takeons : null
})

// Weibull plotting-position percentile
function pctIn(sortedVals, v) {
  if (v == null || !sortedVals.length) return null
  const lo = sortedVals.indexOf(v), hi = sortedVals.lastIndexOf(v)
  return ((lo + hi) / 2 + 1) / (sortedVals.length + 1) * 100
}

// two bases for every silo: within position (silo__) and league-wide (siloL__)
;(function computeScores() {
  const byPos = {}
  DATA.forEach((d) => { (byPos[d.position_group] ||= []).push(d) })
  const metricKeys = [...new Set(Object.values(ALL_SILOS).flatMap((o) => Object.keys(o)))]
  metricKeys.forEach((m) => {
    const leagueVals = DATA.map((r) => r[m]).filter((v) => v != null).sort((a, b) => a - b)
    DATA.forEach((r) => { r['pctL__' + m] = pctIn(leagueVals, r[m]) })
    for (const pos in byPos) {
      const rows = byPos[pos]
      const pv = rows.map((r) => r[m]).filter((v) => v != null).sort((a, b) => a - b)
      rows.forEach((r) => { r['pctW__' + m] = pctIn(pv, r[m]) })
    }
  })
  const blend = (d, s, pre) => {
    let num = 0, den = 0
    for (const m in ALL_SILOS[s]) { const p = d[pre + m]; if (p != null) { num += ALL_SILOS[s][m] * p; den += ALL_SILOS[s][m] } }
    return den > 0 ? num / den : null
  }
  DATA.forEach((d) => {
    ALL_NAMES.forEach((s) => { d['silo__' + s] = blend(d, s, 'pctW__'); d['siloL__' + s] = blend(d, s, 'pctL__') })
  })
})()

export { SEASON_SILOS, SAMPLE_SILOS }
