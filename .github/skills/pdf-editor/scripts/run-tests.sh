#!/usr/bin/env bash
# -------------------------------------------------------------------
# run-tests.sh — Esegue i test del backend con pytest
# Uso: ./scripts/run-tests.sh [opzioni pytest]
# Esempi:
#   ./scripts/run-tests.sh
#   ./scripts/run-tests.sh -v
#   ./scripts/run-tests.sh tests/test_upload.py -k "valid"
# -------------------------------------------------------------------
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"

# Colours
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Attiva virtual env
if [ -f "$BACKEND_DIR/.venv/Scripts/activate" ]; then
    source "$BACKEND_DIR/.venv/Scripts/activate"
elif [ -f "$BACKEND_DIR/.venv/bin/activate" ]; then
    source "$BACKEND_DIR/.venv/bin/activate"
else
    echo -e "${RED}❌ Virtual env non trovato in backend/.venv${NC}"
    echo "   Crealo con: cd backend && python -m venv .venv && pip install -r requirements.txt"
    exit 1
fi

cd "$BACKEND_DIR"

echo -e "${YELLOW}═══ Esecuzione test backend ═══${NC}"

# Se `pytest` non è installato, installa le dipendenze
if ! command -v pytest &>/dev/null; then
    echo -e "${YELLOW}📦 pytest non trovato — installo requirements.txt...${NC}"
    pip install -r requirements.txt
fi

# Esegue pytest con gli argomenti passati (o default)
if [ $# -eq 0 ]; then
    python -m pytest tests/ -v --tb=short
else
    python -m pytest "$@" -v --tb=short
fi

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "\n${GREEN}✅ Tutti i test superati.${NC}"
else
    echo -e "\n${RED}❌ Qualche test è fallito (exit code $EXIT_CODE).${NC}"
fi

exit $EXIT_CODE