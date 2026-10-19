# Deep Agent — QA Loop (17/10/2026)

Procedura concordata con Mirko: **un bug/feature alla volta → build preview → test manuale di Mirko
→ se ok si passa al successivo, altrimenti si corregge e si rifà build+test.**
Fino a risoluzione di TUTTI i bug e le migliorie del Deep Agent.

Stato attuale: 17/10. Partiamo dal BUG 1.

---

## Live tracking (da aggiornare a ogni ciclo)

| # | Tipo | Descrizione | Stato |
|---|------|-------------|-------|
| 1 | Bug | **Startup**: testo+retry+accesso diretto; dopo C4/C5 entri nell'editor senza passare dal login e con 2 step reali. | ✅ CHIUSO (esito Mirko 18/10: 'sembra ok') |
| 15 | Bug | **Nome utente nell'editor**: dopo l'ingresso diretto (C5) all'inizio user non è popolato → sidebar col fallback "Utente" e profilo in loading. | ✅ CHIUSO (C6 EditorPage refresh al mount + C6b refreshSession parallelo nello startup; ok esito Mirko 18/10) |
| 14 | Bug | **Merge in chat sparisce senza esito**: parte "sto usando merge_pdf…" poi svanisce senza messaggi né errori. | 🔄 FIXATO (fallback _tool_result in _events) → da build + test Mirko |
| 2 | Bug | **Avanzate**: la cartella workspace non si salva tra una build e l'altra (persistenza). | ✅ CHIUSO (esito Mirko 19/10: 'funziona anche da una build all'altra') |
| 16 | Bug/Regressione | Nome utente torna 'Utente'/profilo in caricamento (riconfermato a posteriori, indagare più avanti). | ⏳ POSTICIPATO (da investigare) |
| 17 | Bug | Cloud sync: 'Sessione cloud scaduta' / errore sync (indagare più avanti). | ⏳ POSTICIPATO (da investigare) |
| 3 | Bug | Task list chat mostrava `chat.toolActivity` grezza. | ✅ RISOLTO (chiave i18n `8420fb75`) |
| 4 | Bug | Messaggi agente **mezzi in inglese** ("I can see i seguenti PDF...") → rafforzare il prompt di sistema per risposta sempre in italiano. | ⏳ in coda |
| 5 | Chiarito | Provider deep agent che ricarica la config salvata (ollama già selezionato) → comportamento corretto, non bug. | ✅ chiuso |
| 6 | Feature | **File esclusi di default dal backup cloud** (desktop + mobile): l'utente sceglie cosa salvare. | ⏳ in coda |
| 7 | Feature | Cronologia chat persistente locale. | ⏳ in coda |
| 8 | Feature | Focus pallino → input. | ⏳ in coda |
| 9 | Feature | Drag-resize del riquadro chat. | ⏳ in coda |
| 10 | Feature | Feedback strumenti con esito sempre. | ⏳ in coda |
| 11 | Feature | Migliorare "sto pensando" (no blocco percepito). | ⏳ in coda |
| 12 | Feature | Workspace non configurata → l'agente propone di configurarla. | ⏳ in coda |
| 13 | Feature | Avatar profilo Saru (dopo il deep agent). | ⏳ in coda |

---

## Log dei cicli fatti

- **C1 (17/10, 14:33)**: / BUG 1 startup — fix in lavorazione. Build → test → esito.