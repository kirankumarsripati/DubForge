# DubForge Python Workspace

Python worker packages for AI inference. Workers are not yet implemented.

## Setup

```bash
cd python
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

## Lint

```bash
ruff check .
black --check .
mypy .
```
