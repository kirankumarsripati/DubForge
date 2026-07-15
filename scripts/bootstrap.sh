#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Installing Node dependencies..."
cd "$ROOT_DIR"
pnpm install

echo "Installing Python dev dependencies..."
cd "$ROOT_DIR/python"
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

echo "Bootstrap complete."
