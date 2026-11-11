#!/bin/bash
# Build script: FastAPI backend sidecar (macOS / Linux)
# Run from the repository root.
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
ENTRY_POINT="$PROJECT_ROOT/desktop/run_backend.py"
OUTPUT_DIR="$PROJECT_ROOT/desktop/src-tauri/binaries"
REQUIREMENTS="$BACKEND_DIR/requirements.txt"

mkdir -p "$OUTPUT_DIR"

echo "=== Building FastAPI sidecar (macOS/Linux) ==="
echo "Entry point: $ENTRY_POINT"
echo "Output: $OUTPUT_DIR"

# Detect Python
PYTHON="python3"
if [ -f "$BACKEND_DIR/.venv/bin/python" ]; then
    PYTHON="$BACKEND_DIR/.venv/bin/python"
    echo "Using venv Python: $PYTHON"
elif command -v python3 &>/dev/null; then
    PYTHON="$(command -v python3)"
elif command -v python &>/dev/null; then
    PYTHON="$(command -v python)"
else
    echo "ERROR: Python not found."
    exit 1
fi

# Install PyInstaller if missing
$PYTHON -m pip install pyinstaller --quiet

# ─── Locate tesseract binary + language packs ───────────────────────────────
# The OCR feature needs the tesseract binary. We bundle it inside the sidecar
# so the end user does NOT need to install anything.
TESSERACT_BIN=""
for cand in "${TESSERACT_CMD:-}" "/usr/bin/tesseract" "/usr/local/bin/tesseract" "/opt/homebrew/bin/tesseract"; do
    if [ -n "$cand" ] && [ -f "$cand" ]; then
        TESSERACT_BIN="$cand"
        break
    fi
done
if [ -z "$TESSERACT_BIN" ]; then
    echo "WARNING: tesseract binary not found. OCR will be unavailable in the desktop app."
    echo "Install it (e.g. 'brew install tesseract' or 'apt install tesseract-ocr') and rebuild."
else
    echo "Bundling tesseract: $TESSERACT_BIN"
fi

# Locate tessdata (language packs) next to the binary
TESSDATA_DIR=""
if [ -n "$TESSERACT_BIN" ]; then
    TESSDATA_DIR="$(dirname "$TESSERACT_BIN")/tessdata"
    [ -d "$TESSDATA_DIR" ] || TESSDATA_DIR=""
fi

# Build the PyInstaller args for bundling tesseract
BUNDLE_ARGS=()
if [ -n "$TESSERACT_BIN" ]; then
    BUNDLE_ARGS+=(--add-binary "$TESSERACT_BIN:tesseract")
fi
if [ -n "$TESSDATA_DIR" ]; then
    BUNDLE_ARGS+=(--add-data "$TESSDATA_DIR:tessdata")
fi
# 11/11 (Mirko): ita.traineddata dal REPO (garantito, non dipende dal runner)
REPO_ITA="$PROJECT_ROOT/backend/resources/tessdata/ita.traineddata"
if [ -f "$REPO_ITA" ]; then
    BUNDLE_ARGS+=(--add-data "$REPO_ITA:tessdata")
    echo "ita.traineddata incluso dal repo"
else
    echo "WARNING: ita.traineddata non trovato nel repo"
fi

# ─── OCRmyPDF: ghostscript + qpdf (best-effort, NON fatale) ──────────────────
# Il workflow CI li installa (choco) prima del build; qui li bundliamo in bin/.
GS_EXE=""
for f in "$PROGRAMFILES/gs"/*/bin/gswin64c.exe "/c/Program Files/gs"/*/bin/gswin64c.exe "/Program Files/gs"/*/bin/gswin64c.exe; do
    if [ -f "$f" ]; then GS_EXE="$f"; break; fi
done
if [ -n "$GS_EXE" ]; then
    echo "Bundling Ghostscript: $GS_EXE"
    GS_DIR="$(dirname "$GS_EXE")"
    GS_ROOT="$(dirname "$GS_DIR")"
    BUNDLE_ARGS+=(--add-binary "$GS_EXE:bin")
    [ -f "$GS_DIR/gsdll64.dll" ] && BUNDLE_ARGS+=(--add-binary "$GS_DIR/gsdll64.dll:bin")
    [ -d "$GS_ROOT/Resource" ] && BUNDLE_ARGS+=(--add-binary "$GS_ROOT/Resource:bin/Resource")
    [ -d "$GS_ROOT/fonts" ] && BUNDLE_ARGS+=(--add-binary "$GS_ROOT/fonts:bin/fonts")
else
    echo "WARNING: Ghostscript non trovato; OCRmyPDF non disponibile (fallback manuale)"
fi
QPDF_BIN="$(command -v qpdf.exe 2>/dev/null || command -v qpdf 2>/dev/null || true)"
if [ -n "$QPDF_BIN" ]; then
    echo "Bundling qpdf: $QPDF_BIN"
    QPDF_DIR="$(dirname "$QPDF_BIN")"
    BUNDLE_ARGS+=(--add-binary "$QPDF_BIN:bin")
    for dll in "$QPDF_DIR"/*.dll; do
        [ -f "$dll" ] && BUNDLE_ARGS+=(--add-binary "$dll:bin")
    done
else
    echo "WARNING: qpdf non trovato; OCRmyPDF non disponibile (fallback manuale)"
fi

# --strip solo su Linux/macOS: su Windows (bash del runner CI) eseguirebbe GNU
# strip su python312.dll e sui .pyd corrompendoli ("Failed to load Python DLL").
STRIP_ARGS=()
case "$(uname -s)" in
    MINGW*|MSYS*|CYGWIN*) ;;
    *) STRIP_ARGS+=(--strip) ;;
esac

# Build with PyInstaller
echo "Running PyInstaller..."
$PYTHON -m PyInstaller \
    --name "fastapi-sidecar" \
    --onefile \
    --noconsole \
    "${STRIP_ARGS[@]+"${STRIP_ARGS[@]}"}" \
    --workpath "$PROJECT_ROOT/desktop/build-sidecar-tmp" \
    --specpath "$PROJECT_ROOT/desktop" \
    --distpath "$OUTPUT_DIR" \
    --paths "$BACKEND_DIR" \
    --hidden-import "fitz" \
    --collect-all "fitz" \
    --hidden-import "uvicorn" \
    --hidden-import "fastapi" \
    --hidden-import "sqlalchemy" \
    --hidden-import "alembic" \
    --hidden-import "pydantic" \
    --hidden-import "pydantic_settings" \
    --hidden-import "slowapi" \
    --hidden-import "google.auth" \
    --hidden-import "docx" \
    --hidden-import "reportlab" \
    --hidden-import "app.main" \
    --hidden-import "keyring" \
    --collect-all "keyring" \
    --hidden-import "ocrmypdf" \
    --collect-all "ocrmypdf" \
    --hidden-import "app.core.config" \
    --hidden-import "app.core.database" \
    --hidden-import "app.core.csrf" \
    --hidden-import "app.core.limiter" \
    --hidden-import "app.core.license_seed" \
    --hidden-import "app.models" \
    --hidden-import "app.repositories" \
    --hidden-import "app.services" \
    --hidden-import "app.api.v1" \
    --hidden-import "app.core.tesseract" \
    --hidden-import "pytesseract" \
    --hidden-import "PIL" \
    --add-data "$PROJECT_ROOT/desktop/.env.desktop:." \
    "${BUNDLE_ARGS[@]+"${BUNDLE_ARGS[@]}"}" \
    "$ENTRY_POINT"

# Clean up temp build files
rm -rf "$PROJECT_ROOT/desktop/build-sidecar-tmp" "$PROJECT_ROOT/desktop/fastapi-sidecar.spec"

echo "=== Build complete! ==="
echo "Binary: $OUTPUT_DIR/fastapi-sidecar"