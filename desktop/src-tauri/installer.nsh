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
