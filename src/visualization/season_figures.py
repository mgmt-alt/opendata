"""
Publication-quality static figures from the A-League 2024/25 season aggregates.

These are the print/README companions to the interactive ``season_dashboard.html``
(GitHub does not render the interactive page inline). Each figure is saved to
``assets/viz/`` as a high-DPI PNG in both light and a shared, colour-blind-safe
palette consistent with the dashboard.

Figures
-------
1. athletic_map.png    Sprint speed vs work rate, small-multiples by position.
2. passing_map.png     Pass volume vs completion, coloured by xPass over-performance.
3. player_profile.png  Percentile profile bars for a standout player vs peers.

Usage
-----
    python -m src.visualization.season_figures
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib as mpl
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D

from src.visualization.build_dashboard_data import load_merged, RUN_FAMILIES  # noqa: F401
from src.visualization.player_score import (
    compute_scores, SILO_NAMES, ALL_SILO_NAMES, SAMPLE_SILO_NAMES,
    POSITION_WEIGHTS, BALANCED_WEIGHTS,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = REPO_ROOT / "assets" / "viz"

# Palette consistent with the dashboard (validated categorical + diverging).
INK = "#0b0b0b"
INK2 = "#52514e"
MUTED = "#898781"
GRID = "#e1e0d9"
SURFACE = "#fcfcfb"
BLUE = "#2a78d6"
RED = "#e34948"
MID = "#c9c8c2"
CAT = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"]

mpl.rcParams.update({
    "font.family": "DejaVu Sans",
    "figure.facecolor": SURFACE,
    "axes.facecolor": SURFACE,
    "savefig.facecolor": SURFACE,
    "text.color": INK,
    "axes.labelcolor": INK2,
    "xtick.color": MUTED,
    "ytick.color": MUTED,
    "axes.edgecolor": "#c3c2b7",
})

CREDIT = "Data: SkillCorner × PySport open data — AUS A-League 2024/25 (60+ min)"


def _style_ax(ax):
    ax.spines[["top", "right"]].set_visible(False)
    ax.grid(True, color=GRID, linewidth=0.8, zorder=0)
    ax.set_axisbelow(True)


def fig_athletic(df):
    """Small-multiples scatter: peak sprint speed vs work rate, one panel per position."""
    d = df.dropna(subset=["top_speed", "m_per_min"])
    positions = ["Central Defender", "Full Back", "Midfield", "Wide Attacker", "Center Forward"]
    fig, axes = plt.subplots(1, 5, figsize=(16, 3.8), sharex=True, sharey=True)
    xlim = (d["top_speed"].min() - 0.4, d["top_speed"].max() + 0.4)
    ylim = (d["m_per_min"].min() - 3, d["m_per_min"].max() + 3)
    for ax, pos, col in zip(axes, positions, CAT):
        _style_ax(ax)
        # all players in grey for context, position highlighted in colour
        ax.scatter(d["top_speed"], d["m_per_min"], s=14, color=MID, alpha=0.35,
                   edgecolor="none", zorder=2)
        sub = d[d["position_group"] == pos]
        ax.scatter(sub["top_speed"], sub["m_per_min"], s=26, color=col,
                   edgecolor=SURFACE, linewidth=0.6, zorder=3)
        ax.set_title(pos, fontsize=11, fontweight="bold", color=INK, pad=6)
        ax.set_xlim(*xlim)
        ax.set_ylim(*ylim)
        # label the standout (fastest) in this position
        if len(sub):
            top = sub.loc[sub["top_speed"].idxmax()]
            ax.annotate(top["player_short_name"], (top["top_speed"], top["m_per_min"]),
                        fontsize=8, color=INK, ha="right", va="bottom",
                        xytext=(-4, 3), textcoords="offset points")
    axes[0].set_ylabel("Work rate (m / min)", fontsize=10)
    fig.text(0.5, 0.02, "Peak sprint speed — PSV99 (km/h)", ha="center", fontsize=10, color=INK2)
    fig.suptitle("The athletic map — sprint speed vs work rate by position",
                 fontsize=15, fontweight="bold", x=0.5, y=1.02, color=INK)
    fig.text(0.995, -0.03, CREDIT, ha="right", fontsize=8, color=MUTED)
    fig.tight_layout(rect=[0, 0.05, 1, 1])
    _save(fig, "athletic_map.png")


def fig_passing(df):
    """Pass volume vs completion, coloured by completion above/below xPass expectation."""
    d = df.dropna(subset=["pass_vol", "pass_pct", "pass_over"])
    fig, ax = plt.subplots(figsize=(10, 6.6))
    _style_ax(ax)
    norm = mpl.colors.TwoSlopeNorm(vmin=-8, vcenter=0, vmax=8)
    cmap = mpl.colors.LinearSegmentedColormap.from_list("div", [RED, "#eeeeea", BLUE])
    sc = ax.scatter(d["pass_vol"], d["pass_pct"], c=d["pass_over"].clip(-8, 8),
                    cmap=cmap, norm=norm, s=60, edgecolor=SURFACE, linewidth=0.8, zorder=3)
    # headroom on the right so labels are not clipped
    ax.set_xlim(d["pass_vol"].min() - 2, d["pass_vol"].max() + 14)
    # label high-volume + strong over-performers
    labels = set(d.nlargest(6, "pass_vol").index) | set(d.nlargest(4, "pass_over").index)
    for i in labels:
        r = d.loc[i]
        ax.annotate(r["player_short_name"], (r["pass_vol"], r["pass_pct"]),
                    fontsize=8.5, color=INK, va="center", ha="left",
                    xytext=(6, 0), textcoords="offset points")
    ax.set_xlabel("Passes attempted per 30 min in possession", fontsize=10)
    ax.set_ylabel("Completion %", fontsize=10)
    ax.set_title("Passers: volume, security & risk", fontsize=15, fontweight="bold",
                 color=INK, loc="left", pad=10)
    cb = fig.colorbar(sc, ax=ax, pad=0.015, fraction=0.045)
    cb.set_label("Completion vs expected (xPass)", fontsize=9, color=INK2)
    cb.outline.set_visible(False)
    fig.text(0.01, 0.005, CREDIT, ha="left", fontsize=8, color=MUTED)
    fig.tight_layout(rect=[0, 0.03, 1, 1])
    _save(fig, "passing_map.png")


PROFILE_METRICS = [
    ("top_speed", "Peak speed"), ("sprints", "Sprints"), ("high_accel", "Explosive accel"),
    ("distance", "Distance"), ("m_per_min", "Work rate"), ("hi_count", "High-intensity"),
    ("pass_over", "Beats xPass"), ("pass_pct", "Completion %"), ("pass_vol", "Pass volume"),
    ("linebreaks", "Line breaks"), ("dangerous_passes", "Dangerous passes"), ("pass_shot", "Passes to shots"),
    ("dangerous_runs", "Dangerous runs"), ("runs_received", "Runs received"), ("run_shot", "Runs to shots"),
]


def _percentile(series, value):
    vals = series.dropna().to_numpy()
    if value is None or np.isnan(value) or len(vals) == 0:
        return np.nan
    return round(100 * (vals <= value).mean())


def fig_profile(df, player_name=None):
    """Diverging percentile-bar profile for one player vs positional peers."""
    if player_name:
        player = df[df["player_name"] == player_name].iloc[0]
    else:  # default: the league's fastest player
        player = df.dropna(subset=["top_speed"]).sort_values("top_speed").iloc[-1]
    peers = df[df["position_group"] == player["position_group"]]
    labels, pcts = [], []
    for key, lab in PROFILE_METRICS:
        labels.append(lab)
        pcts.append(_percentile(peers[key], player[key]))
    y = np.arange(len(labels))[::-1]
    centered = np.array([(p - 50) if not np.isnan(p) else 0 for p in pcts])
    colors = [BLUE if c >= 0 else RED for c in centered]

    fig, ax = plt.subplots(figsize=(9, 7))
    ax.barh(y, centered, color=colors, height=0.62, zorder=3,
            edgecolor=SURFACE, linewidth=0.5)
    ax.axvline(0, color="#c3c2b7", linewidth=1, zorder=2)
    ax.set_yticks(y)
    ax.set_yticklabels(labels, fontsize=10, color=INK2)
    ax.set_xlim(-52, 52)
    ax.set_xticks([-50, -25, 0, 25, 50])
    ax.set_xticklabels(["0", "25", "50", "75", "100"], fontsize=9)
    ax.set_xlabel("Percentile vs positional peers", fontsize=10)
    ax.spines[["top", "right", "left"]].set_visible(False)
    ax.tick_params(left=False)
    ax.grid(True, axis="x", color=GRID, linewidth=0.8, zorder=0)
    ax.set_axisbelow(True)
    for yi, p, c in zip(y, pcts, centered):
        if np.isnan(p):
            continue
        ax.text(c + (2.5 if c >= 0 else -2.5), yi, f"{int(p)}",
                va="center", ha="left" if c >= 0 else "right",
                fontsize=9.5, fontweight="bold", color=BLUE if c >= 0 else RED)
    ax.set_title(f"{player['player_name']}", fontsize=16, fontweight="bold",
                 color=INK, loc="left", pad=26)
    ax.text(0, 1.045, f"{player['position_group']} · {player['team_short']} · "
            f"{int(player['matches'])} matches — vs {len(peers)} peers",
            transform=ax.transAxes, fontsize=10.5, color=INK2)
    fig.text(0.01, 0.005, CREDIT, ha="left", fontsize=8, color=MUTED)
    fig.tight_layout(rect=[0, 0.02, 1, 0.95])
    _save(fig, "player_profile.png")


SILO_COLORS = {name: CAT[i] for i, name in enumerate(ALL_SILO_NAMES)}


def _silo_contributions(row, names):
    """Normalised position-aware weight * silo score for each silo (sums to Overall)."""
    w = POSITION_WEIGHTS.get(row["position_group"], BALANCED_WEIGHTS)
    present = {s: row[f"silo__{s}"] for s in names if pd.notna(row[f"silo__{s}"])}
    tot_w = sum(w[s] for s in present) or 1.0
    return {s: (w[s] / tot_w) * present[s] for s in present}


def fig_leaderboard(df, n=20, include_sample=False, out=None):
    """Top-n leaderboard, each bar split into the weighted silo contributions
    (position-aware) that sum to the Overall Score."""
    names = ALL_SILO_NAMES if include_sample else SILO_NAMES
    ranked = compute_scores(df, include_sample=include_sample).head(n).iloc[::-1]

    fig, ax = plt.subplots(figsize=(12 if include_sample else 11.5, 9))
    y = np.arange(len(ranked))
    left = np.zeros(len(ranked))
    contribs = [_silo_contributions(r, names) for _, r in ranked.iterrows()]
    for s in names:
        vals = np.array([c.get(s, 0.0) for c in contribs])
        ax.barh(y, vals, left=left, height=0.66, color=SILO_COLORS[s],
                edgecolor=SURFACE, linewidth=1.0, zorder=3, label=s)
        left += vals
    for yi, tot in zip(y, left):
        ax.text(tot + 0.6, yi, f"{tot:.1f}", va="center", ha="left",
                fontsize=10, fontweight="bold", color=INK)
    labels = [f"{int(r.rank)}. {r.player_name}  ·  {r.team_short}  ({r.position_group})"
              for r in ranked.itertuples()]
    ax.set_yticks(y)
    ax.set_yticklabels(labels, fontsize=9, color=INK2)
    ax.set_xlim(0, max(left) + 5)
    ax.set_xlabel("SkillCorner Score  (0–100, position-aware weights)", fontsize=10)
    ax.spines[["top", "right", "left"]].set_visible(False)
    ax.tick_params(left=False)
    ax.grid(True, axis="x", color=GRID, linewidth=0.8, zorder=0)
    ax.set_axisbelow(True)
    ax.legend(loc="upper center", bbox_to_anchor=(0.5, -0.06), ncol=len(names), frameon=False,
              fontsize=9 if include_sample else 9.5, handlelength=1.0,
              columnspacing=1.1 if include_sample else 1.4)
    subtitle = ("Eight position-relative silos (adds Shooting/Defending/Dribbling from the "
                "10-match sample) · sampled players only"
                if include_sample else
                "Five position-relative silos, weighted by position · all 60+ min players")
    title = ("A-League 2024/25 — full-profile leaderboard (8 silos)" if include_sample
             else "A-League 2024/25 leaderboard — the SkillCorner Score")
    ax.set_title(title, fontsize=16, fontweight="bold", color=INK, loc="left", pad=26)
    ax.text(0, 1.02, subtitle, transform=ax.transAxes, fontsize=10, color=INK2)
    fig.text(0.99, 0.005, CREDIT, ha="right", fontsize=8, color=MUTED)
    fig.tight_layout(rect=[0, 0.05, 1, 0.95])
    _save(fig, out or ("leaderboard_full.png" if include_sample else "leaderboard.png"))


def fig_player_card(df, player_name=None):
    """A FIFA-style card. If the player is in the 10-match sample, all eight faces
    are shown; otherwise the five season faces plus the three sample faces greyed."""
    full = compute_scores(df, include_sample=True)
    season = compute_scores(df)
    if player_name:
        row = full[full["player_name"] == player_name]
        row = (row.iloc[0] if len(row)
               else season[season["player_name"] == player_name].iloc[0])
    else:
        row = full.iloc[0]  # #1 full-profile player
    in_sample = all(pd.notna(row.get(f"silo__{s}", np.nan)) for s in SAMPLE_SILO_NAMES)
    ovr = row["score_overall"]

    fig, ax = plt.subplots(figsize=(6.6, 8.4))
    ax.axis("off")
    ax.add_patch(mpl.patches.FancyBboxPatch(
        (0.05, 0.03), 0.90, 0.94, boxstyle="round,pad=0.02,rounding_size=0.035",
        transform=ax.transAxes, facecolor=SURFACE, edgecolor="#c3c2b7", linewidth=1.5, zorder=1))
    ax.text(0.12, 0.905, f"{ovr:.0f}", fontsize=48, fontweight="bold", color=BLUE,
            transform=ax.transAxes, va="center")
    ax.text(0.12, 0.845, "OVR", fontsize=12, fontweight="bold", color=INK2, transform=ax.transAxes)
    ax.text(0.40, 0.915, row["player_name"], fontsize=15, fontweight="bold", color=INK,
            transform=ax.transAxes, va="center")
    ax.text(0.40, 0.875, f"{row['position_group']} · {row['team_short']}", fontsize=10.5,
            color=INK2, transform=ax.transAxes, va="center")
    ax.text(0.40, 0.845, f"#{int(row['rank'])} "
            + ("(full profile)" if in_sample else "(season)") + f" · {int(row['matches'])} matches",
            fontsize=9.5, color=MUTED, transform=ax.transAxes, va="center")
    ax.plot([0.10, 0.90], [0.80, 0.80], color="#c3c2b7", lw=1, transform=ax.transAxes)

    faces = [(s, row.get(f"silo__{s}", np.nan)) for s in ALL_SILO_NAMES]
    y0 = 0.745
    for i, (name, val) in enumerate(faces):
        yy = y0 - i * 0.083
        avail = pd.notna(val)
        col = SILO_COLORS[name] if avail else "#c3c2b7"
        ax.text(0.135, yy, f"{val:.0f}" if avail else "—", fontsize=20, fontweight="bold",
                color=col, transform=ax.transAxes, va="center", ha="right")
        tag = "" if name in SILO_NAMES else " *"
        ax.text(0.19, yy, name.upper() + tag, fontsize=12.5, fontweight="bold",
                color=INK if avail else "#b7b6b0", transform=ax.transAxes, va="center")
        ax.add_patch(plt.Rectangle((0.54, yy - 0.016), 0.35, 0.024, transform=ax.transAxes,
                     facecolor=GRID, edgecolor="none", zorder=2))
        if avail:
            ax.add_patch(plt.Rectangle((0.54, yy - 0.016), 0.35 * val / 100, 0.024,
                         transform=ax.transAxes, facecolor=col, edgecolor="none", zorder=3))
    note = ("* Shooting / Defending / Dribbling from the 10-match sample · no xG"
            if in_sample else
            "* Shooting / Defending / Dribbling need the 10-match sample (n/a here)")
    fig.text(0.5, 0.02, note, ha="center", fontsize=8.5, color=MUTED)
    _save(fig, "player_card.png")


def fig_radar(df, players=None, include_sample=True):
    """Overlaid radar comparing players across the silo axes (0-100 percentiles)."""
    names = ALL_SILO_NAMES if include_sample else SILO_NAMES
    ranked = compute_scores(df, include_sample=include_sample)
    if players is None:  # default: top attacker vs top defender in the sample
        players = [ranked.iloc[0]["player_name"],
                   ranked[ranked["position_group"] == "Central Defender"].iloc[0]["player_name"]]
    rows = [ranked[ranked["player_name"] == p].iloc[0] for p in players]

    ang = np.linspace(0, 2 * np.pi, len(names), endpoint=False)
    ang = np.concatenate([ang, ang[:1]])
    fig, ax = plt.subplots(figsize=(8, 8), subplot_kw={"polar": True})
    ax.set_theta_offset(np.pi / 2)
    ax.set_theta_direction(-1)
    ax.set_ylim(0, 100)
    ax.set_yticks([25, 50, 75])
    ax.set_yticklabels(["25", "50", "75"], color=MUTED, fontsize=8)
    ax.set_xticks(ang[:-1])
    ax.set_xticklabels([n.upper() for n in names], fontsize=10.5, fontweight="bold", color=INK)
    ax.tick_params(axis="x", pad=14)
    ax.grid(color=GRID, linewidth=0.9)
    ax.spines["polar"].set_color(GRID)
    duo = [CAT[0], CAT[1]]
    for r, col in zip(rows, duo):
        vals = np.array([r.get(f"silo__{s}", np.nan) for s in names], dtype=float)
        vals = np.nan_to_num(vals, nan=0.0)
        vals = np.concatenate([vals, vals[:1]])
        ax.plot(ang, vals, color=col, linewidth=2.4, zorder=3,
                label=f"{r['player_name']} ({r['position_group']})")
        ax.fill(ang, vals, color=col, alpha=0.14, zorder=2)
    ax.legend(loc="upper center", bbox_to_anchor=(0.5, -0.10), ncol=1, frameon=False, fontsize=11)
    ax.set_title("Player comparison — SkillCorner silos", fontsize=15, fontweight="bold",
                 color=INK, pad=32)
    fig.text(0.5, 0.935, "Percentile within position (0–100) · "
             + ("8 silos, 10-match sample" if include_sample else "5 season silos"),
             ha="center", fontsize=9, color=MUTED)
    fig.subplots_adjust(bottom=0.16, top=0.88)
    _save(fig, "radar_compare.png")


def fig_shooting(n=16):
    """Top shot-takers from the 10-match dynamic-events sample: total shots split
    into goals vs non-scoring shots. Explicitly a sample, and xG-free."""
    from src.visualization.dynamic_events_agg import sample_table
    tbl = sample_table().sort_values(["shots", "goals"], ascending=False).head(n).iloc[::-1]
    fig, ax = plt.subplots(figsize=(10.5, 7.5))
    y = np.arange(len(tbl))
    non_goal = (tbl["shots"] - tbl["goals"]).to_numpy()
    goals = tbl["goals"].to_numpy()
    ax.barh(y, non_goal, height=0.66, color=CAT[0], edgecolor=SURFACE, linewidth=1.0,
            zorder=3, label="Shots (no goal)")
    ax.barh(y, goals, left=non_goal, height=0.66, color="#0ca30c", edgecolor=SURFACE,
            linewidth=1.0, zorder=3, label="Goals")
    for yi, tot, g in zip(y, tbl["shots"], tbl["goals"]):
        ax.text(tot + 0.15, yi, f"{int(tot)}" + (f"  ·  {int(g)}G" if g else ""),
                va="center", ha="left", fontsize=10, fontweight="bold", color=INK)
    ax.set_yticks(y)
    ax.set_yticklabels([f"{r.player_name}  ·  {r.team}  ({int(r.apps)} apps)"
                        for r in tbl.itertuples()], fontsize=9.5, color=INK2)
    ax.set_xlim(0, tbl["shots"].max() + 2.5)
    ax.set_xlabel("Shots in the 10-match sample", fontsize=10)
    ax.spines[["top", "right", "left"]].set_visible(False)
    ax.tick_params(left=False)
    ax.grid(True, axis="x", color=GRID, linewidth=0.8, zorder=0)
    ax.set_axisbelow(True)
    ax.legend(loc="lower right", frameon=False, fontsize=10)
    ax.set_title("Shooting — the 10-match tracking sample", fontsize=16,
                 fontweight="bold", color=INK, loc="left", pad=26)
    ax.text(0, 1.02, "From dynamic-events (possessions ending in a shot) · not season-wide · "
            "no xG in the open data", transform=ax.transAxes, fontsize=10.5, color=INK2)
    fig.text(0.99, 0.005, CREDIT, ha="right", fontsize=8, color=MUTED)
    fig.tight_layout(rect=[0, 0.03, 1, 0.95])
    _save(fig, "shooting.png")


def _save(fig, name):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / name
    fig.savefig(path, dpi=160, bbox_inches="tight")
    plt.close(fig)
    print(f"  saved {path.relative_to(REPO_ROOT)}")


def main():
    df = load_merged()
    print(f"Loaded {len(df)} players. Rendering figures ->")
    fig_leaderboard(df)                       # season, 5 silos
    fig_leaderboard(df, include_sample=True)  # full profile, 8 silos
    fig_player_card(df)
    fig_radar(df)
    fig_shooting()
    fig_athletic(df)
    fig_passing(df)
    fig_profile(df)
    print("Done.")


if __name__ == "__main__":
    main()
