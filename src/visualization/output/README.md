# 🏆 A-League 2024/25 — Season Explorer

⬅️ [Back to src README](../../README.md)

A set of visualizations built on the **season aggregates** (`data/aggregates/`) —
the Physical, Passing and Off-Ball-Run metrics for every A-League 2024/25 player
with **60+ minutes**. The three files are merged into one row per player (shown in
their primary position), giving a clean **268-player** dataset.

There are two deliverables:

1. **`season_dashboard.html`** — a single, self-contained interactive dashboard
   (no build step, no network calls; just open it in a browser). Filter by
   position, search any player, sort tables, re-weight the leaderboard, and hover
   every mark.
2. **Static PNG figures** in [`assets/viz/`](../../../assets/viz/) — the
   print/README companions below.

---

## 🏅 The SkillCorner Score — a leaderboard coefficient

A single **0–100** rating per player so you can rank the league. It is deliberately
transparent:

1. Each metric becomes a **percentile within the player's position group** (a defender
   is only ever compared to defenders).
2. Those percentiles roll up into three **sub-scores** — Athletic, Passing, Off-ball —
   each the mean of its metrics' percentiles.
3. The **Overall Score** is a weighted average of the three:

   > **Score = wₐ · Athletic + wₚ · Passing + wₒ · Off-ball**

   with the weights renormalised over whichever facets a player has data for.

In the dashboard the three weights are **live sliders** (plus presets — *Balanced,
Athlete, Playmaker, Runner, Creator*), so you can re-rank the league around what you
value. Only players with **3+ matches** and data in all three facets are ranked.
The full ranking is also exported to
[`season_leaderboard.csv`](season_leaderboard.csv).

![Season leaderboard](../../../assets/viz/leaderboard.png)

```python
from src.visualization.build_dashboard_data import load_merged
from src.visualization.player_score import compute_scores, leaderboard

df = load_merged()
compute_scores(df, weights={"Athletic": 1, "Passing": 2, "Off-ball": 2})  # tilt to creators
print(leaderboard(df, 20))                                                # tidy top-20
```

---

## The athletic map — speed vs work rate

Peak sprint speed (PSV99) against work rate (metres per minute), one small-multiple
panel per position so athletes are compared against like-for-like peers.

![Athletic map](../../../assets/viz/athletic_map.png)

## Passers — volume, security & risk

Pass volume against completion rate, coloured by whether a player completes **more**
than expected given pass difficulty (blue) or **fewer** (red). The bar is set by
SkillCorner's **xPass** model.

![Passing map](../../../assets/viz/passing_map.png)

## Player profile — percentile ranks vs peers

For any player, percentile ranks across 14 physical, passing and off-ball metrics,
measured against every other player in their position. Bars right of centre (blue)
are above the positional median; left (red) below.

![Player profile](../../../assets/viz/player_profile.png)

---

## Reproducing everything

From the repository root:

```bash
pip install -r requirements.txt

# 1. Merge the three aggregate CSVs into one per-player JSON
python -m src.visualization.build_dashboard_data

# 2. Build the self-contained interactive dashboard
python -m src.visualization.build_dashboard      # -> output/season_dashboard.html

# 3. Render the static PNG figures
python -m src.visualization.season_figures        # -> assets/viz/*.png

# (optional) export just the ranked leaderboard CSV
python -m src.visualization.player_score          # -> output/season_leaderboard.csv
```

## Design notes

- **Normalisation.** Physical metrics are per-match; passing and off-ball runs are
  **per 30 minutes in possession** (`p30tip`), so high- and low-possession players
  compare fairly.
- **Colour.** A colour-blind-safe palette; magnitude uses a single blue ramp,
  over/under-performance uses a blue↔red diverging scale, and the run-mix stack uses
  a validated categorical set. Every chart works in light and dark themes and ships a
  table view.
- **Peak sprint speed = PSV99**, the 99th percentile of a player's short-window
  speeds — a robust proxy for top speed that ignores tracking spikes.

_Data: SkillCorner × PySport open broadcast tracking data. Please credit
[SkillCorner](https://skillcorner.com) if you reuse it._
