from __future__ import annotations

import json
import sys
from pathlib import Path


def python_source(cell: dict) -> str:
    source = cell.get("source", "")
    if isinstance(source, list):
        source = "".join(source)
    lines = []
    for line in str(source).splitlines(keepends=True):
        stripped = line.lstrip()
        if stripped.startswith(("%", "!")):
            lines.append("\n" if line.endswith("\n") else "")
        else:
            lines.append(line)
    return "".join(lines)


def validate(path: Path) -> int:
    notebook = json.loads(path.read_text(encoding="utf-8"))
    failures = []
    code_cells = 0
    for index, cell in enumerate(notebook.get("cells", [])):
        if cell.get("cell_type") != "code":
            continue
        code_cells += 1
        try:
            compile(python_source(cell), f"{path.name}#cell-{index}", "exec")
        except SyntaxError as exc:
            failures.append(f"cell {index}: {exc.msg} (line {exc.lineno})")

    if failures:
        print(f"{path}: {len(failures)} syntax error(s)")
        for failure in failures:
            print(f"  - {failure}")
        return 1

    print(f"{path}: {code_cells} Python cells compiled successfully")
    return 0


def main() -> int:
    paths = [Path(value) for value in sys.argv[1:]] or [
        Path("kaggle/grainology_state_forecaster.ipynb"),
        Path("kaggle/grainology_mandi_forecaster.ipynb"),
    ]
    return max(validate(path) for path in paths)


if __name__ == "__main__":
    raise SystemExit(main())
