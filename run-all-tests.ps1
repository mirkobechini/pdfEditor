# Full test suite runner — lancia tutti i test del progetto e mostra un report finale.
# Uso: .\run-all-tests.ps1

$ROOT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$FAILED = $false
$RESULTS = @()

function Run-Suite {
    param($Name, $Cmd, $Dir)

    Write-Host ""
    Write-Host "========================================"
    Write-Host "  RUNNING: $Name" -ForegroundColor Yellow
    Write-Host "========================================"
    Write-Host ""

    Set-Location "$ROOT_DIR\$Dir"

    try {
        $output = Invoke-Expression $Cmd
        if ($LASTEXITCODE -eq 0 -or $LASTEXITCODE -eq $null) {
            Write-Host ""
            Write-Host "  ✅ $Name: PASSED" -ForegroundColor Green
            $RESULTS += "✅ $Name: PASSED"
        } else {
            throw "exit code $LASTEXITCODE"
        }
    } catch {
        Write-Host ""
        Write-Host "  ❌ $Name: FAILED" -ForegroundColor Red
        $RESULTS += "❌ $Name: FAILED"
        $FAILED = $true
    }
    Write-Host ""
}

# ─── Backend (Python) ──────────────────────────────────────────────
Run-Suite -Name "Backend (pytest)" -Cmd "python -m pytest -q --tb=short 2>&1 | Select-Object -Last 5" -Dir "backend"

# ─── Frontend web (Next.js) ────────────────────────────────────────
Run-Suite -Name "Frontend web (vitest)" -Cmd "npx vitest run --reporter=verbose 2>&1 | Select-Object -Last 10" -Dir "frontend"

# ─── Mobile (Expo/React Native) ────────────────────────────────────
Run-Suite -Name "Mobile (jest)" -Cmd "npx jest --no-coverage 2>&1 | Select-Object -Last 10" -Dir "mobile"

# ─── Report finale ─────────────────────────────────────────────────
Write-Host ""
Write-Host "========================================"
Write-Host "  FINAL REPORT" -ForegroundColor Yellow
Write-Host "========================================"
foreach ($result in $RESULTS) {
    Write-Host "  $result"
}
Write-Host "========================================"

if (-not $FAILED) {
    Write-Host "  ✅ ALL SUITES PASSED" -ForegroundColor Green
} else {
    Write-Host "  ❌ SOME SUITES FAILED" -ForegroundColor Red
}
Write-Host "========================================"

exit ($FAILED ? 1 : 0)
