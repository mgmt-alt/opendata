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

import base64
import json
import mimetypes
from pathlib import Path

from src.visualization import build_dashboard_data as prep
from src.visualization import dynamic_events_agg as shooting

HERE = Path(__file__).resolve().parent
TEMPLATE = HERE / "season_dashboard.template.html"
DATA_JSON = HERE / "output" / "season_players.json"
SHOOTING_JSON = HERE / "output" / "sample_events.json"
LOGO_DIR = HERE / "logos"          # drop licensed club logos here (e.g. sydney-fc.png)
OUT_HTML = HERE / "output" / "season_dashboard.html"
TOKEN = "__SEASON_DATA__"
SHOOTING_TOKEN = "__SAMPLE_SHOOTING__"
LOGO_TOKEN = "__TEAM_LOGOS__"
LOGO_EXTS = {".svg", ".png", ".webp", ".jpg", ".jpeg"}


def load_logos() -> dict[str, str]:
    """Embed any club logo files in ``logos/`` as data URIs, keyed by filename slug.

    Nothing is downloaded — this only picks up files you place there yourself (so the
    rights to use/redistribute them are yours). The dashboard falls back to a drawn shield
    crest for any club without a file. Name files by the club slug, e.g. ``sydney-fc.png``,
    ``ws-wanderers.svg`` (lower-case, non-alphanumeric runs collapsed to a single hyphen).
    """
    logos: dict[str, str] = {}
    if not LOGO_DIR.exists():
        return logos
    for f in sorted(LOGO_DIR.iterdir()):
        if f.suffix.lower() not in LOGO_EXTS:
            continue
        mime = "image/svg+xml" if f.suffix.lower() == ".svg" else mimetypes.guess_type(f.name)[0]
        b64 = base64.b64encode(f.read_bytes()).decode("ascii")
        logos[f.stem.lower()] = f"data:{mime};base64,{b64}"
    return logos


def main() -> None:
    if not DATA_JSON.exists():
        prep.main()
    if not SHOOTING_JSON.exists():
        shooting.write_json()
    data = DATA_JSON.read_text()
    shots = SHOOTING_JSON.read_text()
    logos = json.dumps(load_logos(), separators=(",", ":"))
    template = TEMPLATE.read_text()
    for tok in (TOKEN, SHOOTING_TOKEN, LOGO_TOKEN):
        if tok not in template:
            raise SystemExit(f"Token {tok!r} not found in template")
    html = (template.replace(TOKEN, data)
            .replace(SHOOTING_TOKEN, shots)
            .replace(LOGO_TOKEN, logos))
    OUT_HTML.parent.mkdir(parents=True, exist_ok=True)
    OUT_HTML.write_text(html)
    n_logos = len(json.loads(logos))
    kb = OUT_HTML.stat().st_size / 1024
    print(f"Wrote {OUT_HTML} ({kb:.0f} KB, self-contained; {n_logos} club logo(s) embedded)")


if __name__ == "__main__":
    main()
