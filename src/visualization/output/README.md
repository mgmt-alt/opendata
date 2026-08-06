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

## 🏅 The SkillCorner Score — a FIFA-style rating

A single **0–100** rating per player so you can rank the league, built like a FIFA
card but **only from the faces broadcast tracking data can actually see**.

**What the data supports (five silos):**

| Silo | ~ FIFA face | Built from |
|---|---|---|
| **Pace** | PAC | peak sprint speed (PSV99), sprint volume, explosive accelerations |
| **Physical** | PHY | distance, work rate, high-intensity volume, high-speed running, braking |
| **Passing** | PAS | beating xPass, completion %, volume, range |
| **Creation** | *vision* | dangerous & line-breaking passes, passes into shots/runs |
| **Movement** | *(FIFA has none)* | dangerous off-ball runs, runs received, runs into shots/box |
| **Shooting** † | SHO | one **shot value** = `shots + 9·goals` per app (goals ≫ shots) |
| **Defending** † | DEF | pressing engagements + ball regains + disruptions |
| **Dribbling** † | DRI | carries + carry distance + progressive carries |

† 10-match sample only (~155 players).

**Two scopes.** The first five silos come from the *all-games* aggregates and cover
every player. The three sample silos come from the per-match **dynamic events** in the 10
tracked matches. The dashboard **defaults to all eight silos** (matching the comparison
radar); its green **Shooting · Defending · Dribbling (10-match)** toggle switches to the
5-silo, all-players season view. There is **no xG** anywhere in the open data.

**Shooting is a single composite, not an average of separate percentiles.** Averaging a
shots-percentile and a goals-percentile lets a high-volume non-scorer out-rank a scorer,
so instead we percentile one value, `shots + 9·goals` per appearance (a goal ≈ 9 blank
shots, ~league conversion). This guarantees every goalscorer ranks above every
non-scorer, and a player with no shots or goals sits at the floor. (Shots on target would
sit between goals and shots, but the open data has no on-target flag.)

Position weights extend to all eight silos (e.g. a centre-back's Defending is heavily
weighted, a forward's Shooting). Both rankings export to
[`season_leaderboard.csv`](season_leaderboard.csv) (5 silos) and
[`sample_leaderboard.csv`](sample_leaderboard.csv) (8 silos).

![Full-profile leaderboard](../../../assets/viz/leaderboard_full.png)

Compare any two players across the silo axes with the **radar**:

![Radar comparison](../../../assets/viz/radar_compare.png)

**Method:**
1. Each metric → **percentile within the player's position group**.
2. Each silo = a **weighted blend** of its metrics' percentiles (weights in
   `SILOS` — e.g. beating xPass counts 3×, raw volume 1×).
3. Overall = weighted mean of the five silos, **weighted by position** by default
   (`POSITION_WEIGHTS` — a centre-back leans on Physical/Passing, a forward on
   Creation/Movement) or with one custom weight set:

   > **Score = Σ wₛ · Siloₛ**   (weights renormalise over the silos a player has)

In the dashboard, choose **By position** (role-based) or drag five weight sliders
(presets: *Balanced, Athlete, Creator, Engine, Poacher*). Each player also gets a
**FIFA-style card** — five faces + OVR, with the three unmeasurable faces greyed out.
Only players with **3+ matches** and data in all five silos are ranked; the full
table is exported to [`season_leaderboard.csv`](season_leaderboard.csv).

![Season leaderboard](../../../assets/viz/leaderboard.png)

![Player card](../../../assets/viz/player_card.png)

```python
from src.visualization.build_dashboard_data import load_merged
from src.visualization.player_score import compute_scores, leaderboard

df = load_merged()
compute_scores(df)                                       # 5 season silos, all players
compute_scores(df, include_sample=True)                  # 8 silos, 10-match sample only
compute_scores(df, silo_weights={"Shooting": 3, "Movement": 2})  # custom lens
print(leaderboard(df, 20, include_sample=True))          # tidy top-20 with all eight faces
```

---

## Shooting & finishing — the 10-match sample

The season aggregates carry no shots, but the per-match dynamic events do: a player
possession ending in a shot is a shot, and `lead_to_goal` flags the ones that produced a
goal. `dynamic_events_agg.py` aggregates these across the **10 tracked matches** (226
shots, 26 goals, 104 shooters). It is a **sample** (~38% of the roster) with **no xG**,
so it is kept out of the season score and shown on its own — as a section in the
dashboard and a `Shooting*` face on each sampled player's card.

![Shooting sample](../../../assets/viz/shooting.png)

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

For any player, percentile ranks across the metrics behind the five silos,
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

# (optional) shooting from the 10-match dynamic events
python -m src.visualization.dynamic_events_agg    # -> output/sample_shooting.json
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
