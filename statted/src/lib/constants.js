// Silo definitions and weights — ported verbatim from the reference dashboard so the SPA
// produces identical scores.

export const SEASON_SILOS = {
  Pace: { top_speed: 3, sprints: 2, expl_sprint: 1.5, high_accel: 1 },
  Physical: { distance: 2, m_per_min: 2, hi_count: 2, hsr_dist: 1, high_decel: 1 },
  Passing: { pass_over: 3, pass_pct: 2, pass_vol: 1, pass_dist: 1 },
  Creation: { dangerous_passes: 2, linebreaks: 2, pass_shot: 2, pass_torun: 1, pass_goal: 1 },
  Movement: { dangerous_runs: 2, runs_received: 2, run_shot: 2, runs_targeted: 1, runs_box: 1, runs: 1 },
}
// Sample silos are single composites (built in scoring.js), ranked league-wide/within-position.
export const SAMPLE_SILOS = {
  Shooting: { shotval_total: 1 },
  Defending: { defval_total: 1 },
  Dribbling: { dribval_total: 1 },
}
export const ALL_SILOS = { ...SEASON_SILOS, ...SAMPLE_SILOS }
export const SEASON_NAMES = Object.keys(SEASON_SILOS)
export const SAMPLE_NAMES = Object.keys(SAMPLE_SILOS)
export const ALL_NAMES = Object.keys(ALL_SILOS)

export const SILO_COLORS = {
  Pace: 'var(--c1)', Physical: 'var(--c2)', Passing: 'var(--c3)', Creation: 'var(--c4)',
  Movement: 'var(--c5)', Shooting: 'var(--c6)', Defending: 'var(--c7)', Dribbling: 'var(--c8)',
}

export const POSITION_WEIGHTS = {
  'Central Defender': { Pace: 1, Physical: 2.5, Passing: 2.5, Creation: 0.5, Movement: 0.5, Shooting: 0.3, Defending: 3, Dribbling: 0.7 },
  'Full Back': { Pace: 2, Physical: 2, Passing: 1.5, Creation: 1.5, Movement: 1.5, Shooting: 0.5, Defending: 2, Dribbling: 1.5 },
  Midfield: { Pace: 1, Physical: 1.5, Passing: 2.5, Creation: 2, Movement: 1.5, Shooting: 1, Defending: 2, Dribbling: 1.5 },
  'Wide Attacker': { Pace: 2, Physical: 1, Passing: 1, Creation: 2, Movement: 2.5, Shooting: 2, Defending: 0.8, Dribbling: 2.5 },
  'Center Forward': { Pace: 1.5, Physical: 1.5, Passing: 1, Creation: 2, Movement: 2.5, Shooting: 3, Defending: 0.5, Dribbling: 1.5 },
}
export const balanced = () => Object.fromEntries(ALL_NAMES.map((s) => [s, 1]))

// Archetype presets for the leaderboard (custom, league-wide basis).
export const LB_MODES = {
  'By position': null,
  Balanced: balanced(),
  Poacher: { Shooting: 10 },
  Playmaker: { Passing: 10, Creation: 8 },
  'Ball-winner': { Defending: 10 },
  Dribbler: { Dribbling: 10 },
  Athlete: { Pace: 10, Physical: 10 },
}

// Club colours for the drawn crest badge.
export const TEAM_COLOR = {
  'Adelaide United': '#E31837', Auckland: '#0A2A4A', 'Brisbane Roar': '#F58220', 'Central Coast': '#002B5C',
  Macarthur: '#1A1A1A', 'Melbourne City': '#6CABDD', 'Melbourne Victory': '#12223F', 'Newcastle Jets': '#1D2A5B',
  'Perth Glory': '#4B2E83', 'Sydney FC': '#3AA0DA', 'WS Wanderers': '#BE1E2D', Wellington: '#FFD200', 'Western United': '#0E5A3C',
}
export const TEAM_COLOR2 = {
  'Adelaide United': '#F9E200', Auckland: '#1E6FBF', 'Brisbane Roar': '#6E2B62', 'Central Coast': '#FDB913',
  Macarthur: '#C8102E', 'Melbourne City': '#0A2240', 'Melbourne Victory': '#C0C0C0', 'Newcastle Jets': '#E4002B',
  'Perth Glory': '#F58220', 'Sydney FC': '#002D62', 'WS Wanderers': '#111111', Wellington: '#111111', 'Western United': '#111111',
}
// Position colours for the scatter explorer.
export const POS_COLOR = {
  'Central Defender': 'var(--c2)', 'Full Back': 'var(--c1)', Midfield: 'var(--c3)',
  'Wide Attacker': 'var(--c5)', 'Center Forward': 'var(--c6)', Team: 'var(--c7)',
}

// ── The atlas vocabulary ──────────────────────────────────────────────────
// The six off-ball run families are the site's core visual identity. Each is a
// direction on the pitch (attacking left → right; angle in degrees, 0° = forward,
// negative = up-screen/toward the near touchline) plus a hue and a one-line read.
// `key` matches the `run__<family>` fields and META.run_families order.
export const RUN_FAMILIES = [
  { key: 'In behind',      short: 'In behind',   abbr: 'BEH', angle: -22, cvar: '--run-1', note: 'Breaking the last line — the penetrating run.' },
  { key: 'Cross receiver', short: 'Cross recv.', abbr: 'CRX', angle:  26, cvar: '--run-2', note: 'Arriving in the box to attack a delivery.' },
  { key: 'Ahead of ball',  short: 'Ahead',       abbr: 'AHD', angle:   0, cvar: '--run-3', note: 'Getting beyond the carrier, straight forward.' },
  { key: 'Support / short',short: 'Support',     abbr: 'SUP', angle: 180, cvar: '--run-4', note: 'Dropping in to offer the short, safe angle.' },
  { key: 'Wide / overlap', short: 'Overlap',     abbr: 'OVL', angle: -52, cvar: '--run-5', note: 'Bursting wide, around and beyond the ball.' },
  { key: 'Half-space',     short: 'Half-space',  abbr: 'HSP', angle: -36, cvar: '--run-6', note: 'Slipping into the channel between lines.' },
]
export const RUN_BY_KEY = Object.fromEntries(RUN_FAMILIES.map((r) => [r.key, r]))
// Ordered colour ramp used wherever run families are drawn.
export const RUN_COLORS = RUN_FAMILIES.map((r) => `var(${r.cvar})`)
