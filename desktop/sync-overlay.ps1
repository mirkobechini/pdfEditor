# Sync desktop overlay files into frontend/ before Tauri build.
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$OverlaySrc = Join-Path $ScriptDir "frontend-overlay\src"
$FrontendSrc = Join-Path $ScriptDir "..\frontend\src"

Write-Host "[sync-overlay] Copying desktop overlay to frontend..."
Copy-Item -Recurse -Force "$OverlaySrc\*" "$FrontendSrc\"
Write-Host "[sync-overlay] Done."