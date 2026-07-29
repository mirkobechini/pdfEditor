#!/usr/bin/env bash
# Preflight check — run BEFORE tagging a release
# Verifica rapidamente che npm ci, next build e import backend funzionino.
# Se fallisce, non perdere 25 min di build CI.
# Usage: bash desktop/preflight.sh
# Richiede: Node.js, Python 3.12+, venv attivato (opzionale)

set -euo pipefail
cd "$(dirname "$0")/.."
ROOT=$(pwd)
PASS=0
FAIL=0

pass() { PASS=$((PASS+1)); echo "  ✅ $1"; }
fail() { FAIL=$((FAIL+1)); echo "  ❌ $1"; }

echo ""
echo "═══════════════════════════════════════════"
echo "  🔍 PREFLIGHT — Release sanity check"
echo "═══════════════════════════════════════════"
echo ""

# ─────────────────────────────────────────────
# 1. Frontend web — npm ci
# ─────────────────────────────────────────────
echo "── 1/6 Frontend web (npm ci) ──"
cd "$ROOT/frontend"
if npm ci --silent 2>/dev/null; then
  pass "npm ci frontend"
else
  fail "npm ci frontend"
fi

# ─────────────────────────────────────────────
# 2. Desktop frontend — npm ci
# ─────────────────────────────────────────────
echo "── 2/6 Desktop frontend (npm ci) ──"
cd "$ROOT/desktop/frontend"
if npm ci 2>&1 | tail -3; then
  pass "npm ci desktop frontend"
else
  fail "npm ci desktop frontend"
fi

# ─────────────────────────────────────────────
# 3. Desktop frontend — next build
# ─────────────────────────────────────────────
echo "── 3/6 Desktop frontend (next build) ──"
cd "$ROOT/desktop/frontend"
if npx next build 2>&1 | tail -5; then
  pass "next build desktop frontend"
else
  fail "next build desktop frontend"
fi

# ─────────────────────────────────────────────
# 4. Backend — pip install
# ─────────────────────────────────────────────
echo "── 4/6 Backend (pip install) ──"
cd "$ROOT/backend"
if pip install -r requirements.txt -q 2>&1 | tail -3; then
  pass "pip install backend"
else
  fail "pip install backend"
fi

# ─────────────────────────────────────────────
# 5. Backend — sidecar imports (simula PyInstaller)
# ─────────────────────────────────────────────
echo "── 5/6 Sidecar imports ──"
cd "$ROOT/desktop"
if pip install pyinstaller -q 2>&1 | tail -1; then
  :
fi
PYTHONPATH="$ROOT/backend" python3 -c "
import sys
sys.path.insert(0, '$ROOT/backend')
from app.core.config import Settings
s = Settings()
print(f'  Settings OK: APP_NAME={s.APP_NAME}, DB={s.DATABASE_URL[:40]}...')
import app.main
import app.core.database
import app.core.csrf
import app.core.limiter
import app.core.license_seed
import app.models
import app.repositories
import app.services
import app.api.v1
import uvicorn
print('  All sidecar imports OK')
" && pass "sidecar imports" || fail "sidecar imports"

# ─────────────────────────────────────────────
# 6. Verifica versioni allineate
# ─────────────────────────────────────────────
echo "── 6/6 Version alignment ──"
V_FE=$(node -p "require('$ROOT/frontend/package.json').version")
V_DFE=$(node -p "require('$ROOT/desktop/frontend/package.json').version")
V_CARGO=$(node -p "require('$ROOT/desktop/src-tauri/Cargo.toml'.replace(/\.toml$/,'') )" 2>/dev/null || grep -m1 '^version' "$ROOT/desktop/src-tauri/Cargo.toml" | cut -d'"' -f2)
V_TAURI=$(node -p "require('$ROOT/desktop/src-tauri/tauri.conf.json').version")
V_UI=$(grep -oP 'v\d+\.\d+\.\d+' "$ROOT/desktop/frontend/src/app/startup/page.tsx" | head -1 | tr -d 'v')

echo "  Frontend web:      $V_FE"
echo "  Desktop frontend:  $V_DFE"
echo "  Cargo.toml:        $V_CARGO"
echo "  tauri.conf.json:   $V_TAURI"
echo "  Startup UI:        $V_UI"

if [ "$V_DFE" = "$V_FE" ] && [ "$V_FE" = "$V_CARGO" ] && [ "$V_CARGO" = "$V_TAURI" ]; then
  pass "versioni allineate ($V_FE)"
else
  fail "versioni NON allineate! Web=$V_FE Desktop=$V_DFE Cargo=$V_CARGO Tauri=$V_TAURI UI=$V_UI"
fi

# ─────────────────────────────────────────────
# Riepilogo
# ─────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════"
echo "  Risultati: $PASS ✅  |  $FAIL ❌"
echo "═══════════════════════════════════════════"
echo ""
if [ "$FAIL" -gt 0 ]; then
  echo "  ❌ Preflight FALLITO — correggi gli errori prima del tag."
  exit 1
else
  echo "  ✅ Preflight SUPERATO — puoi procedere con il tag!"
  exit 0
fi