"""
Build a compact, dashboard-ready dataset from the SkillCorner A-League season aggregates.

Merges the Physical, Passing and Off-Ball Run aggregate CSVs into a single
per-player record and writes a small JSON file that the interactive dashboard
(``season_dashboard.html``) embeds. Also usable standalone to get a tidy,
analysis-ready DataFrame of the season.

Usage
-----
    python -m src.visualization.build_dashboard_data
    # or
    python src/visualization/build_dashboard_data.py

Output
------
    src/visualization/output/season_players.json
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[2]
AGG_DIR = REPO_ROOT / "data" / "aggregates"
OUT_DIR = Path(__file__).resolve().parent / "output"

PHYSICAL_CSV = AGG_DIR / "aus1league_physicalaggregates_20242025.csv"
PASSING_CSV = AGG_DIR / "aus1league_passingaggregates_20242025.csv"
OBR_CSV = AGG_DIR / "aus1league_obraggregates_20242025.csv"

# Minimum minutes-per-match already implied by the >60' filter, but we keep a
# guard so single-cameo players don't distort percentiles.
MIN_MINUTES = 60.0

# Short, human team names keyed by team_id (from data/matches.json + CSVs).
TEAM_SHORT = {
    866: "Adelaide United",
    867: "Wellington Phoenix",
    868: "Melbourne Victory",
    869: "Sydney FC",
    871: "Perth Glory",
    1803: "Western United",
    1804: "Macarthur",
    1805: "Newcastle Jets",
    2380: "Melbourne City",
    4177: "Auckland FC",
    # remaining ids resolved from team_name at runtime
}


def _short_team(name: str) -> str:
    """Compress verbose club names into scoreboard-length labels."""
    repl = {
        "Football Club": "",
        " FC": "",
        "Perth Glory": "Perth Glory",
        "Melbourne Victory": "Melbourne Victory",
        "Central Coast Mariners": "Central Coast",
        "Western Sydney Wanderers": "WS Wanderers",
        "Newcastle United Jets": "Newcastle Jets",
        "Adelaide United": "Adelaide United",
        "Wellington Phoenix": "Wellington",
        "Sydney": "Sydney FC",
    }
    out = name
    for k, v in repl.items():
        if k in out:
            out = out.replace(k, v)
    return " ".join(out.split()).strip()


# (source column, output key) pairs we keep for the dashboard.
PHYS_COLS = {
    "psv99": "top_speed",                         # peak sprint speed proxy (km/h)
    "total_distance_full_all": "distance",         # metres per match
    "total_metersperminute_full_all": "m_per_min",  # work rate
    "hsr_distance_full_all": "hsr_dist",           # high-speed-running distance
    "sprint_count_full_all": "sprints",            # sprint efforts
    "hi_count_full_all": "hi_count",               # high-intensity efforts
    "highaccel_count_full_all": "high_accel",      # explosive accelerations
    "highdecel_count_full_all": "high_decel",      # hard decelerations (braking)
    "explacceltosprint_count_full_all": "expl_sprint",  # explosive accel into a sprint
}

PASS_COLS = {
    "pass_count_attempted_p30tip": "pass_vol",         # passes per 30' in possession
    "pass_pct_completed": "pass_pct",                  # completion %
    "pass_avgxpass_attempted": "xpass",                # avg expected completion (difficulty)
    "pass_count_linebreak_completed_p30tip": "linebreaks",
    "pass_count_dangerous_completed_p30tip": "dangerous_passes",
    "pass_avgdistance": "pass_dist",
    "pass_count_torun_completed_p30tip": "pass_torun",     # completed passes into a run
    "pass_count_shotwithin10s_p30tip": "pass_shot",        # passes leading to a shot <=10s
    "pass_count_goalwithin10s_p30tip": "pass_goal",        # passes leading to a goal <=10s
}

OBR_COLS = {
    "offballrun_count_p30tip": "runs",
    "offballrun_count_dangerous_p30tip": "dangerous_runs",
    "offballrun_count_received_p30tip": "runs_received",
    "offballrun_count_targeted_p30tip": "runs_targeted",   # runs a teammate aimed a pass at
    "offballrun_count_shotwithin10s_p30tip": "run_shot",   # runs leading to a shot <=10s
    "offballrun_count_penaltyarea_p30tip": "runs_box",     # runs into the penalty area
}

# 11 SkillCorner run subtypes grouped into 6 readable families for the run-mix chart.
RUN_FAMILIES = {
    "In behind": ["behindrun_count_p30tip"],
    "Cross receiver": ["crossreceiverrun_count_p30tip"],
    "Ahead of ball": ["aheadoftheballrun_count_p30tip"],
    "Support / short": [
        "comingshortrun_count_p30tip",
        "droppingoffrun_count_p30tip",
        "supportrun_count_p30tip",
    ],
    "Wide / overlap": [
        "pullingwiderun_count_p30tip",
        "overlaprun_count_p30tip",
        "underlaprun_count_p30tip",
    ],
    "Half-space": ["pullinghalfspacerun_count_p30tip"],
}


# A player can appear once per position group they played; the three files share
# this granularity, so we join on the full composite key (1:1) and then collapse
# each player to their primary position (the one with the most total minutes).
KEY = ["player_id", "team_id", "position_group"]


def load_merged() -> pd.DataFrame:
    """Merge the three aggregate files into one row-per-player table."""
    phys = pd.read_csv(PHYSICAL_CSV)
    pas = pd.read_csv(PASSING_CSV)
    obr = pd.read_csv(OBR_CSV)

    phys = phys[phys["minutes_full_all"] >= MIN_MINUTES].copy()

    base = phys[
        [
            *KEY,
            "player_short_name",
            "player_name",
            "team_name",
            "minutes_full_all",
            "count_match",
            *PHYS_COLS.keys(),
        ]
    ].rename(columns={"minutes_full_all": "minutes", "count_match": "matches"})
    base = base.rename(columns=PHYS_COLS)

    pas_keep = pas[[*KEY, *PASS_COLS.keys()]].rename(columns=PASS_COLS)
    obr_run_cols = sorted({c for cols in RUN_FAMILIES.values() for c in cols})
    obr_keep = obr[[*KEY, *OBR_COLS.keys(), *obr_run_cols]].rename(columns=OBR_COLS)

    df = base.merge(pas_keep, on=KEY, how="left").merge(obr_keep, on=KEY, how="left")

    # Collapse to one row per player: keep their primary position (max total
    # minutes = per-match minutes x matches played in that role).
    df["total_minutes"] = df["minutes"] * df["matches"]
    df = (
        df.sort_values("total_minutes", ascending=False)
        .drop_duplicates(subset="player_id", keep="first")
        .reset_index(drop=True)
    )

    # "pass over-performance": actual completion minus expected (xPass). Positive
    # means the player completes harder passes than the model expects.
    df["pass_over"] = df["pass_pct"] - df["xpass"]

    # Collapse run subtypes into families.
    for family, cols in RUN_FAMILIES.items():
        df[f"run__{family}"] = df[cols].sum(axis=1)

    df["team_short"] = df["team_name"].map(_short_team)
    return df


def to_records(df: pd.DataFrame) -> list[dict]:
    """Convert to JSON-safe records, rounding floats for a compact payload."""
    run_family_keys = [f"run__{f}" for f in RUN_FAMILIES]
    keep = [
        "player_id", "player_short_name", "player_name", "team_short",
        "position_group", "minutes", "matches",
        *PHYS_COLS.values(), *PASS_COLS.values(), *OBR_COLS.values(),
        "pass_over", *run_family_keys,
    ]
    out = []
    for _, row in df[keep].iterrows():
        rec = {}
        for k in keep:
            v = row[k]
            if isinstance(v, (np.floating, float)):
                rec[k] = None if pd.isna(v) else round(float(v), 2)
            elif isinstance(v, (np.integer,)):
                rec[k] = int(v)
            else:
                rec[k] = None if (isinstance(v, float) and pd.isna(v)) else v
        out.append(rec)
    return out


def main() -> None:
    df = load_merged()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    records = to_records(df)
    payload = {
        "meta": {
            "competition": "AUS - A-League",
            "season": "2024/2025",
            "n_players": len(records),
            "n_teams": int(df["team_short"].nunique()),
            "positions": sorted(df["position_group"].dropna().unique().tolist()),
            "run_families": list(RUN_FAMILIES.keys()),
            "min_minutes": MIN_MINUTES,
        },
        "players": records,
    }
    out_path = OUT_DIR / "season_players.json"
    out_path.write_text(json.dumps(payload, separators=(",", ":")))
    print(f"Wrote {len(records)} players -> {out_path}")
    print(f"Teams: {payload['meta']['n_teams']}, positions: {payload['meta']['positions']}")


if __name__ == "__main__":
    main()
