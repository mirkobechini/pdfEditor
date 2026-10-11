; NSIS Hooks for Tauri v2 installer
; These macros run before/after install/uninstall to kill running processes
; that would otherwise block file overwrites (especially fastapi-sidecar.exe).
;
; IMPORTANT: the sidecar is renamed by the build to include the target triple,
; e.g. "fastapi-sidecar-x86_64-pc-windows-msvc.exe", so a taskkill with the
; literal name "fastapi-sidecar.exe" NEVER matches it and the file stays locked,
; blocking the install ("Error opening ... for writing"). We kill with a
; WILDCARD and retry until the processes are actually gone.

; Override della macro di Tauri `CheckIfAppIsRunning`: NON fattibile — NSIS
; non permette di ridefinire una macro gia' esistente (errore "already exists").
; Il prompt "<app> is running" resta gestito dal template di Tauri; a chiudere
; app + sidecar ci pensa la nostra KILL_PROCESSES nei pre-hook.

!macro KILL_PROCESSES
  ; Chiude app + sidecar in modo AFFIDABILE.
  ; taskkill /IM NON supporta i wildcard e il sidecar viene rinominato con la
  ; tripla di target (fastapi-sidecar-<triple>.exe), quindi un taskkill col nome
  ; esatto non lo trova MAI e il file resta locked. PowerShell Get-Process /
  ; Stop-Process accettano ECCO i wildcard.
  DetailPrint "Stopping PdfEditor processes before install..."
  ; 1) si chiude l'app principale (e l'albero processi)
  nsExec::ExecToStack 'powershell -NoProfile -Command "Get-Process PdfEditor,pdf-editor-desktop -ErrorAction SilentlyContinue | Stop-Process -Force"'
  Pop $0
  ; 2) si chiude il sidecar con wildcard (copre il nome con tripla)
  nsExec::ExecToStack 'powershell -NoProfile -Command "Get-Process fastapi-sidecar* -ErrorAction SilentlyContinue | Stop-Process -Force"'
  Pop $0
  Sleep 1000

  ; Retry loop: riprova finché i processi non risultano chiusi (~6 tentativi).
  StrCpy $1 0
  retry_loop:
    IntOp $1 $1 + 1
    nsExec::ExecToStack 'powershell -NoProfile -Command "Get-Process fastapi-sidecar*,PdfEditor,pdf-editor-desktop -ErrorAction SilentlyContinue | Stop-Process -Force"'
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