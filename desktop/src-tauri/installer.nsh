; NSIS Hooks for Tauri v2 installer
; These macros run before/after install/uninstall to kill running processes
; that would otherwise block file overwrites (especially fastapi-sidecar.exe).
;
; The sidecar binary is renamed with the TARGET TRIPLE by the build
; (e.g. "fastapi-sidecar-x86_64-pc-windows-msvc.exe") and installed as
; "fastapi-sidecar.exe". A taskkill with only the literal base name can miss it.
; We kill the WHOLE TREE (taskkill /F /T) of any known process name and then
; retry, so both the app and (child/orphaned) sidecar die before file copy.

!macro KILL_PROCESSES
  DetailPrint "Stopping PdfEditor processes before install..."
  ; taskkill /F /T uccide il processo E tutto il suo albero figli: chiudendo
  ; il main app muore anche il sidecar che ne dipende. Usiamo i nomi possibili.
  nsExec::ExecToStack 'taskkill /F /T /IM "PdfEditor.exe" 2>nul'
  Pop $0
  nsExec::ExecToStack 'taskkill /F /T /IM "pdf-editor-desktop.exe" 2>nul'
  Pop $0
  ; Sidecar: base name (installato) + nome con tripla di build (se gira da li').
  nsExec::ExecToStack 'taskkill /F /T /IM "fastapi-sidecar.exe" 2>nul'
  Pop $0
  nsExec::ExecToStack 'taskkill /F /T /IM "fastapi-sidecar-x86_64-pc-windows-msvc.exe" 2>nul'
  Pop $0
  ; PS backstop: per nome con wildcard (copre qualunque variante tripla).
  nsExec::ExecToStack 'powershell -NoProfile -Command "Stop-Process -Name fastapi-sidecar* -Force -ErrorAction SilentlyContinue"'
  Pop $0
  Sleep 1000

  ; Retry loop: riprova finché non restano processi (~6 tentativi).
  StrCpy $1 0
  retry_loop:
    IntOp $1 $1 + 1
    nsExec::ExecToStack 'taskkill /F /T /IM "PdfEditor.exe" 2>nul'
    Pop $0
    nsExec::ExecToStack 'taskkill /F /T /IM "pdf-editor-desktop.exe" 2>nul'
    Pop $0
    nsExec::ExecToStack 'taskkill /F /T /IM "fastapi-sidecar.exe" 2>nul'
    Pop $0
    nsExec::ExecToStack 'powershell -NoProfile -Command "Stop-Process -Name fastapi-sidecar* -Force -ErrorAction SilentlyContinue"'
    Pop $0
    Sleep 500
  IntCmp $1 6 retry_done 0 retry_loop
  retry_done:
  DetailPrint "Process cleanup done."
!macroend

!macro NSIS_HOOK_PREINSTALL
  !insertmacro KILL_PROCESSES

  ; Auto-uninstall di un'installazione precedente (stessa versione sui build
  ; preview): evita il prompt NSIS "già installato, disinstallare prima" e
  ; permette di installare direttamente sopra. App e sidecar sono già stati
  ; chiusi sopra.
  DetailPrint "Removing previous PdfEditor installation (if present)..."
  ReadRegStr $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\PdfEditor" "UninstallString"
  StrCmp $0 "" fallback 0
    DetailPrint "Uninstaller found: $0"
    ExecWait '"$0" /S'
    Goto done_uninst
  fallback:
    IfFileExists "$INSTDIR\uninstall.exe" 0 done_uninst
      DetailPrint "Uninstaller found in install dir."
      ExecWait '"$INSTDIR\uninstall.exe" /S'
  done_uninst:
  Sleep 500
!macroend

!macro NSIS_HOOK_POSTINSTALL
  DetailPrint "PdfEditor installation complete."
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  DetailPrint "Stopping PdfEditor processes before uninstall..."
  !insertmacro KILL_PROCESSES
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  DetailPrint "PdfEditor uninstall complete."
!macroend