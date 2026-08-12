# Bug: Settings antialiasing/densità nessun effetto visibile (K4)

## Obiettivo

Rendere visibili le impostazioni di antialiasing e densità nelle impostazioni desktop, oppure rimuoverle se non implementabili.

## Contesto

- **KNOWN_ISSUES.md K4**: Settings antialiasing/densità nessun effetto visibile
- File: `desktop/frontend/src/app/settings/page.tsx`
- Antialiasing: agisce su `-webkit-font-smoothing` su body, differenza impercettibile
- Densità: modifica padding di `.doc-item` (8/12/20px), differenza troppo sottile

## Opzioni

1. **Migliorare l'effetto**: aumentare la differenza tra i livelli di densità (es. 4/16/32px) e aggiungere più elementi affetti
2. **Rimuovere i toggle**: se non implementabili in modo visibile, rimuovere le opzioni dalle impostazioni
3. **Sostituire con feature utili**: es. dimensione del testo, spaziatura righe

## Output atteso

- Toggle antialiasing e select densità producono un effetto visibile, oppure
- Opzioni rimosse dalle impostazioni

## Status

[ ] Non iniziata
