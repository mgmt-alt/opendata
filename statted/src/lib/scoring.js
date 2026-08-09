import { DATA, METRICS, METRIC_BY_KEY, SAMPLE_META } from './data.js'
import { ALL_NAMES, ALL_SILOS, POSITION_WEIGHTS, balanced } from './constants.js'

// ---- formatting ----
export const fmt = (v, d = 1) =>
  v == null ? '—' : (+v).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })
export function fmtMetric(key, v) {
  if (v == null) return '—'
  const m = METRIC_BY_KEY[key]
  if (!m) return fmt(v, 1)
  if (m.fmt === 'int') return Math.round(v).toLocaleString()
  if (m.fmt === 'pct') return fmt(v, 1) + '%'
  return fmt(v, 1)
}

// ---- metric access (season on the record, sample under d.shot) ----
export function metricVal(d, key) {
  const m = METRIC_BY_KEY[key]; if (!m) return null
  if (m.src === 'sample') return d.shot ? (d.shot[key] == null ? null : d.shot[key]) : null
  const v = d[key]; return v == null ? null : v
}
export function metricPct(key, d, peers) {
  const m = METRIC_BY_KEY[key]; const v = metricVal(d, key); if (v == null) return null
  const vals = peers.map((p) => metricVal(p, key)).filter((x) => x != null).sort((a, b) => a - b)
  if (!vals.length) return null
  const lo = vals.indexOf(v), hi = vals.lastIndexOf(v)
  let p = ((lo + hi) / 2 + 1) / (vals.length + 1) * 100
  return m && m.better === -1 ? 100 - p : p
}

// ---- overall score (mode-aware basis) ----
// mode='role' -> within-position silos + position weights; mode='custom' -> league-wide + custom weights
const siloBasis = (mode) => (mode === 'role' ? 'silo__' : 'siloL__')
export const siloVal = (d, s, mode) => d[siloBasis(mode) + s]
export function positionOverall(d) {
  const w = POSITION_WEIGHTS[d.position_group] || balanced()
  let num = 0, den = 0
  ALL_NAMES.forEach((s) => { const v = d['silo__' + s]; if (v != null) { num += w[s] * v; den += w[s] } })
  return den > 0 ? num / den : null
}
export function overall(d, mode, customW) {
  if (d.isTeam && mode === 'role') return d._overall
  const w = mode === 'role' ? (POSITION_WEIGHTS[d.position_group] || balanced()) : customW
  let num = 0, den = 0
  ALL_NAMES.forEach((s) => { const v = siloVal(d, s, mode); if (v != null) { num += w[s] * v; den += w[s] } })
  return den > 0 ? num / den : null
}
export function siloContribs(d, mode, customW) {
  const w = mode === 'role' ? (POSITION_WEIGHTS[d.position_group] || balanced()) : customW
  const present = ALL_NAMES.filter((s) => siloVal(d, s, mode) != null)
  const tot = present.reduce((a, s) => a + w[s], 0) || 1
  const o = {}; present.forEach((s) => { o[s] = (w[s] / tot) * siloVal(d, s, mode) })
  return o
}
export const samplePeers = (team, teams) => (team ? teams : DATA).filter((x) => x.shot)

// ---- team entities (minutes-weighted) ----
const SAMPLE_KEYS = METRICS.filter((m) => m.src === 'sample').map((m) => m.key)
const SAMPLE_DERIVED = {
  conversion: (t) => (t.shots ? t.goals / t.shots : null),
  box_shot_pct: (t) => (t.shots ? (t.shots_box / t.shots) * 100 : null),
  def_success: (t) => (t.pressures ? (t.regains / t.pressures) * 100 : null),
  progcarry_pct: (t) => (t.carries ? (t.progcarries / t.carries) * 100 : null),
  elim_per_carry: (t) => (t.carries ? t.opp_overtaken / t.carries : null),
}
const SAMPLE_SUM = SAMPLE_KEYS.filter((k) => !(k in SAMPLE_DERIVED))
const SEASON_METRIC_KEYS = METRICS.filter((m) => m.src === 'season').map((m) => m.key)
let TEAMS = null
export function teamEntities() {
  if (TEAMS) return TEAMS
  const by = {}
  DATA.forEach((d) => { (by[d.team_short] ||= []).push(d) })
  TEAMS = Object.entries(by).map(([team, ps]) => {
    const w = (p) => ((p.minutes || 0) * (p.matches || 0)) || 1
    const wmean = (f) => { let n = 0, dn = 0; ps.forEach((p) => { const v = p[f]; if (v != null) { n += w(p) * v; dn += w(p) } }); return dn ? n / dn : null }
    const e = { player_id: 'team:' + team, player_short_name: team, player_name: team, team_short: team, position_group: 'Team', isTeam: true, players: ps.length, matches: 99 }
    SEASON_METRIC_KEYS.forEach((f) => { e[f] = wmean(f) })
    ALL_NAMES.forEach((s) => { e['silo__' + s] = wmean('silo__' + s); e['siloL__' + s] = wmean('siloL__' + s) })
    let num = 0, dn = 0
    ps.forEach((p) => { const v = positionOverall(p); if (v != null) { num += w(p) * v; dn += w(p) } })
    e._overall = dn ? num / dn : null
    const sp = ps.filter((p) => p.shot)
    if (sp.length) {
      const sum = (f) => sp.reduce((a, p) => a + (p.shot[f] || 0), 0)
      const apps = Math.max(...sp.map((p) => p.shot.apps || 0)) || 1
      const sh = { apps, shots_per_app: sum('shots') / apps }
      SAMPLE_SUM.forEach((k) => { sh[k] = sum(k) })
      for (const k in SAMPLE_DERIVED) sh[k] = SAMPLE_DERIVED[k](sh)
      const gsp = sp.filter((p) => p.shot.grid)
      if (gsp.length) {
        const g = {}
        SAMPLE_META.layers.forEach((L) => {
          const n = gsp[0].shot.grid[L].length; const arr = new Array(n).fill(0)
          gsp.forEach((p) => { const s = p.shot.grid[L]; if (s) for (let i = 0; i < n; i++) arr[i] += s[i] || 0 })
          g[L] = arr
        })
        sh.grid = g
      }
      e.shot = sh
    }
    return e
  })
  return TEAMS
}
