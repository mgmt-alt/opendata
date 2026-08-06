"""
SkillCorner Score — a FIFA-flavoured composite rating that ranks A-League 2024/25
players like a leaderboard.

Why these silos
---------------
FIFA cards use six faces (PAC / SHO / PAS / DRI / DEF / PHY). Broadcast tracking
data can only *see* some of those. This score is built from the faces the data
genuinely supports, and is honest about the rest:

    Pace       ✅  peak sprint speed, sprint volume, explosive accelerations   (~ FIFA PAC)
    Physical   ✅  distance, work rate, high-intensity volume, braking          (~ FIFA PHY)
    Passing    ✅  completion, beating xPass, volume, range                     (~ FIFA PAS)
    Creation   ✅  line-breaking / dangerous passes, passes into shots          (~ vision/creativity)
    Movement   ✅  off-ball run threat, runs received, runs into shots          (SkillCorner-only face)

    Shooting   ❌  no shots / xG / goals-scored per player in the aggregates
    Dribbling  ❌  no take-on / 1v1 events
    Defending  ❌  no tackles / interceptions / duels (this is in-possession + physical data)

See ``UNAVAILABLE`` for the faces we deliberately do not fake.

Method
------
1. Every metric -> **percentile within the player's position group** (0-100).
2. Each silo score = **weighted mean** of its metrics' percentiles (intra-silo
   weights in ``SILOS``) — so, e.g., beating xPass counts more than raw volume.
3. Overall = weighted mean of the five silo scores. Weights are **position-aware**
   by default (``POSITION_WEIGHTS`` — a centre-back leans on Physical/Passing, a
   forward on Movement/Creation), or a single custom weight set can be supplied.
   Weights renormalise over whichever silos a player has data for.

Usage
-----
    python -m src.visualization.player_score                 # role-based leaderboard CSV
    from src.visualization.player_score import compute_scores
    compute_scores(df)                                       # position-aware weights
    compute_scores(df, silo_weights={"Movement": 3, ...})    # one custom weighting
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from src.visualization.build_dashboard_data import load_merged

REPO_ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = Path(__file__).resolve().parent / "output"

# Silo -> {metric column: intra-silo weight}. All metrics are "higher = better".
SILOS: dict[str, dict[str, float]] = {
    "Pace": {          # explosive top-end speed  (~ FIFA PAC)
        "top_speed": 3, "sprints": 2, "expl_sprint": 1.5, "high_accel": 1,
    },
    "Physical": {      # engine, stamina, intensity, braking  (~ FIFA PHY)
        "distance": 2, "m_per_min": 2, "hi_count": 2, "hsr_dist": 1, "high_decel": 1,
    },
    "Passing": {       # security & range  (~ FIFA PAS)
        "pass_over": 3, "pass_pct": 2, "pass_vol": 1, "pass_dist": 1,
    },
    "Creation": {      # chance generation / vision
        "dangerous_passes": 2, "linebreaks": 2, "pass_shot": 2, "pass_torun": 1, "pass_goal": 1,
    },
    "Movement": {      # off-ball running threat  (SkillCorner-only face)
        "dangerous_runs": 2, "runs_received": 2, "run_shot": 2, "runs_targeted": 1,
        "runs_box": 1, "runs": 1,
    },
}
SILO_NAMES = list(SILOS)

# FIFA faces this tracking dataset cannot honestly populate.
UNAVAILABLE = {
    "Shooting": "no shots / xG / goals-scored per player in the aggregates",
    "Dribbling": "no take-on / 1v1 duel events",
    "Defending": "no tackles / interceptions / duels (in-possession + physical data only)",
}

# Position-aware silo weights for the Overall (renormalised internally).
POSITION_WEIGHTS: dict[str, dict[str, float]] = {
    "Central Defender": {"Pace": 1.0, "Physical": 2.5, "Passing": 2.5, "Creation": 0.5, "Movement": 0.5},
    "Full Back":        {"Pace": 2.0, "Physical": 2.0, "Passing": 1.5, "Creation": 1.5, "Movement": 1.5},
    "Midfield":         {"Pace": 1.0, "Physical": 1.5, "Passing": 2.5, "Creation": 2.0, "Movement": 1.5},
    "Wide Attacker":    {"Pace": 2.0, "Physical": 1.0, "Passing": 1.0, "Creation": 2.0, "Movement": 2.5},
    "Center Forward":   {"Pace": 1.5, "Physical": 1.5, "Passing": 1.0, "Creation": 2.0, "Movement": 2.5},
}
BALANCED_WEIGHTS = {s: 1.0 for s in SILO_NAMES}


def _percentile_within(df: pd.DataFrame, col: str, group_col: str) -> pd.Series:
    """Percentile rank (0-100) of each value within its position group."""
    return df.groupby(group_col)[col].rank(pct=True, method="average") * 100


def _weighted_mean(values: np.ndarray, weights: np.ndarray) -> np.ndarray:
    """Row-wise weighted mean that ignores NaN, renormalising over present terms."""
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
    require_all: bool = True,
) -> pd.DataFrame:
    """Return the ranked leaderboard with per-metric percentiles, five silo scores
    and an Overall Score.

    ``silo_weights`` None  -> position-aware weights (``POSITION_WEIGHTS``).
    ``silo_weights`` dict  -> one custom weighting applied to every player.

    Percentiles are computed against the full positional pool; only eligible
    players (``matches >= min_matches`` and, when ``require_all``, data in every
    silo) are ranked.
    """
    out = df.copy()

    # 1) per-metric percentiles within position
    for silo, metrics in SILOS.items():
        for col in metrics:
            out[f"pct__{col}"] = _percentile_within(out, col, group_col)

    # 2) silo scores = intra-silo weighted mean of metric percentiles
    for silo, metrics in SILOS.items():
        cols = [f"pct__{c}" for c in metrics]
        w = np.array(list(metrics.values()), dtype=float)
        out[f"silo__{silo}"] = _weighted_mean(out[cols].to_numpy(dtype=float), w)

    # 3) overall = weighted mean of silo scores (position-aware or custom)
    silo_cols = [f"silo__{s}" for s in SILO_NAMES]
    silo_vals = out[silo_cols].to_numpy(dtype=float)
    if silo_weights is None:
        wmat = out[group_col].map(
            lambda p: [POSITION_WEIGHTS.get(p, BALANCED_WEIGHTS)[s] for s in SILO_NAMES]
        )
        wmat = np.array(wmat.tolist(), dtype=float)
    else:
        wmat = np.tile([silo_weights.get(s, 0.0) for s in SILO_NAMES], (len(out), 1))
    out["score_overall"] = np.round(_weighted_mean(silo_vals, wmat), 1)

    # eligibility, then rank
    eligible = out["matches"] >= min_matches
    if require_all:
        eligible &= ~np.isnan(silo_vals).any(axis=1)
    out = out[eligible].copy()

    out = out.sort_values("score_overall", ascending=False, na_position="last").reset_index(drop=True)
    out["rank"] = out["score_overall"].rank(ascending=False, method="min").astype("Int64")
    out["rank_in_position"] = (
        out.groupby(group_col)["score_overall"].rank(ascending=False, method="min").astype("Int64")
    )
    return out


def leaderboard(df: pd.DataFrame, n: int = 25, **kwargs) -> pd.DataFrame:
    """Tidy top-``n`` leaderboard view with the five silo faces."""
    ranked = compute_scores(df, **kwargs)
    cols = ["rank", "player_name", "team_short", "position_group", "score_overall",
            *[f"silo__{s}" for s in SILO_NAMES], "matches"]
    view = ranked[cols].head(n).copy()
    return view.rename(columns={
        "player_name": "player", "team_short": "team", "position_group": "position",
        "score_overall": "score", **{f"silo__{s}": s.lower() for s in SILO_NAMES},
    }).round({s.lower(): 1 for s in SILO_NAMES})


def main() -> None:
    df = load_merged()
    ranked = compute_scores(df)  # position-aware
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    export_cols = [
        "rank", "rank_in_position", "player_name", "team_short", "position_group",
        "matches", "minutes", "score_overall", *[f"silo__{s}" for s in SILO_NAMES],
    ]
    csv_path = OUT_DIR / "season_leaderboard.csv"
    ranked[export_cols].round(1).to_csv(csv_path, index=False)
    print(f"Wrote leaderboard for {len(ranked)} players -> {csv_path}")
    print(f"Silos: {SILO_NAMES}")
    print(f"Not measurable from this data: {list(UNAVAILABLE)}\n")
    print("Top 15 by SkillCorner Score (position-aware weights):\n")
    print(leaderboard(df, 15).to_string(index=False))


if __name__ == "__main__":
    main()
