"""
SkillCorner Score — a FIFA-style composite that ranks A-League 2024/25 players.

Two scopes
----------
* **Season (5 silos, all players).** Built from the all-games aggregates:
  Pace, Physical, Passing, Creation, Movement. Covers every 60+ minute player.
* **Full profile (8 silos, 10-match sample).** Adds the three faces only the
  per-match dynamic events can supply — **Shooting**, **Defending**, **Dribbling**
  — for the ~200 players in the tracked matches. Enabled with ``include_sample``.

Method (both scopes)
--------------------
1. Every metric -> **percentile within the player's position group** (0-100).
   Season metrics rank against all season players; sample metrics rank against the
   sample pool, so each face is judged against the right peer set.
2. Each silo = **weighted mean** of its metrics' percentiles (weights below).
3. Overall = weighted mean of the silos, **position-aware** by default
   (``POSITION_WEIGHTS``) or with a custom weight set. In sample scope only players
   with all eight silos are ranked.

There is no xG in the open data, so Shooting is shot volume + goals, not finishing.

Usage
-----
    python -m src.visualization.player_score                    # season leaderboard CSV
    compute_scores(df)                                          # season, position-aware
    compute_scores(df, include_sample=True)                     # 8-silo full profile
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from src.visualization.build_dashboard_data import load_merged
from src.visualization.dynamic_events_agg import load_sample

REPO_ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = Path(__file__).resolve().parent / "output"

# Season silos (from the all-games aggregates). {metric: intra-silo weight}.
SEASON_SILOS: dict[str, dict[str, float]] = {
    "Pace": {"top_speed": 3, "sprints": 2, "expl_sprint": 1.5, "high_accel": 1},
    "Physical": {"distance": 2, "m_per_min": 2, "hi_count": 2, "hsr_dist": 1, "high_decel": 1},
    "Passing": {"pass_over": 3, "pass_pct": 2, "pass_vol": 1, "pass_dist": 1},
    "Creation": {"dangerous_passes": 2, "linebreaks": 2, "pass_shot": 2, "pass_torun": 1, "pass_goal": 1},
    "Movement": {"dangerous_runs": 2, "runs_received": 2, "run_shot": 2, "runs_targeted": 1,
                 "runs_box": 1, "runs": 1},
}

# Sample silos (from the 10-match dynamic events). Each is a SINGLE composite of raw
# sample TOTALS (volume over the tracked matches), percentiled LEAGUE-WIDE (absolute,
# not position-relative). This is deliberate:
#   * Volume totals (not tiny-sample per-appearance rates) mean a player who "hasn't had
#     many shots" can't rate as an elite shooter off one game.
#   * League-wide (not within-position) means a midfielder who barely shoots isn't graded
#     against other midfielders and inflated — shooting is judged against everyone.
#   * Shooting = shots + 9*goals, so goals dominate but volume counts; any goalscorer
#     still ranks above a non-scorer, and zero shots/goals sits at the floor.
SAMPLE_SILOS: dict[str, dict[str, float]] = {
    "Shooting": {"shotval_total": 1},
    "Defending": {"defval_total": 1},
    "Dribbling": {"dribval_total": 1},
}
# Sample composites are ranked against the whole league, not within position.
LEAGUE_METRICS = {"shotval_total", "defval_total", "dribval_total"}

# Back-compat aliases (season scope is the default everywhere else).
SILOS = SEASON_SILOS
SILO_NAMES = list(SEASON_SILOS)
SAMPLE_SILO_NAMES = list(SAMPLE_SILOS)
ALL_SILOS = {**SEASON_SILOS, **SAMPLE_SILOS}
ALL_SILO_NAMES = list(ALL_SILOS)

# FIFA faces that remain unavailable even in the sample (documentation only).
UNAVAILABLE = {"Finishing quality (xG)": "no xG anywhere in the open data"}

# Position-aware silo weights for the Overall (all 8; season scope uses the first 5).
POSITION_WEIGHTS: dict[str, dict[str, float]] = {
    "Central Defender": {"Pace": 1.0, "Physical": 2.5, "Passing": 2.5, "Creation": 0.5,
                         "Movement": 0.5, "Shooting": 0.3, "Defending": 3.0, "Dribbling": 0.7},
    "Full Back": {"Pace": 2.0, "Physical": 2.0, "Passing": 1.5, "Creation": 1.5,
                  "Movement": 1.5, "Shooting": 0.5, "Defending": 2.0, "Dribbling": 1.5},
    "Midfield": {"Pace": 1.0, "Physical": 1.5, "Passing": 2.5, "Creation": 2.0,
                 "Movement": 1.5, "Shooting": 1.0, "Defending": 2.0, "Dribbling": 1.5},
    "Wide Attacker": {"Pace": 2.0, "Physical": 1.0, "Passing": 1.0, "Creation": 2.0,
                      "Movement": 2.5, "Shooting": 2.0, "Defending": 0.8, "Dribbling": 2.5},
    "Center Forward": {"Pace": 1.5, "Physical": 1.5, "Passing": 1.0, "Creation": 2.0,
                       "Movement": 2.5, "Shooting": 3.0, "Defending": 0.5, "Dribbling": 1.5},
}
BALANCED_WEIGHTS = {s: 1.0 for s in ALL_SILO_NAMES}


def _percentile_within(df: pd.DataFrame, col: str, group_col: str) -> pd.Series:
    # Weibull plotting position rank/(n+1): the sample's best sits just under 100 (not
    # exactly 100, which would claim "better than everyone including a larger population"),
    # and the worst just above 0.
    g = df.groupby(group_col)[col]
    return g.rank(method="average") / (g.transform("count") + 1) * 100


def _percentile_league(s: pd.Series) -> pd.Series:
    """Weibull percentile across the whole (non-null) series."""
    n = int(s.notna().sum())
    return s.rank(method="average") / (n + 1) * 100


def _weighted_mean(values: np.ndarray, weights: np.ndarray) -> np.ndarray:
    mask = ~np.isnan(values)
    wm = np.where(mask, weights, 0.0)
    denom = wm.sum(axis=1)
    num = np.nansum(np.where(mask, values, 0.0) * wm, axis=1)
    with np.errstate(invalid="ignore", divide="ignore"):
        return np.where(denom > 0, num / denom, np.nan)


def compute_scores(
    df: pd.DataFrame,
    silo_weights: dict[str, float] | None = None,
    group_col: str = "position_group",
    min_matches: int = 3,
    include_sample: bool = False,
) -> pd.DataFrame:
    """Ranked leaderboard with per-metric percentiles, silo scores and an Overall.

    ``include_sample`` False -> 5 season silos, every eligible player.
    ``include_sample`` True  -> 8 silos (adds Shooting/Defending/Dribbling from the
    10-match sample); only players with all eight silos are ranked.
    """
    out = df.copy()
    silos = ALL_SILOS if include_sample else SEASON_SILOS
    names = list(silos)

    if include_sample:
        sample = load_sample()
        raw = ["shots", "goals", "regains", "pressures", "disruptions", "carries", "progcarries"]
        out = out.merge(sample[raw], left_on="player_id", right_index=True, how="left")
        # composite sample TOTALS (volume over the tracked matches). Goal weight 3 keeps
        # goals worth more than a blank shot while letting shot VOLUME drive the rating,
        # so a 2-shot cameo can't rate as an elite shooter.
        out["shotval_total"] = out["shots"] + 3 * out["goals"]
        out["defval_total"] = 2 * out["regains"] + out["disruptions"] + 0.5 * out["pressures"]
        out["dribval_total"] = out["carries"] + 3 * out["progcarries"]

    # 1) per-metric percentiles — sample composites league-wide, everything else within
    #    position (sample metrics auto-restrict to the sample pool since rank skips NaN)
    for metrics in silos.values():
        for col in metrics:
            if col in LEAGUE_METRICS:
                out[f"pct__{col}"] = _percentile_league(out[col])
            else:
                out[f"pct__{col}"] = _percentile_within(out, col, group_col)

    # 2) silo scores = intra-silo weighted mean of metric percentiles
    for silo, metrics in silos.items():
        cols = [f"pct__{c}" for c in metrics]
        w = np.array(list(metrics.values()), dtype=float)
        out[f"silo__{silo}"] = _weighted_mean(out[cols].to_numpy(dtype=float), w)

    # 3) overall = weighted mean of silo scores (position-aware or custom)
    silo_cols = [f"silo__{s}" for s in names]
    silo_vals = out[silo_cols].to_numpy(dtype=float)
    if silo_weights is None:
        wmat = np.array(out[group_col].map(
            lambda p: [POSITION_WEIGHTS.get(p, BALANCED_WEIGHTS)[s] for s in names]
        ).tolist(), dtype=float)
    else:
        wmat = np.tile([silo_weights.get(s, 0.0) for s in names], (len(out), 1))
    out["score_overall"] = np.round(_weighted_mean(silo_vals, wmat), 1)

    # eligibility: min matches, plus all silos present (in sample scope this restricts
    # to players who appear in the tracked matches)
    eligible = (out["matches"] >= min_matches) & ~np.isnan(silo_vals).any(axis=1)
    out = out[eligible].copy()

    out = out.sort_values("score_overall", ascending=False, na_position="last").reset_index(drop=True)
    out["rank"] = out["score_overall"].rank(ascending=False, method="min").astype("Int64")
    out["rank_in_position"] = (
        out.groupby(group_col)["score_overall"].rank(ascending=False, method="min").astype("Int64")
    )
    return out


def leaderboard(df: pd.DataFrame, n: int = 25, include_sample: bool = False, **kwargs) -> pd.DataFrame:
    """Tidy top-``n`` leaderboard view with each silo face."""
    ranked = compute_scores(df, include_sample=include_sample, **kwargs)
    names = ALL_SILO_NAMES if include_sample else SILO_NAMES
    cols = ["rank", "player_name", "team_short", "position_group", "score_overall",
            *[f"silo__{s}" for s in names], "matches"]
    view = ranked[cols].head(n).copy()
    return view.rename(columns={
        "player_name": "player", "team_short": "team", "position_group": "position",
        "score_overall": "score", **{f"silo__{s}": s.lower() for s in names},
    }).round({s.lower(): 1 for s in names})


def main() -> None:
    df = load_merged()
    ranked = compute_scores(df)  # season, position-aware
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    export_cols = [
        "rank", "rank_in_position", "player_name", "team_short", "position_group",
        "matches", "minutes", "score_overall", *[f"silo__{s}" for s in SILO_NAMES],
    ]
    (OUT_DIR / "season_leaderboard.csv").write_text(ranked[export_cols].round(1).to_csv(index=False))

    full = compute_scores(df, include_sample=True)
    full_cols = ["rank", "player_name", "team_short", "position_group", "matches",
                 "score_overall", *[f"silo__{s}" for s in ALL_SILO_NAMES]]
    (OUT_DIR / "sample_leaderboard.csv").write_text(full[full_cols].round(1).to_csv(index=False))

    print(f"Season leaderboard: {len(ranked)} players (5 silos).")
    print(f"Full-profile leaderboard: {len(full)} players (8 silos, 10-match sample).\n")
    print("Top 12 — full 8-silo profile (position-aware):\n")
    print(leaderboard(df, 12, include_sample=True).to_string(index=False))


if __name__ == "__main__":
    main()
