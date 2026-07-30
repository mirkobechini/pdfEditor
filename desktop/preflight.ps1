# Preflight check — run BEFORE tagging a release
# PowerShell version (Windows)
# Usage: .\desktop\preflight.ps1
# Richiede: Node.js, Python 3.12+

$ErrorActionPreference = "Stop"
$Root = Resolve-Path "$PSScriptRoot\.."
$Pass = 0
$Fail = 0

function pass($msg) { $global:Pass += 1; Write-Host "  ✅ $msg" -ForegroundColor Green }
function fail($msg) { $global:Fail += 1; Write-Host "  ❌ $msg" -ForegroundColor Red }

Write-Host ""
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🔍 PREFLIGHT — Release sanity check" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ── 1/6 Frontend web npm ci ──
Write-Host "── 1/6 Frontend web (npm ci) ──"
Set-Location "$Root\frontend"
try { npm ci --silent 2>$null; pass "npm ci frontend" } catch { fail "npm ci frontend" }

# ── 2/6 Desktop frontend npm ci ──
Write-Host "── 2/6 Desktop frontend (npm ci) ──"
Set-Location "$Root\desktop\frontend"
try { npm ci 2>&1 | Select-Object -Last 3; pass "npm ci desktop frontend" } catch { fail "npm ci desktop frontend" }

# ── 3/6 Desktop frontend next build ──
Write-Host "── 3/6 Desktop frontend (next build) ──"
Set-Location "$Root\desktop\frontend"
try { npx next build 2>&1 | Select-Object -Last 5; pass "next build desktop frontend" } catch { fail "next build desktop frontend" }

# ── 4/6 Backend pip install ──
Write-Host "── 4/6 Backend (pip install) ──"
Set-Location "$Root\backend"
try { pip install -r requirements.txt -q 2>&1 | Select-Object -Last 3; pass "pip install backend" } catch { fail "pip install backend" }

# ── 5/6 Sidecar imports ──
Write-Host "── 5/6 Sidecar imports ──"
Set-Location "$Root\desktop"
try {
    pip install pyinstaller -q 2>&1 | Out-Null
    $env:PYTHONPATH = "$Root\backend"
    python -c @"
import sys
sys.path.insert(0, '$Root/backend')
from app.core.config import Settings
s = Settings()
print(f'  Settings OK: APP_NAME={s.APP_NAME}')
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
"@
    pass "sidecar imports"
}
catch { fail "sidecar imports ($($_.Exception.Message))" }

# ── 6/6 Version alignment ──
Write-Host "── 6/6 Version alignment ──"
$VFe = (Select-String '"version":\s*"([^"]+)"' "$Root\frontend\package.json").Matches[0].Groups[1].Value
$VDfe = (Select-String '"version":\s*"([^"]+)"' "$Root\desktop\frontend\package.json").Matches[0].Groups[1].Value
$VCargo = Select-String '^version = "(.*)"' "$Root\desktop\src-tauri\Cargo.toml" | ForEach-Object { $_.Matches.Groups[1].Value }
$VTauri = (Select-String '"version":\s*"([^"]+)"' "$Root\desktop\src-tauri\tauri.conf.json").Matches[0].Groups[1].Value
$VUi = (Select-String 'v(\d+\.\d+\.\d+)' "$Root\desktop\frontend\src\app\startup\page.tsx").Matches[0].Groups[1].Value

Write-Host "  Frontend web:      $VFe"
Write-Host "  Desktop frontend:  $VDfe"
Write-Host "  Cargo.toml:        $VCargo"
Write-Host "  tauri.conf.json:   $VTauri"
Write-Host "  Startup UI:        $VUi"

$VEn = (Select-String '"version":\s*"v([^"]+)"' "$Root\desktop\frontend\messages\en.json").Matches[0].Groups[1].Value
$VIt = (Select-String '"version":\s*"v([^"]+)"' "$Root\desktop\frontend\messages\it.json").Matches[0].Groups[1].Value
Write-Host "  messages/en.json:  $VEn"
Write-Host "  messages/it.json:  $VIt"

if ($VDfe -eq $VFe -and $VFe -eq $VCargo -and $VCargo -eq $VTauri -and $VTauri -eq $VEn -and $VEn -eq $VIt) {
    pass "versioni allineate ($VFe)"
}
else {
    fail "versioni NON allineate! Web=$VFe Desktop=$VDfe Cargo=$VCargo Tauri=$VTauri UI=$VUi"
}

# ── Riepilogo ──
Write-Host ""
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Risultati: $Pass ✅  |  $Fail ❌" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
if ($Fail -gt 0) {
    Write-Host "  ❌ Preflight FALLITO — correggi gli errori prima del tag." -ForegroundColor Red
    exit 1
}
else {
    Write-Host "  ✅ Preflight SUPERATO — puoi procedere con il tag!" -ForegroundColor Green
    exit 0
}