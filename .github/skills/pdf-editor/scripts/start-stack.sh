#!/usr/bin/env bash
# -------------------------------------------------------------------
# start-stack.sh — Avvia backend (uvicorn) + frontend (next dev)
# Uso: ./scripts/start-stack.sh
# -------------------------------------------------------------------
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_LOG="/tmp/pdfeditor-backend.log"
FRONTEND_LOG="/tmp/pdfeditor-frontend.log"
BACKEND_PORT=${BACKEND_PORT:-8000}
FRONTEND_PORT=${FRONTEND_PORT:-3000}

# Colours
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

cleanup() {
    echo -e "\n${YELLOW}⏹  Arresto stack...${NC}"
    [ -n "${BACKEND_PID:-}" ] && kill "$BACKEND_PID" 2>/dev/null && echo "   Backend fermato (PID $BACKEND_PID)"
    [ -n "${FRONTEND_PID:-}" ] && kill "$FRONTEND_PID" 2>/dev/null && echo "   Frontend fermato (PID $FRONTEND_PID)"
    wait 2>/dev/null
    echo -e "${GREEN}✅ Stack arrestato.${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM

# Verifica environment
if [ ! -f "$BACKEND_DIR/.venv/Scripts/activate" ] && [ ! -f "$BACKEND_DIR/.venv/bin/activate" ]; then
    echo -e "${RED}❌ Virtual env non trovato in backend/.venv${NC}"
    echo "   Crealo con: cd backend && python -m venv .venv"
    exit 1
fi

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo -e "${YELLOW}⚠️  node_modules non trovato nel frontend — eseguo npm install...${NC}"
    (cd "$FRONTEND_DIR" && npm install)
fi

# Attiva venv (gestisce sia Windows/Git Bash che Linux/macOS)
if [ -f "$BACKEND_DIR/.venv/Scripts/activate" ]; then
    source "$BACKEND_DIR/.venv/Scripts/activate"
else
    source "$BACKEND_DIR/.venv/bin/activate"
fi

echo -e "${GREEN}🚀 Avvio backend (uvicorn) → http://localhost:${BACKEND_PORT}${NC}"
cd "$BACKEND_DIR"
uvicorn app.main:app --reload --port "$BACKEND_PORT" > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!

echo -e "${GREEN}🚀 Avvio frontend (next dev) → http://localhost:${FRONTEND_PORT}${NC}"
cd "$FRONTEND_DIR"
npx next dev --port "$FRONTEND_PORT" > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!

echo ""
echo -e "${GREEN}═══ PdfEditor Stack ═══${NC}"
echo -e "  Backend  → http://localhost:${BACKEND_PORT}"
echo -e "  Frontend → http://localhost:${FRONTEND_PORT}"
echo -e "  Logs:"
echo -e "    backend  → tail -f $BACKEND_LOG"
echo -e "    frontend → tail -f $FRONTEND_LOG"
echo -e "${YELLOW}  Premi Ctrl+C per fermare tutto${NC}"
echo ""

# Aspetta che i processi siano in ascolto
sleep 2

# Attesa passiva
wait