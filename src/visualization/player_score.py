"""
SkillCorner Score — a transparent composite rating that ranks A-League 2024/25
players like a leaderboard.

Method
------
1. Every metric is turned into a **percentile within the player's position group**
   (0-100), so players are only ever compared to positional peers.
2. Percentiles roll up into three **sub-scores**, each the mean of its metrics:
     - Athletic          (physical output)
     - Passing            (passing volume, security & progression)
     - Off-ball           (off-ball running threat)
3. The **Overall Score** is a weighted average of the three sub-scores:

       Score = w_ath * Athletic + w_pass * Passing + w_obr * Off-ball

   with the weights renormalised over whichever sub-scores a player actually has
   data for. Default weights are equal (1/3 each) and are fully adjustable.

All metrics here are "higher is better" (see METRIC_GROUPS). ``pass_over`` already
encodes completing *more* than expected, so no inversion is needed anywhere.

Usage
-----
    python -m src.visualization.player_score            # writes leaderboard CSV
    from src.visualization.player_score import compute_scores
    ranked = compute_scores(load_merged())
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from src.visualization.build_dashboard_data import load_merged

REPO_ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = Path(__file__).resolve().parent / "output"

# Sub-score -> (metric column, display label). All oriented "higher = better".
METRIC_GROUPS: dict[str, list[tuple[str, str]]] = {
    "Athletic": [
        ("top_speed", "Peak speed"), ("m_per_min", "Work rate"), ("distance", "Distance"),
        ("hsr_dist", "High-speed dist"), ("sprints", "Sprints"),
        ("hi_count", "High-intensity"), ("high_accel", "Explosive accel"),
    ],
    "Passing": [
        ("pass_vol", "Pass volume"), ("pass_pct", "Completion %"), ("pass_over", "Beats xPass"),
        ("linebreaks", "Line breaks"), ("dangerous_passes", "Dangerous passes"),
    ],
    "Off-ball": [
        ("runs", "Total runs"), ("dangerous_runs", "Dangerous runs"),
        ("runs_received", "Runs received"),
    ],
}

DEFAULT_WEIGHTS = {"Athletic": 1 / 3, "Passing": 1 / 3, "Off-ball": 1 / 3}


def _percentile_within(df: pd.DataFrame, col: str, group_col: str = "position_group") -> pd.Series:
    """Percentile rank (0-100) of each value within its position group."""
    return df.groupby(group_col)[col].rank(pct=True, method="average") * 100


def compute_scores(
    df: pd.DataFrame,
    weights: dict[str, float] | None = None,
    group_col: str = "position_group",
    min_matches: int = 3,
    require_all: bool = True,
) -> pd.DataFrame:
    """Return the ranked leaderboard: per-metric percentiles, three sub-scores and
    an Overall Score, sorted descending with dense ``rank`` columns.

    Percentiles are always computed against the **full** positional pool so a
    player's standing never depends on the filter. Only *eligible* players are
    ranked, where eligible means ``matches >= min_matches`` and — when
    ``require_all`` — all three sub-scores are present (a composite that ignores a
    whole facet a player never showed would flatter cameo appearances).
    """
    weights = weights or DEFAULT_WEIGHTS
    out = df.copy()

    # per-metric percentiles (within position, on the full pool)
    for group, metrics in METRIC_GROUPS.items():
        for col, _ in metrics:
            out[f"pct__{col}"] = _percentile_within(out, col, group_col)

    # sub-scores = mean of available metric percentiles in the group
    for group, metrics in METRIC_GROUPS.items():
        cols = [f"pct__{col}" for col, _ in metrics]
        out[f"score__{group}"] = out[cols].mean(axis=1, skipna=True)

    # overall = weight-renormalised mean of available sub-scores
    sub_cols = [f"score__{g}" for g in METRIC_GROUPS]
    w = np.array([weights[g] for g in METRIC_GROUPS], dtype=float)
    sub = out[sub_cols].to_numpy(dtype=float)
    mask = ~np.isnan(sub)
    wmat = np.where(mask, w, 0.0)
    denom = wmat.sum(axis=1)
    overall = np.where(denom > 0, np.nansum(np.where(mask, sub, 0.0) * wmat, axis=1) / denom, np.nan)
    out["score_overall"] = np.round(overall, 1)

    # eligibility filter (percentiles above already reflect the full pool)
    eligible = out["matches"] >= min_matches
    if require_all:
        eligible &= mask.all(axis=1)
    out = out[eligible].copy()

    out = out.sort_values("score_overall", ascending=False, na_position="last").reset_index(drop=True)
    out["rank"] = out["score_overall"].rank(ascending=False, method="min").astype("Int64")
    out["rank_in_position"] = (
        out.groupby(group_col)["score_overall"].rank(ascending=False, method="min").astype("Int64")
    )
    return out


def leaderboard(df: pd.DataFrame, n: int = 25) -> pd.DataFrame:
    """Tidy top-``n`` leaderboard view with the columns worth reading."""
    ranked = compute_scores(df)
    cols = [
        "rank", "player_name", "team_short", "position_group",
        "score_overall", "score__Athletic", "score__Passing", "score__Off-ball",
        "matches",
    ]
    view = ranked[cols].head(n).copy()
    return view.rename(columns={
        "player_name": "player", "team_short": "team", "position_group": "position",
        "score_overall": "score", "score__Athletic": "athletic",
        "score__Passing": "passing", "score__Off-ball": "off_ball",
    }).round({"athletic": 1, "passing": 1, "off_ball": 1})


def main() -> None:
    df = load_merged()
    ranked = compute_scores(df)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    export_cols = [
        "rank", "rank_in_position", "player_name", "team_short", "position_group",
        "matches", "minutes", "score_overall",
        "score__Athletic", "score__Passing", "score__Off-ball",
    ]
    csv_path = OUT_DIR / "season_leaderboard.csv"
    ranked[export_cols].to_csv(csv_path, index=False)
    print(f"Wrote leaderboard for {len(ranked)} players -> {csv_path}\n")
    print("Top 15 by SkillCorner Score (equal weights):\n")
    lb = leaderboard(df, 15)
    print(lb.to_string(index=False))


if __name__ == "__main__":
    main()
