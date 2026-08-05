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
import matplotlib as mpl
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D

from src.visualization.build_dashboard_data import load_merged, RUN_FAMILIES  # noqa: F401
from src.visualization.player_score import compute_scores, METRIC_GROUPS

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
CAT = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300"]

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
    ("top_speed", "Peak speed"), ("distance", "Distance"), ("m_per_min", "Work rate"),
    ("sprints", "Sprints"), ("hi_count", "High-intensity"), ("high_accel", "Explosive accel"),
    ("pass_vol", "Pass volume"), ("pass_pct", "Completion %"), ("pass_over", "Beats xPass"),
    ("linebreaks", "Line breaks"), ("dangerous_passes", "Dangerous passes"),
    ("runs", "Total runs"), ("dangerous_runs", "Dangerous runs"), ("runs_received", "Runs received"),
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


def fig_leaderboard(df, n=20):
    """Top-n SkillCorner Score leaderboard, each bar split into the three weighted
    sub-score contributions (Athletic + Passing + Off-ball) that sum to the score."""
    ranked = compute_scores(df).head(n).iloc[::-1]  # best at top
    groups = list(METRIC_GROUPS)                     # Athletic, Passing, Off-ball
    colors = {"Athletic": CAT[0], "Passing": CAT[1], "Off-ball": CAT[2]}
    contrib = {g: ranked[f"score__{g}"].to_numpy() / len(groups) for g in groups}

    fig, ax = plt.subplots(figsize=(11, 8.5))
    y = np.arange(len(ranked))
    left = np.zeros(len(ranked))
    for g in groups:
        ax.barh(y, contrib[g], left=left, height=0.66, color=colors[g],
                edgecolor=SURFACE, linewidth=1.2, zorder=3, label=g)
        left += contrib[g]
    # overall score at bar end
    for yi, tot in zip(y, left):
        ax.text(tot + 0.6, yi, f"{tot:.1f}", va="center", ha="left",
                fontsize=10, fontweight="bold", color=INK)
    labels = [f"{int(r.rank)}. {r.player_name}  ·  {r.team_short}"
              for r in ranked.itertuples()]
    ax.set_yticks(y)
    ax.set_yticklabels(labels, fontsize=9.5, color=INK2)
    ax.set_xlim(0, max(left) + 5)
    ax.set_xlabel("SkillCorner Score  (0–100, equal weights)", fontsize=10)
    ax.spines[["top", "right", "left"]].set_visible(False)
    ax.tick_params(left=False)
    ax.grid(True, axis="x", color=GRID, linewidth=0.8, zorder=0)
    ax.set_axisbelow(True)
    ax.legend(loc="upper center", bbox_to_anchor=(0.5, -0.07), ncol=3, frameon=False,
              fontsize=10, handlelength=1.1, columnspacing=1.8)
    ax.set_title("A-League 2024/25 leaderboard — the SkillCorner Score",
                 fontsize=16, fontweight="bold", color=INK, loc="left", pad=26)
    ax.text(0, 1.02, "Composite of position-relative percentiles across physical, "
            "passing & off-ball metrics · 3+ matches",
            transform=ax.transAxes, fontsize=10.5, color=INK2)
    fig.text(0.99, 0.005, CREDIT, ha="right", fontsize=8, color=MUTED)
    fig.tight_layout(rect=[0, 0.05, 1, 0.95])
    _save(fig, "leaderboard.png")


def _save(fig, name):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / name
    fig.savefig(path, dpi=160, bbox_inches="tight")
    plt.close(fig)
    print(f"  saved {path.relative_to(REPO_ROOT)}")


def main():
    df = load_merged()
    print(f"Loaded {len(df)} players. Rendering figures ->")
    fig_leaderboard(df)
    fig_athletic(df)
    fig_passing(df)
    fig_profile(df)
    print("Done.")


if __name__ == "__main__":
    main()
