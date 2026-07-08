#!/usr/bin/env bash
# -------------------------------------------------------------------
# seed-data.sh — Inserisce dati di esempio nel DB di sviluppo
# Uso: ./scripts/seed-data.sh
# Crea: utente free (demo@example.com / demo123), pro (pro@example.com / pro123)
#        e admin (admin@example.com / admin123)
# -------------------------------------------------------------------
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"

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
    exit 1
fi

cd "$BACKEND_DIR"

echo -e "${YELLOW}═══ Seed dati di sviluppo ═══${NC}"

python -c "
import uuid
from datetime import datetime, timezone
from app.core.database import SessionLocal
from app.models.user import User
from app.repositories.user_repo import UserRepository

db = SessionLocal()
repo = UserRepository(db)

demo_users = [
    ('demo@example.com', 'demo123', 'Demo User', 'free'),
    ('pro@example.com', 'pro123', 'Pro User', 'pro'),
    ('admin@example.com', 'admin123', 'Admin User', 'pro'),
]

for email, password, name, tier in demo_users:
    existing = repo.get_by_email(email)
    if existing:
        print(f'ℹ️  Utente già esistente: {email}')
        continue
    from app.core.security import hash_password
    user = User(
        id=str(uuid.uuid4()),
        email=email,
        hashed_password=hash_password(password),
        full_name=name,
        is_active=True,
        is_admin=(email == 'admin@example.com'),
        license_tier=tier,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.flush()
    print(f'✅ Creato utente: {email} / {password} (tier={tier})')

db.commit()
db.close()
print('')
print('Seed completato!')
"

echo ""
echo -e "${GREEN}✅ Dati di esempio inseriti.${NC}"
echo ""
echo "   Utenti creati:"
echo "     demo@example.com / demo123     → free"
echo "     pro@example.com / pro123       → pro"
echo "     admin@example.com / admin123   → admin"
echo ""
echo "   Per avviare il backend:  ./scripts/start-stack.sh"