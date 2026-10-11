; NSIS Hooks for Tauri v2 installer
; These macros run before/after install/uninstall to kill running processes
; that would otherwise block file overwrites (especially fastapi-sidecar.exe)

!macro NSIS_HOOK_PREINSTALL
  DetailPrint "Stopping PdfEditor processes before install..."
  nsExec::ExecToStack 'taskkill /F /IM "PdfEditor.exe" 2>nul'
  Pop $0
  Sleep 500
  nsExec::ExecToStack 'taskkill /F /IM "fastapi-sidecar.exe" 2>nul'
  Pop $0
  Sleep 500
  nsExec::ExecToStack 'taskkill /F /IM "pdf-editor-desktop.exe" 2>nul'
  Pop $0
  Sleep 500

  ; Auto-uninstall di un'installazione precedente (stessa versione sui build
  ; preview): evita il prompt NSIS "già installato, disinstallare prima" e
  ; permette di installare direttamente sopra. Chiude app + sidecar prima
  ; (l'uninstaller precedente fa lo stesso nei suoi hook).
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
  nsExec::ExecToStack 'taskkill /F /IM "PdfEditor.exe" 2>nul'
  Pop $0
  Sleep 500
  nsExec::ExecToStack 'taskkill /F /IM "fastapi-sidecar.exe" 2>nul'
  Pop $0
  Sleep 500
  nsExec::ExecToStack 'taskkill /F /IM "pdf-editor-desktop.exe" 2>nul'
  Pop $0
  Sleep 500
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  DetailPrint "PdfEditor uninstall complete."
!macroend
