#!/bin/bash
# Sync desktop overlay files into frontend/ before Tauri build.
# This script copies desktop-specific components into the frontend source tree.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OVERLAY_SRC="$SCRIPT_DIR/frontend-overlay/src"
FRONTEND_SRC="$SCRIPT_DIR/../frontend/src"

echo "[sync-overlay] Copying desktop overlay to frontend..."
cp -r "$OVERLAY_SRC/." "$FRONTEND_SRC/"
echo "[sync-overlay] Done."