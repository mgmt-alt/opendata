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

# ---------------------------------------------------------------------------
# EXTENDED metrics — not used by the SkillCorner Score, but pulled so users can
# deconstruct each silo (drill-down + scatter explorer). Same all-season source.
# ---------------------------------------------------------------------------
EXT_PHYS = {
    "running_distance_full_all": "run_dist",           # running (below HSR) distance
    "hsr_count_full_all": "hsr_count",                 # high-speed-running efforts
    "sprint_distance_full_all": "sprint_dist",         # metres sprinting
    "hi_distance_full_all": "hi_dist",                 # high-intensity distance
    "medaccel_count_full_all": "med_accel",
    "meddecel_count_full_all": "med_decel",
    "explacceltohsr_count_full_all": "expl_hsr",       # explosive accel into HSR
    "total_distance_full_tip": "dist_tip",             # distance IN possession
    "total_distance_full_otip": "dist_otip",           # distance OUT of possession
    "total_metersperminute_full_tip": "mpm_tip",       # work rate in possession
    "total_metersperminute_full_otip": "mpm_otip",     # work rate out of possession
    "hi_count_full_tip": "hi_tip",
    "hi_count_full_otip": "hi_otip",
    "sprint_count_full_tip": "sprint_tip",
    "sprint_count_full_otip": "sprint_otip",
}
EXT_PASS = {
    "pass_count_onetouch_attempted_p30tip": "onetouch",
    "pass_count_quickpass_attempted_p30tip": "quickpass",
    "pass_count_longrange_attempted_p30tip": "longrange",
    "pass_count_difficultpass_attempted_p30tip": "difficult_pass",
    "pass_pct_dangerous_completed": "dang_pass_pct",
    "pass_pct_torun_completed": "torun_pct",
    "passopportunity_count_linebreak_p30tip": "lb_opp",
    "pass_count_linebreak_attempted_p30tip": "lb_att",
    "pass_count_torun_shotwithin10s_p30tip": "torun_shot",
    "pass_count_torun_goalwithin10s_p30tip": "torun_goal",
    "passopportunity_count_dangerous_p30tip": "dang_opp",
}
# 11 individual off-ball run subtypes (per 30' in possession) — the run "fingerprint".
RUN_SUBTYPES = {
    "behindrun_count_p30tip": "run_behind",
    "crossreceiverrun_count_p30tip": "run_cross",
    "aheadoftheballrun_count_p30tip": "run_ahead",
    "comingshortrun_count_p30tip": "run_short",
    "droppingoffrun_count_p30tip": "run_dropping",
    "supportrun_count_p30tip": "run_support",
    "pullingwiderun_count_p30tip": "run_wide",
    "overlaprun_count_p30tip": "run_overlap",
    "underlaprun_count_p30tip": "run_underlap",
    "pullinghalfspacerun_count_p30tip": "run_halfspace",
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

# ---------------------------------------------------------------------------
# METRIC REGISTRY — the single source of truth the dashboard's silo drill-down and
# scatter explorer read. One row per metric:
#   key, label, silo, src ('season'=all games | 'sample'=10 matches),
#   better (+1 up-is-good | -1 down-is-good), scoring (feeds the silo score?), fmt.
# fmt: 'int' | '1dp' | 'pct' | 'kmh'.
# ---------------------------------------------------------------------------
_R = lambda k, l, s, src, better, scoring, fmt: dict(  # noqa: E731
    key=k, label=l, silo=s, src=src, better=better, scoring=scoring, fmt=fmt)
METRIC_REGISTRY = [
    # ----- Pace (season) -----
    _R("top_speed", "Peak sprint speed (PSV99)", "Pace", "season", 1, True, "kmh"),
    _R("sprints", "Sprints /match", "Pace", "season", 1, True, "1dp"),
    _R("expl_sprint", "Explosive sprints /match", "Pace", "season", 1, True, "1dp"),
    _R("high_accel", "High accelerations /match", "Pace", "season", 1, True, "1dp"),
    _R("sprint_dist", "Sprint distance /match (m)", "Pace", "season", 1, False, "int"),
    _R("hsr_count", "High-speed runs /match", "Pace", "season", 1, False, "1dp"),
    _R("expl_hsr", "Explosive accel into HSR /match", "Pace", "season", 1, False, "1dp"),
    _R("explosiveness", "Explosiveness (explosive-sprint %)", "Pace", "season", 1, False, "pct"),
    # ----- Physical (season) -----
    _R("distance", "Distance /match (m)", "Physical", "season", 1, True, "int"),
    _R("m_per_min", "Work rate (m/min)", "Physical", "season", 1, True, "1dp"),
    _R("hi_count", "High-intensity efforts /match", "Physical", "season", 1, True, "1dp"),
    _R("hsr_dist", "High-speed distance /match (m)", "Physical", "season", 1, True, "int"),
    _R("high_decel", "Hard decelerations /match", "Physical", "season", 1, True, "1dp"),
    _R("run_dist", "Running distance /match (m)", "Physical", "season", 1, False, "int"),
    _R("hi_dist", "High-intensity distance /match (m)", "Physical", "season", 1, False, "int"),
    _R("hi_share", "High-intensity share of distance", "Physical", "season", 1, False, "pct"),
    _R("mpm_tip", "Work rate in possession (m/min)", "Physical", "season", 1, False, "1dp"),
    _R("mpm_otip", "Work rate out of possession (m/min)", "Physical", "season", 1, False, "1dp"),
    _R("wr_balance", "Work-rate balance (in − out)", "Physical", "season", 0, False, "1dp"),
    _R("accel_decel", "Accel : decel ratio", "Physical", "season", 0, False, "1dp"),
    # ----- Passing (season) -----
    _R("pass_over", "Pass over-performance (vs xPass)", "Passing", "season", 1, True, "1dp"),
    _R("pass_pct", "Pass completion %", "Passing", "season", 1, True, "pct"),
    _R("pass_vol", "Passes /30 in poss.", "Passing", "season", 1, True, "1dp"),
    _R("pass_dist", "Avg pass distance (m)", "Passing", "season", 1, True, "1dp"),
    _R("onetouch", "One-touch passes /30", "Passing", "season", 1, False, "1dp"),
    _R("quickpass", "Quick passes /30", "Passing", "season", 1, False, "1dp"),
    _R("longrange", "Long-range passes /30", "Passing", "season", 1, False, "1dp"),
    _R("difficult_pass", "Difficult passes /30", "Passing", "season", 1, False, "1dp"),
    _R("dang_pass_pct", "Dangerous-pass completion %", "Passing", "season", 1, False, "pct"),
    _R("tempo", "Tempo (one-touch %)", "Passing", "season", 1, False, "pct"),
    _R("longball_share", "Long-ball share", "Passing", "season", 0, False, "pct"),
    # ----- Creation (season) -----
    _R("dangerous_passes", "Dangerous passes /30", "Creation", "season", 1, True, "1dp"),
    _R("linebreaks", "Line-breaking passes /30", "Creation", "season", 1, True, "1dp"),
    _R("pass_shot", "Passes → shot /30", "Creation", "season", 1, True, "1dp"),
    _R("pass_torun", "Passes into a run /30", "Creation", "season", 1, True, "1dp"),
    _R("pass_goal", "Passes → goal /30", "Creation", "season", 1, True, "1dp"),
    _R("torun_pct", "Pass-into-run completion %", "Creation", "season", 1, False, "pct"),
    _R("torun_shot", "Pass-into-run → shot /30", "Creation", "season", 1, False, "1dp"),
    _R("dang_opp", "Dangerous-pass opportunities /30", "Creation", "season", 1, False, "1dp"),
    _R("lb_conv", "Line-break conversion %", "Creation", "season", 1, False, "pct"),
    # ----- Movement (season) -----
    _R("dangerous_runs", "Dangerous runs /30", "Movement", "season", 1, True, "1dp"),
    _R("runs_received", "Runs received /30", "Movement", "season", 1, True, "1dp"),
    _R("run_shot", "Runs → shot /30", "Movement", "season", 1, True, "1dp"),
    _R("runs_targeted", "Runs targeted /30", "Movement", "season", 1, True, "1dp"),
    _R("runs_box", "Runs into the box /30", "Movement", "season", 1, True, "1dp"),
    _R("runs", "Off-ball runs /30", "Movement", "season", 1, True, "1dp"),
    _R("run_behind", "In-behind runs /30", "Movement", "season", 1, False, "1dp"),
    _R("run_cross", "Cross-receiver runs /30", "Movement", "season", 1, False, "1dp"),
    _R("run_ahead", "Ahead-of-ball runs /30", "Movement", "season", 1, False, "1dp"),
    _R("run_short", "Coming-short runs /30", "Movement", "season", 1, False, "1dp"),
    _R("run_dropping", "Dropping-off runs /30", "Movement", "season", 1, False, "1dp"),
    _R("run_support", "Support runs /30", "Movement", "season", 1, False, "1dp"),
    _R("run_wide", "Pulling-wide runs /30", "Movement", "season", 1, False, "1dp"),
    _R("run_overlap", "Overlap runs /30", "Movement", "season", 1, False, "1dp"),
    _R("run_underlap", "Underlap runs /30", "Movement", "season", 1, False, "1dp"),
    _R("run_halfspace", "Pulling-half-space runs /30", "Movement", "season", 1, False, "1dp"),
    _R("run_danger_rate", "Run danger rate", "Movement", "season", 1, False, "pct"),
    _R("run_reward", "Run reward (runs → shot %)", "Movement", "season", 1, False, "pct"),
    _R("run_target_rate", "Run target rate", "Movement", "season", 1, False, "pct"),
    _R("run_xthreat", "xThreat from runs (sample)", "Movement", "sample", 1, False, "1dp"),
    # ----- Shooting (10-match sample) -----
    _R("shots", "Shots (sample total)", "Shooting", "sample", 1, True, "int"),
    _R("goals", "Goals (sample total)", "Shooting", "sample", 1, True, "int"),
    _R("shots_box", "Shots in the box (total)", "Shooting", "sample", 1, False, "int"),
    _R("shots_head", "Headed shots (total)", "Shooting", "sample", 1, False, "int"),
    _R("conversion", "Goal conversion", "Shooting", "sample", 1, False, "pct"),
    _R("box_shot_pct", "Shots taken in the box %", "Shooting", "sample", 1, False, "pct"),
    # ----- Defending (10-match sample) -----
    _R("regains", "Ball regains (total)", "Defending", "sample", 1, True, "int"),
    _R("pressures", "Pressures (total)", "Defending", "sample", 1, True, "int"),
    _R("disruptions", "Disruptions (total)", "Defending", "sample", 1, True, "int"),
    _R("danger_prevented", "Danger prevented (stops+reduces)", "Defending", "sample", 1, False, "int"),
    _R("danger_stopped", "Danger stopped (total)", "Defending", "sample", 1, False, "int"),
    _R("force_back", "Forced backward (total)", "Defending", "sample", 1, False, "int"),
    _R("def_success", "Defensive success (regains/pressure)", "Defending", "sample", 1, False, "pct"),
    _R("beaten_mov", "Beaten off the ball (total)", "Defending", "sample", -1, False, "int"),
    # ----- Dribbling (10-match sample) -----
    _R("takeons", "Take-ons — defenders beaten (total)", "Dribbling", "sample", 1, True, "int"),
    _R("carries", "Ball carries (total)", "Dribbling", "sample", 1, False, "int"),
    _R("carry_dist", "Carry distance (total m)", "Dribbling", "sample", 1, False, "int"),
    _R("progcarries", "Progressive carries (total)", "Dribbling", "sample", 1, False, "int"),
    _R("opp_bypassed", "Opponents bypassed by carry", "Dribbling", "sample", 1, False, "int"),
    _R("opp_overtaken", "Opponents overtaken by carry", "Dribbling", "sample", 1, False, "int"),
    _R("carry_sep", "Separation gained carrying (m)", "Dribbling", "sample", 1, False, "1dp"),
    _R("progcarry_pct", "Progressive-carry share", "Dribbling", "sample", 1, False, "pct"),
    _R("elim_per_carry", "Eliminations per carry", "Dribbling", "sample", 1, False, "1dp"),
]
SEASON_EXTRA_KEYS = [m["key"] for m in METRIC_REGISTRY
                     if m["src"] == "season" and m["key"] not in {
                         *PHYS_COLS.values(), *PASS_COLS.values(), *OBR_COLS.values(), "pass_over"}]


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
            *EXT_PHYS.keys(),
        ]
    ].rename(columns={"minutes_full_all": "minutes", "count_match": "matches"})
    base = base.rename(columns={**PHYS_COLS, **EXT_PHYS})

    pas_keep = pas[[*KEY, *PASS_COLS.keys(), *EXT_PASS.keys()]].rename(
        columns={**PASS_COLS, **EXT_PASS})
    # RUN_SUBTYPES already pulls every column the run families are built from, so select
    # once and rename to the short run_* keys; families are re-summed from those below.
    obr_keep = obr[[*KEY, *OBR_COLS.keys(), *RUN_SUBTYPES.keys()]].rename(
        columns={**OBR_COLS, **RUN_SUBTYPES})

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

    # ----- Calculated ("not in any raw column") metrics for silo deconstruction -----
    def _safe(n, d):
        return np.where((d.notna()) & (d != 0), n / d.replace(0, np.nan), np.nan)

    # PACE: share of sprints entered with an explosive acceleration (burst quality).
    df["explosiveness"] = (_safe(df["expl_sprint"], df["sprints"]) * 100).round(1)
    # PHYSICAL: high-intensity distance as a share of total (intensity of the running),
    # and work-rate balance — metres/min in vs out of possession (attack vs recover engine).
    df["hi_share"] = (_safe(df["hi_dist"], df["distance"]) * 100).round(1)
    df["wr_balance"] = (df["mpm_tip"] - df["mpm_otip"]).round(1)
    df["accel_decel"] = (_safe(df["high_accel"], df["high_decel"])).round(2)
    # PASSING: tempo (one-touch share) and long-range share of pass volume.
    df["tempo"] = (_safe(df["onetouch"], df["pass_vol"]) * 100).round(1)
    df["longball_share"] = (_safe(df["longrange"], df["pass_vol"]) * 100).round(1)
    # CREATION: line-break conversion — completed line-breaks per line-break opportunity.
    df["lb_conv"] = (_safe(df["linebreaks"], df["lb_opp"]) * 100).round(1)
    # MOVEMENT: how many runs are dangerous / rewarded / found by a pass.
    df["run_danger_rate"] = (_safe(df["dangerous_runs"], df["runs"]) * 100).round(1)
    df["run_reward"] = (_safe(df["run_shot"], df["runs"]) * 100).round(1)
    df["run_target_rate"] = (_safe(df["runs_targeted"], df["runs"]) * 100).round(1)

    # Collapse run subtypes into families (using the renamed short run_* keys).
    for family, cols in RUN_FAMILIES.items():
        new_cols = [RUN_SUBTYPES[c] for c in cols]
        df[f"run__{family}"] = df[new_cols].sum(axis=1)

    df["team_short"] = df["team_name"].map(_short_team)
    return df


def to_records(df: pd.DataFrame) -> list[dict]:
    """Convert to JSON-safe records, rounding floats for a compact payload."""
    run_family_keys = [f"run__{f}" for f in RUN_FAMILIES]
    season_keys = [m["key"] for m in METRIC_REGISTRY if m["src"] == "season"]
    keep = [
        "player_id", "player_short_name", "player_name", "team_short",
        "position_group", "minutes", "matches",
        *season_keys, *run_family_keys,
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
            "metrics": METRIC_REGISTRY,
        },
        "players": records,
    }
    out_path = OUT_DIR / "season_players.json"
    out_path.write_text(json.dumps(payload, separators=(",", ":")))
    print(f"Wrote {len(records)} players -> {out_path}")
    print(f"Teams: {payload['meta']['n_teams']}, positions: {payload['meta']['positions']}")


if __name__ == "__main__":
    main()
