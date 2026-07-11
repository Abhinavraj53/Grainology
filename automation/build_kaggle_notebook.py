from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT / "kaggle" / "src"
OUTPUT = ROOT / "kaggle" / "grainology_state_forecaster.ipynb"


def code_cell(source: str) -> dict:
    return {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": source.splitlines(keepends=True),
    }


def markdown_cell(source: str) -> dict:
    return {
        "cell_type": "markdown",
        "metadata": {},
        "source": source.splitlines(keepends=True),
    }


def main() -> None:
    cells = [
        markdown_cell(
            "# Grainology State-wise AI Forecaster\n\n"
            "This notebook trains the Grainology price model on Kaggle and writes a release bundle to `/kaggle/working/release`.\n"
        ),
        code_cell(
            "%pip install -q catboost>=1.2 lightgbm>=4.0 xgboost>=2.0 optuna>=3.6 "
            "jsonschema>=4.21 matplotlib>=3.8 numpy>=1.26 pandas>=2.2 polars>=1.0 pyarrow>=15 "
            "requests>=2.31 scikit-learn>=1.4 supabase>=2.0\n"
        ),
        code_cell(
            "from pathlib import Path\n"
            "Path('src').mkdir(exist_ok=True)\n"
            "Path('src/__init__.py').write_text('', encoding='utf-8')\n"
        ),
    ]

    for path in sorted(SRC_DIR.glob("*.py")):
        content = path.read_text(encoding="utf-8")
        cells.append(code_cell(
            f"from pathlib import Path\n"
            f"Path('src/{path.name}').write_text({json.dumps(content)}, encoding='utf-8')\n"
        ))

    cells.append(code_cell(
        "from src.pipeline import run_pipeline\n\n"
        "manifest = run_pipeline()\n"
        "manifest\n"
    ))

    notebook = {
        "cells": cells,
        "metadata": {
            "kernelspec": {
                "display_name": "Python 3",
                "language": "python",
                "name": "python3",
            },
            "language_info": {
                "name": "python",
                "pygments_lexer": "ipython3",
            },
        },
        "nbformat": 4,
        "nbformat_minor": 5,
    }
    OUTPUT.write_text(json.dumps(notebook, indent=2), encoding="utf-8")
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()
