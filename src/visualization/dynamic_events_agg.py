"""
Game-intelligence metrics from the SkillCorner Dynamic Events (10-match sample).

The season aggregate CSVs cover movement + on-ball passing only. The per-match
``*_dynamic_events.csv`` files add the three faces the aggregates lack:

* **Shooting**  — a player possession ending in a shot; ``lead_to_goal`` marks goals.
* **Defending** — ``on_ball_engagement`` events (pressures) and their outcomes
  (``*_regain`` = ball won, ``*_disruption`` = ball disrupted).
* **Dribbling** — ball carries (``carry``) and the distance covered with them.

This module aggregates all three into a per-player table for the sample.

Scope & honesty
---------------
* Only the **10 tracked matches** are covered (~38% of the season roster) — a sample,
  not a season-wide rating. There is **no xG** in the open data.
* Rates are **per appearance** (a tracked match the player features in); there are no
  per-player minutes in these files.

Usage
-----
    python -m src.visualization.dynamic_events_agg      # writes sample_events.json
    from src.visualization.dynamic_events_agg import sample_table, load_sample
"""
from __future__ import annotations

import glob
import json
from pathlib import Path

import numpy as np
import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[2]
MATCHES_GLOB = str(REPO_ROOT / "data" / "matches" / "*" / "*_dynamic_events.csv")
OUT_DIR = Path(__file__).resolve().parent / "output"

PROG_CARRY_M = 10.0  # a carry covering >= this many metres counts as "progressive"
# A goal is worth this many blank shots in the shooting metric (~league conversion),
# so goals dominate: any scorer out-ranks any non-scorer, and shot volume still counts.
# (Shots on target would sit between goals and shots, but the open data has no on-target
# flag and no xG, so the hierarchy here is goals >> shots.)
GOAL_SHOT_WEIGHT = 9.0

# Per-appearance metric -> (raw column produced below). Used by player_score's silos.
SAMPLE_RATE_COLS = [
    "shotval_pa", "shots_pa", "goals_pa", "regains_pa", "pressures_pa", "disruptions_pa",
    "carries_pa", "carrydist_pa", "progcarry_pa",
]


# Spatial heat-map grid. Dynamic-event coordinates are attack-normalised (+x = the
# attacking end), pitch ~105 x 68 m centred on 0. We bin each player's action locations
# into a coarse grid so the dashboard can draw where they operate without shipping raw
# points. Three layers: on-ball touches, defensive engagements, off-ball runs.
GRID_COLS = 12   # along the pitch length (attacking direction, left -> right)
GRID_ROWS = 8    # across the pitch width
PITCH_X = 52.5   # half-length (metres)
PITCH_Y = 34.0   # half-width (metres)
HEATMAP_LAYERS = {
    "touch": "player_possession",
    "defend": "on_ball_engagement",
    "run": "off_ball_run",
}


def _load_events() -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Return (appearances, possessions, engagements) across the sample."""
    apps_rows, poss, eng = [], [], []
    for f in sorted(glob.glob(MATCHES_GLOB)):
        d = pd.read_csv(f, low_memory=False)
        apps_rows.append(d[["match_id", "player_id"]].dropna())
        pp = d[d["event_type"] == "player_possession"]
        poss.append(pp[["match_id", "player_id", "player_name", "team_shortname",
                        "end_type", "lead_to_goal", "carry", "distance_covered",
                        "is_header", "penalty_area_start",
                        "n_opponents_bypassed", "n_opponents_overtaken", "separation_gain"]])
        oe = d[d["event_type"] == "on_ball_engagement"]
        eng.append(oe[["match_id", "player_id", "end_type", "player_in_possession_id",
                       "beaten_by_possession", "beaten_by_movement",
                       "stop_possession_danger", "reduce_possession_danger", "force_backward"]])
    return (pd.concat(apps_rows, ignore_index=True),
            pd.concat(poss, ignore_index=True),
            pd.concat(eng, ignore_index=True))


def _run_xthreat() -> pd.Series:
    """Total expected threat a player generates with their OFF-BALL RUNS (credited to the
    runner, ``player_id`` on ``off_ball_run`` events). Unique to the dynamic events — the
    aggregates carry no xThreat."""
    parts = []
    for f in sorted(glob.glob(MATCHES_GLOB)):
        d = pd.read_csv(f, low_memory=False)
        r = d[d["event_type"] == "off_ball_run"]
        parts.append(r[["player_id", "xthreat"]])
    R = pd.concat(parts, ignore_index=True)
    return R.groupby("player_id")["xthreat"].sum()


def heatmaps(min_events: int = 12) -> dict[int, dict[str, list[int]]]:
    """Per-player binned action grids for the three layers. Each grid is a flat
    ``GRID_ROWS x GRID_COLS`` int list (row-major, attacking left -> right)."""
    acc: dict[int, dict[str, np.ndarray]] = {}
    for f in sorted(glob.glob(MATCHES_GLOB)):
        d = pd.read_csv(f, low_memory=False)
        for layer, etype in HEATMAP_LAYERS.items():
            s = d[(d["event_type"] == etype) & d["x_start"].notna() & d["y_start"].notna()]
            if s.empty:
                continue
            cx = np.clip(((s["x_start"] + PITCH_X) / (2 * PITCH_X) * GRID_COLS).astype(int), 0, GRID_COLS - 1)
            cy = np.clip(((s["y_start"] + PITCH_Y) / (2 * PITCH_Y) * GRID_ROWS).astype(int), 0, GRID_ROWS - 1)
            cell = cy * GRID_COLS + cx
            for pid, c in zip(s["player_id"].to_numpy(), cell.to_numpy()):
                if pd.isna(pid):
                    continue
                pid = int(pid)
                grid = acc.setdefault(pid, {}).setdefault(layer, np.zeros(GRID_ROWS * GRID_COLS, int))
                grid[c] += 1
    out: dict[int, dict[str, list[int]]] = {}
    for pid, layers in acc.items():
        if sum(int(g.sum()) for g in layers.values()) < min_events:
            continue
        out[pid] = {lay: acc[pid].get(lay, np.zeros(GRID_ROWS * GRID_COLS, int)).tolist()
                    for lay in HEATMAP_LAYERS}
    return out


def sample_table(min_apps: int = 1) -> pd.DataFrame:
    """Per-player game-intelligence table for the 10-match sample."""
    apps_ev, P, E = _load_events()
    apps = apps_ev.groupby("player_id")["match_id"].nunique().rename("apps")

    P = P.copy()
    P["is_shot"] = P["end_type"].astype(str).eq("shot")
    P["is_goal"] = P["is_shot"] & (P["lead_to_goal"] == True)  # noqa: E712
    P["is_shot_box"] = P["is_shot"] & (P["penalty_area_start"] == True)  # noqa: E712
    P["is_shot_head"] = P["is_shot"] & (P["is_header"] == True)  # noqa: E712
    P["is_clear"] = P["end_type"].astype(str).eq("clearance")   # a defensive clearance
    P["is_carry"] = P["carry"] == True  # noqa: E712
    P["carry_dist"] = P["distance_covered"].where(P["is_carry"], 0.0)
    P["is_progcarry"] = P["is_carry"] & (P["distance_covered"] >= PROG_CARRY_M)
    # opponents eliminated / separation gained by the carry (only positive contributions)
    P["carry_bypassed"] = P["n_opponents_bypassed"].clip(lower=0).where(P["is_carry"], 0.0)
    P["carry_overtaken"] = P["n_opponents_overtaken"].clip(lower=0).where(P["is_carry"], 0.0)
    P["carry_sep"] = P["separation_gain"].clip(lower=0).where(P["is_carry"], 0.0)

    E = E.copy()
    E["is_regain"] = E["end_type"].astype(str).str.contains("regain")
    E["is_disrupt"] = E["end_type"].astype(str).str.contains("disruption")

    g = P.groupby("player_id")
    tbl = pd.DataFrame({
        "player_name": g["player_name"].first(),
        "team": g["team_shortname"].last(),
        "shots": g["is_shot"].sum().astype(int),
        "goals": g["is_goal"].sum().astype(int),
        "shots_box": g["is_shot_box"].sum().astype(int),
        "shots_head": g["is_shot_head"].sum().astype(int),
        "clearances": g["is_clear"].sum().astype(int),
        "carries": g["is_carry"].sum().astype(int),
        "carry_dist": g["carry_dist"].sum().round(0),
        "progcarries": g["is_progcarry"].sum().astype(int),
        "opp_bypassed": g["carry_bypassed"].sum().round(0).astype(int),
        "opp_overtaken": g["carry_overtaken"].sum().round(0).astype(int),
        "carry_sep": g["carry_sep"].sum().round(1),
    })
    eg = E.groupby("player_id")
    tbl["pressures"] = eg.size().reindex(tbl.index).fillna(0).astype(int)
    tbl["regains"] = eg["is_regain"].sum().reindex(tbl.index).fillna(0).astype(int)
    tbl["disruptions"] = eg["is_disrupt"].sum().reindex(tbl.index).fillna(0).astype(int)
    # defensive-action QUALITY (not just count): danger stopped/reduced, forcing play
    # backward, and — the flip side — being beaten off the ball (a vulnerability).
    tbl["danger_stopped"] = eg["stop_possession_danger"].sum().reindex(tbl.index).fillna(0).astype(int)
    tbl["danger_reduced"] = eg["reduce_possession_danger"].sum().reindex(tbl.index).fillna(0).astype(int)
    tbl["force_back"] = eg["force_backward"].sum().reindex(tbl.index).fillna(0).astype(int)
    tbl["beaten_mov"] = eg["beaten_by_movement"].sum().reindex(tbl.index).fillna(0).astype(int)

    # take-ons: a defender was beaten by the carrier's dribble — credit the ball-carrier
    # (player_in_possession_id). This is a true 1v1 take-on, unlike raw ball carries which
    # centre-backs/full-backs rack up in build-up without beating anyone.
    beaten = E[E["beaten_by_possession"] == True]  # noqa: E712
    takeons = beaten.groupby("player_in_possession_id").size()
    tbl["takeons"] = takeons.reindex(tbl.index).fillna(0).astype(int)

    # expected threat generated by off-ball runs (unique to the events — no xThreat in aggregates)
    tbl["run_xthreat"] = _run_xthreat().reindex(tbl.index).fillna(0.0).round(2)

    # calculated (not-in-raw) rates: finishing conversion, defensive success, danger prevented,
    # carry progression & elimination — the "nuggets" that aren't a single column anywhere.
    tbl["conversion"] = (tbl["goals"] / tbl["shots"].where(tbl["shots"] > 0)).round(3)
    tbl["box_shot_pct"] = (tbl["shots_box"] / tbl["shots"].where(tbl["shots"] > 0) * 100).round(1)
    tbl["def_success"] = (tbl["regains"] / tbl["pressures"].where(tbl["pressures"] > 0) * 100).round(1)
    tbl["danger_prevented"] = (tbl["danger_stopped"] + tbl["danger_reduced"]).astype(int)
    tbl["progcarry_pct"] = (tbl["progcarries"] / tbl["carries"].where(tbl["carries"] > 0) * 100).round(1)
    tbl["elim_per_carry"] = (tbl["opp_overtaken"] / tbl["carries"].where(tbl["carries"] > 0)).round(3)

    tbl = tbl.join(apps, how="left")
    tbl["apps"] = tbl["apps"].fillna(1).astype(int)
    tbl = tbl[tbl["apps"] >= min_apps]

    # per-appearance rates
    for raw, rate in [("shots", "shots_pa"), ("goals", "goals_pa"),
                      ("regains", "regains_pa"), ("pressures", "pressures_pa"),
                      ("disruptions", "disruptions_pa"), ("carries", "carries_pa"),
                      ("carry_dist", "carrydist_pa"), ("progcarries", "progcarry_pa")]:
        tbl[rate] = (tbl[raw] / tbl["apps"]).round(3)
    # single shooting value: goals dominate, shots still count (goals >> shots)
    tbl["shotval_pa"] = (tbl["shots_pa"] + GOAL_SHOT_WEIGHT * tbl["goals_pa"]).round(3)
    return tbl.reset_index()


def load_sample() -> pd.DataFrame:
    """Sample table indexed by player_id (for merging into the season table)."""
    return sample_table().set_index("player_id")


# Extra per-player counts/rates carried into the dashboard for the drill-down, scatter
# explorer and enriched charts (on top of the originals the score depends on).
SAMPLE_EXTRA_INT = [
    "shots_box", "shots_head", "clearances", "opp_bypassed", "opp_overtaken",
    "danger_stopped", "danger_reduced", "force_back", "beaten_mov", "danger_prevented",
]
SAMPLE_EXTRA_FLOAT = [
    "carry_sep", "run_xthreat", "conversion", "box_shot_pct",
    "def_success", "progcarry_pct", "elim_per_carry",
]


def _num(v, as_int: bool):
    if pd.isna(v):
        return None
    return int(v) if as_int else round(float(v), 3)


def write_json() -> Path:
    """Write a compact per-player sample payload for the dashboard to merge."""
    tbl = sample_table()
    grids = heatmaps()
    recs = {}
    for r in tbl.itertuples():
        pid = int(r.player_id)
        rec = {
            "apps": int(r.apps),
            "shots": int(r.shots), "goals": int(r.goals),
            "regains": int(r.regains), "pressures": int(r.pressures),
            "disruptions": int(r.disruptions),
            "carries": int(r.carries), "carry_dist": int(r.carry_dist),
            "progcarries": int(r.progcarries), "takeons": int(r.takeons),
            **{c: float(getattr(r, c)) for c in SAMPLE_RATE_COLS},
            **{c: _num(getattr(r, c), True) for c in SAMPLE_EXTRA_INT},
            **{c: _num(getattr(r, c), False) for c in SAMPLE_EXTRA_FLOAT},
        }
        if pid in grids:
            rec["grid"] = grids[pid]
        recs[pid] = rec
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / "sample_events.json"
    payload = {
        "meta": {
            "grid_cols": GRID_COLS, "grid_rows": GRID_ROWS,
            "layers": list(HEATMAP_LAYERS),
        },
        "players": recs,
    }
    path.write_text(json.dumps(payload, separators=(",", ":")))
    return path


def main() -> None:
    tbl = sample_table()
    path = write_json()
    print(f"10-match sample: {len(tbl)} players | "
          f"{int(tbl['shots'].sum())} shots, {int(tbl['goals'].sum())} goals, "
          f"{int(tbl['regains'].sum())} regains, {int(tbl['carries'].sum())} carries.")
    print(f"Wrote {path}\n")
    print("Top 10 shot-takers:")
    print(tbl.sort_values("shots", ascending=False)
          .head(10)[["player_name", "team", "apps", "shots", "goals", "regains", "carries"]]
          .to_string(index=False))


if __name__ == "__main__":
    main()
