# 📦 Source Code (src)

⬅️ [Back to Main Repository README](../README.md)

This directory contains reusable Python modules for loading, processing, and visualizing SkillCorner data.

💡 *Note: If you want to see these source files in action, please explore the [**Learning Paths in our Tutorials section**](../notebooks/tutorials/README.md).*

## 🏗️ Structure

- **`data/`**: Scripts for data ingestion and loading.
  - `basic_loading.py`: Functions to load match metadata and tracking data.
- **`features/`**: Feature engineering and aggregation logic.
  - `DynamicEventsAggregator.py`: Logic for summarizing dynamic event categories.
  - `PhasesOfPlayAggregator.py`: Framework for aggregating data by phases of play.
- **`visualization/`**: Folder with reusable plotting and reporting functions.
  - `head2head_viz.py`: Head to head plot to compare two teams or players on key metrics
  - `sectioned_summary_table_viz.py`: Visualisation to compare multiple metrics against different players and organize them by custom categories
  - `build_dashboard_data.py`: Merges the three season-aggregate CSVs into one clean, analysis-ready row-per-player table / JSON
  - `build_dashboard.py`: Assembles the self-contained interactive **Season Explorer** dashboard (`output/season_dashboard.html`)
  - `season_figures.py`: Renders publication-quality static PNG figures (`assets/viz/`) from the season aggregates
  - `output/`: Generated dashboard + a [**README with a full walkthrough**](visualization/output/README.md) of the season visualizations

## 🛠️ Usage

These modules are designed to be imported into tutorials or custom scripts:

```python
from src.features.PhasesOfPlayAggregator import PhasesOfPlayAggregator
# ... initialize and use ...
```
