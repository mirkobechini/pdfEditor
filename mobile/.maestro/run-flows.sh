#!/usr/bin/env bash
# Esegue ogni flow Maestro in .maestro/flows/ con un'invocazione separata
# (issue #923): se l'emulatore muore a metà suite, la diagnostica del
# flow che ha fallito PRIMA è comunque catturata (non aspetta la fine
# dell'intero batch). Committato come script reale perché l'azione
# reactivecircus/android-emulator-runner esegue ogni riga del campo
# `script:` come comando sh -c separato: un `for...do...done` scritto
# inline nello YAML multi-riga si rompe (verificato 06/10, run
# 37424403411: "for f in ...; do" da solo -> "Syntax error: end of file
# unexpected (expecting \"done\")", il resto del loop mai eseguito).
set -uo pipefail

MAESTRO="$HOME/.maestro/bin/maestro"
mkdir -p diag

OVERALL_EC=0
for f in .maestro/flows/*.yaml; do
  name=$(basename "$f" .yaml)
  echo "=== Flow: $name ==="
  "$MAESTRO" test "$f" --format junit --output "e2e-results-$name.xml"
  EC=$?
  echo "Flow $name exit code: $EC"
  if [ "$EC" -ne 0 ]; then
    OVERALL_EC=1
    echo "Cattura diagnostica emulatore per $name (screenshot+UI+logcat)..."
    adb exec-out screencap -p > "diag/e2e-screen-$name.png" 2>/dev/null || true
    adb shell uiautomator dump "/sdcard/e2e-ui-$name.xml" >/dev/null 2>&1 && adb pull "/sdcard/e2e-ui-$name.xml" "diag/" >/dev/null 2>&1 || true
    adb logcat -d -t 500 > "diag/e2e-logcat-$name.txt" 2>/dev/null || true
  fi
done

echo "Overall exit code: $OVERALL_EC"
exit "$OVERALL_EC"
