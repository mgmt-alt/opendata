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

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[2]
MATCHES_GLOB = str(REPO_ROOT / "data" / "matches" / "*" / "*_dynamic_events.csv")
OUT_DIR = Path(__file__).resolve().parent / "output"

PROG_CARRY_M = 10.0  # a carry covering >= this many metres counts as "progressive"

# Per-appearance metric -> (raw column produced below). Used by player_score's silos.
SAMPLE_RATE_COLS = [
    "shots_pa", "goals_pa", "regains_pa", "pressures_pa", "disruptions_pa",
    "carries_pa", "carrydist_pa", "progcarry_pa",
]


def _load_events() -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Return (appearances, possessions, engagements) across the sample."""
    apps_rows, poss, eng = [], [], []
    for f in sorted(glob.glob(MATCHES_GLOB)):
        d = pd.read_csv(f, low_memory=False)
        apps_rows.append(d[["match_id", "player_id"]].dropna())
        pp = d[d["event_type"] == "player_possession"]
        poss.append(pp[["match_id", "player_id", "player_name", "team_shortname",
                        "end_type", "lead_to_goal", "carry", "distance_covered"]])
        oe = d[d["event_type"] == "on_ball_engagement"]
        eng.append(oe[["match_id", "player_id", "end_type"]])
    return (pd.concat(apps_rows, ignore_index=True),
            pd.concat(poss, ignore_index=True),
            pd.concat(eng, ignore_index=True))


def sample_table(min_apps: int = 1) -> pd.DataFrame:
    """Per-player game-intelligence table for the 10-match sample."""
    apps_ev, P, E = _load_events()
    apps = apps_ev.groupby("player_id")["match_id"].nunique().rename("apps")

    P = P.copy()
    P["is_shot"] = P["end_type"].astype(str).eq("shot")
    P["is_goal"] = P["is_shot"] & (P["lead_to_goal"] == True)  # noqa: E712
    P["is_carry"] = P["carry"] == True  # noqa: E712
    P["carry_dist"] = P["distance_covered"].where(P["is_carry"], 0.0)
    P["is_progcarry"] = P["is_carry"] & (P["distance_covered"] >= PROG_CARRY_M)

    E = E.copy()
    E["is_regain"] = E["end_type"].astype(str).str.contains("regain")
    E["is_disrupt"] = E["end_type"].astype(str).str.contains("disruption")

    g = P.groupby("player_id")
    tbl = pd.DataFrame({
        "player_name": g["player_name"].first(),
        "team": g["team_shortname"].last(),
        "shots": g["is_shot"].sum().astype(int),
        "goals": g["is_goal"].sum().astype(int),
        "carries": g["is_carry"].sum().astype(int),
        "carry_dist": g["carry_dist"].sum().round(0),
        "progcarries": g["is_progcarry"].sum().astype(int),
    })
    eg = E.groupby("player_id")
    tbl["pressures"] = eg.size().reindex(tbl.index).fillna(0).astype(int)
    tbl["regains"] = eg["is_regain"].sum().reindex(tbl.index).fillna(0).astype(int)
    tbl["disruptions"] = eg["is_disrupt"].sum().reindex(tbl.index).fillna(0).astype(int)

    tbl = tbl.join(apps, how="left")
    tbl["apps"] = tbl["apps"].fillna(1).astype(int)
    tbl = tbl[tbl["apps"] >= min_apps]

    # per-appearance rates
    for raw, rate in [("shots", "shots_pa"), ("goals", "goals_pa"),
                      ("regains", "regains_pa"), ("pressures", "pressures_pa"),
                      ("disruptions", "disruptions_pa"), ("carries", "carries_pa"),
                      ("carry_dist", "carrydist_pa"), ("progcarries", "progcarry_pa")]:
        tbl[rate] = (tbl[raw] / tbl["apps"]).round(3)
    return tbl.reset_index()


def load_sample() -> pd.DataFrame:
    """Sample table indexed by player_id (for merging into the season table)."""
    return sample_table().set_index("player_id")


def write_json() -> Path:
    """Write a compact per-player sample payload for the dashboard to merge."""
    tbl = sample_table()
    recs = {}
    for r in tbl.itertuples():
        recs[int(r.player_id)] = {
            "apps": int(r.apps),
            "shots": int(r.shots), "goals": int(r.goals),
            "regains": int(r.regains), "pressures": int(r.pressures),
            "disruptions": int(r.disruptions),
            "carries": int(r.carries), "carry_dist": int(r.carry_dist),
            "progcarries": int(r.progcarries),
            **{c: float(getattr(r, c)) for c in SAMPLE_RATE_COLS},
        }
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / "sample_events.json"
    path.write_text(json.dumps(recs, separators=(",", ":")))
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
