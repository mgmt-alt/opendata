"""
Shooting & finishing from the SkillCorner Dynamic Events (10-match sample).

The season aggregate CSVs contain no shots — but the per-match ``*_dynamic_events.csv``
files do: a player possession that ends in a shot is a shot, and ``lead_to_goal``
marks the ones that produced a goal. This module aggregates those into a tidy
per-player table.

Scope & honesty
---------------
* Only the **10 matches** with dynamic events are covered (~38% of the season
  roster), so this is a *sample*, not a season-wide rating — keep it separate from
  the season SkillCorner Score, which is built from all-games aggregates.
* There is **no xG** in the open data (``xshot_*`` is empty), so this is shot
  **volume + goals**, not finishing quality.
* "Appearances" = distinct sample matches in which the player has any event, used to
  turn totals into per-match rates. (No per-player minutes exist in these files.)

Usage
-----
    python -m src.visualization.dynamic_events_agg          # writes shots JSON + prints top
    from src.visualization.dynamic_events_agg import shooting_table
"""
from __future__ import annotations

import glob
import json
from pathlib import Path

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[2]
MATCHES_GLOB = str(REPO_ROOT / "data" / "matches" / "*" / "*_dynamic_events.csv")
OUT_DIR = Path(__file__).resolve().parent / "output"


def _load_possessions() -> pd.DataFrame:
    """All player-possession events across the sample, with a shot flag."""
    frames = []
    for f in sorted(glob.glob(MATCHES_GLOB)):
        d = pd.read_csv(f, low_memory=False)
        pp = d[d["event_type"] == "player_possession"].copy()
        frames.append(pp[[
            "match_id", "player_id", "player_name", "team_shortname",
            "end_type", "lead_to_shot", "lead_to_goal", "carry",
        ]])
    ev = pd.concat(frames, ignore_index=True)
    ev["is_shot"] = ev["end_type"].astype(str).eq("shot")
    ev["is_goal"] = ev["is_shot"] & (ev["lead_to_goal"] == True)  # noqa: E712
    return ev


def shooting_table(min_apps: int = 1) -> pd.DataFrame:
    """Per-player shooting table for the 10-match sample, sorted by shots."""
    ev = _load_possessions()
    apps = ev.groupby("player_id")["match_id"].nunique().rename("sample_apps")
    name = ev.groupby("player_id")["player_name"].first()
    team = ev.groupby("player_id")["team_shortname"].last().rename("team")
    shots = ev.groupby("player_id")["is_shot"].sum().rename("shots")
    goals = ev.groupby("player_id")["is_goal"].sum().rename("goals")
    carries = ev.groupby("player_id")["carry"].sum().rename("carries")

    tbl = pd.concat([name, team, apps, shots, goals, carries], axis=1)
    tbl["shots"] = tbl["shots"].astype(int)
    tbl["goals"] = tbl["goals"].astype(int)
    tbl["carries"] = tbl["carries"].astype(int)
    tbl["shots_per_app"] = (tbl["shots"] / tbl["sample_apps"]).round(2)
    tbl["goals_per_app"] = (tbl["goals"] / tbl["sample_apps"]).round(2)
    tbl["conversion"] = (tbl["goals"] / tbl["shots"].where(tbl["shots"] > 0)).round(3)
    tbl = tbl[tbl["sample_apps"] >= min_apps]
    return tbl.reset_index().sort_values(["shots", "goals"], ascending=False)


def write_json() -> Path:
    """Write a compact per-player shooting payload for the dashboard to merge."""
    tbl = shooting_table()
    recs = {
        int(r.player_id): {
            "shots": int(r.shots), "goals": int(r.goals),
            "apps": int(r.sample_apps), "shots_per_app": float(r.shots_per_app),
            "carries": int(r.carries),
        }
        for r in tbl.itertuples()
    }
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / "sample_shooting.json"
    path.write_text(json.dumps(recs, separators=(",", ":")))
    return path


def main() -> None:
    tbl = shooting_table()
    path = write_json()
    total_shots = int(tbl["shots"].sum())
    print(f"10-match sample: {total_shots} shots, {int(tbl['goals'].sum())} goals, "
          f"{len(tbl)} players with possessions, {int((tbl['shots'] > 0).sum())} shooters.")
    print(f"Wrote {path}\n")
    print("Top 12 shot-takers (10-match sample):\n")
    view = tbl.head(12)[["player_name", "team", "sample_apps", "shots", "goals", "shots_per_app"]]
    print(view.to_string(index=False))


if __name__ == "__main__":
    main()
