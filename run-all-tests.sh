#!/usr/bin/env bash
# Full test suite runner — lancia tutti i test del progetto e mostra un report finale.
# Uso: bash run-all-tests.sh

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
FAILED=0
RESULTS=()

# Colori
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

run_suite() {
    local name="$1"
    local cmd="$2"
    local dir="$3"

    echo ""
    echo "========================================"
    echo -e "${YELLOW}  RUNNING: $name${NC}"
    echo "========================================"
    echo ""

    cd "$ROOT_DIR/$dir"

    if eval "$cmd"; then
        echo ""
        echo -e "${GREEN}  ✅ $name: PASSED${NC}"
        RESULTS+=("✅ $name: PASSED")
    else
        echo ""
        echo -e "${RED}  ❌ $name: FAILED${NC}"
        RESULTS+=("❌ $name: FAILED")
        FAILED=1
    fi
    echo ""
}

# ─── Backend (Python) ──────────────────────────────────────────────
run_suite "Backend (pytest)" "python -m pytest -q --tb=short 2>&1 | tail -5" "backend"

# ─── Frontend web (Next.js) ────────────────────────────────────────
run_suite "Frontend web (vitest)" "npx vitest run --reporter=verbose 2>&1 | tail -10" "frontend"

# ─── Mobile (Expo/React Native) ────────────────────────────────────
run_suite "Mobile (jest)" "npx jest --no-coverage 2>&1 | tail -10" "mobile"

# ─── Report finale ─────────────────────────────────────────────────
echo ""
echo "========================================"
echo -e "${YELLOW}  FINAL REPORT${NC}"
echo "========================================"
for result in "${RESULTS[@]}"; do
    echo "  $result"
done
echo "========================================"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}  ✅ ALL SUITES PASSED${NC}"
else
    echo -e "${RED}  ❌ SOME SUITES FAILED${NC}"
fi
echo "========================================"

exit $FAILED
