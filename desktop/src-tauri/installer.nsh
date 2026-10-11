; NSIS Hooks for Tauri v2 installer
; These macros run before/after install/uninstall to kill running processes
; that would otherwise block file overwrites (especially fastapi-sidecar.exe).
;
; IMPORTANT: the sidecar is renamed by the build to include the target triple,
; e.g. "fastapi-sidecar-x86_64-pc-windows-msvc.exe", so a taskkill with the
; literal name "fastapi-sidecar.exe" NEVER matches it and the file stays locked,
; blocking the install ("Error opening ... for writing"). We kill with a
; WILDCARD and retry until the processes are actually gone.

!macro KILL_PROCESSES
  ; Kill the main app first (stops it from re-spawning its sidecar).
  DetailPrint "Stopping PdfEditor processes before install..."
  nsExec::ExecToStack 'taskkill /F /T /IM "PdfEditor.exe" 2>nul'
  Pop $0
  nsExec::ExecToStack 'taskkill /F /T /IM "pdf-editor-desktop.exe" 2>nul'
  Pop $0
  nsExec::ExecToStack 'taskkill /F /T /IM "pdf-editor-desktop*" 2>nul'
  Pop $0
  ; Kill the sidecar with wildcard to match the target-triple name too.
  nsExec::ExecToStack 'taskkill /F /T /IM "fastapi-sidecar*" 2>nul'
  Pop $0
  Sleep 1000

  ; Retry loop: keep killing until no PdfEditor-sidecar process remains.
  ; nsExec returns "0" on success; we give up after ~10 tries (about 10s).
  StrCpy $1 0
  retry_loop:
    IntOp $1 $1 + 1
    nsExec::ExecToStack 'taskkill /F /T /IM "fastapi-sidecar*" 2>nul'
    Pop $0
    nsExec::ExecToStack 'taskkill /F /T /IM "pdf-editor-desktop*" 2>nul'
    Pop $0
    nsExec::ExecToStack 'taskkill /F /T /IM "PdfEditor.exe" 2>nul'
    Pop $0
    Sleep 500
  IntCmp $1 10 retry_done 0 retry_loop
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