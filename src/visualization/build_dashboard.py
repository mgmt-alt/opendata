"""
Assemble the self-contained interactive season dashboard.

Reads the merged per-player JSON produced by ``build_dashboard_data.py`` and
injects it into ``season_dashboard.template.html`` to produce a single, fully
self-contained ``season_dashboard.html`` (no external assets or network calls).

Usage
-----
    python -m src.visualization.build_dashboard
    # or
    python src/visualization/build_dashboard.py
"""
from __future__ import annotations

from pathlib import Path

from src.visualization import build_dashboard_data as prep

HERE = Path(__file__).resolve().parent
TEMPLATE = HERE / "season_dashboard.template.html"
DATA_JSON = HERE / "output" / "season_players.json"
OUT_HTML = HERE / "output" / "season_dashboard.html"
TOKEN = "__SEASON_DATA__"


def main() -> None:
    if not DATA_JSON.exists():
        prep.main()
    data = DATA_JSON.read_text()
    template = TEMPLATE.read_text()
    if TOKEN not in template:
        raise SystemExit(f"Token {TOKEN!r} not found in template")
    html = template.replace(TOKEN, data)
    OUT_HTML.parent.mkdir(parents=True, exist_ok=True)
    OUT_HTML.write_text(html)
    kb = OUT_HTML.stat().st_size / 1024
    print(f"Wrote {OUT_HTML} ({kb:.0f} KB, self-contained)")


if __name__ == "__main__":
    main()
