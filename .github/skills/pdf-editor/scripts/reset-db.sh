#!/usr/bin/env bash
# -------------------------------------------------------------------
# reset-db.sh — Cancella DB, storage e ricrea tutto da zero
# Uso: ./scripts/reset-db.sh
# ATTENZIONE: Distrugge TUTTI i dati (DB, PDF uploadati, snapshot)
# -------------------------------------------------------------------
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
DB_FILE="$BACKEND_DIR/pdf_editor.db"
STORAGE_DIR="$BACKEND_DIR/storage/pdfs"
SNAPSHOTS_DIR="$BACKEND_DIR/storage/snapshots"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${RED}╔══════════════════════════════════════════════╗${NC}"
echo -e "${RED}║   ATTENZIONE: Questa operazione cancella     ║${NC}"
echo -e "${RED}║   TUTTI i dati del database, upload e        ║${NC}"
echo -e "${RED}║   snapshot di sviluppo.                      ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════╝${NC}"
echo ""
read -rp "Sei sicuro di voler resettare? (yes/N): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Operazione annullata.${NC}"
    exit 0
fi

# 1. Cancella database
if [ -f "$DB_FILE" ]; then
    rm "$DB_FILE"
    echo -e "${GREEN}🗑️  Database eliminato: $DB_FILE${NC}"
else
    echo -e "${YELLOW}ℹ️  Database non trovato, salto.${NC}"
fi

# 2. Pulisce storage/pdfs (tranne .gitkeep)
if [ -d "$STORAGE_DIR" ]; then
    find "$STORAGE_DIR" -type f ! -name '.gitkeep' -delete
    echo -e "${GREEN}🗑️  PDF uploadati puliti: $STORAGE_DIR${NC}"
fi

# 3. Pulisce storage/snapshots
if [ -d "$SNAPSHOTS_DIR" ]; then
    rm -rf "$SNAPSHOTS_DIR"
    mkdir -p "$SNAPSHOTS_DIR"
    echo -e "${GREEN}🗑️  Snapshot puliti: $SNAPSHOTS_DIR${NC}"
fi

# 4. Ricrea DB pulito col comando CLI
if [ -f "$BACKEND_DIR/.venv/Scripts/activate" ]; then
    source "$BACKEND_DIR/.venv/Scripts/activate"
elif [ -f "$BACKEND_DIR/.venv/bin/activate" ]; then
    source "$BACKEND_DIR/.venv/bin/activate"
fi

cd "$BACKEND_DIR"
echo -e "${YELLOW}🔄  Avvio backend per rigenerare DB e seed...${NC}"
python -c "
from app.core.database import Base, engine
from app.main import _seed_license_features, _seed_super_admin
Base.metadata.create_all(bind=engine)
_seed_license_features()
_seed_super_admin()
print('✅ DB ricreato con tabelle e seed dati.')
"

echo ""
echo -e "${GREEN}✅ Reset completato!${NC}"
echo "   Per avviare il backend:  ./scripts/start-stack.sh"
echo "   Oppure:  cd backend && uvicorn app.main:app --reload"