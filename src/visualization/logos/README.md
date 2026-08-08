# Club logos (optional, licensed)

Drop **club logo files you have the right to use** in this folder and rebuild the dashboard
(`python -m src.visualization.build_dashboard`). Each file is embedded into the self-contained
HTML as a data URI and shown in place of the drawn shield crest. Any club without a file keeps
its drawn crest, so this is all-or-nothing per club, never required.

Nothing is downloaded automatically — the build only picks up files you place here. Official
club crests are trademarked, so sourcing/licensing them is your call; that's why they aren't
committed to the repo.

## File naming

Name each file by the **club slug** (lower-case; runs of non-alphanumeric characters become a
single hyphen). Accepted formats: `.svg` (best), `.png`, `.webp`, `.jpg`.

| Club | File |
|---|---|
| Adelaide United | `adelaide-united.svg` |
| Auckland | `auckland.svg` |
| Brisbane Roar | `brisbane-roar.svg` |
| Central Coast | `central-coast.svg` |
| Macarthur | `macarthur.svg` |
| Melbourne City | `melbourne-city.svg` |
| Melbourne Victory | `melbourne-victory.svg` |
| Newcastle Jets | `newcastle-jets.svg` |
| Perth Glory | `perth-glory.svg` |
| Sydney FC | `sydney-fc.svg` |
| WS Wanderers | `ws-wanderers.svg` |
| Wellington | `wellington.svg` |
| Western United | `western-united.svg` |

Square-ish, transparent-background images look best (they're rendered in a small square box).
