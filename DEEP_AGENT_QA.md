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
| 14 | Bug | **Merge**: (a) spariva l'esito (✓ risolto: fallback _tool_result), (b) cercava nel backend invece dei file fisici workspace (✓ risolto: C14g), (c) l'agente correggeva i nomi da solo senza chiedere conferma — ANCORA APERTO (da risolvere: prompt agente C14i insufficiente, richiede conferma esplicita). | 🔄 funzionale ✓ (C14g/C14h/C14i); conferma ancora APERTA — ripresa dopo #18 |
| 2 | Bug | **Avanzate**: la cartella workspace non si salva tra una build e l'altra (persistenza). | ✅ CHIUSO (esito Mirko 19/10: 'funziona anche da una build all'altra') |
| 16 | Bug/Regressione | Nome utente torna 'Utente'/profilo in caricamento (riconfermato a posteriori, indagare più avanti). | ⏳ POSTICIPATO (da investigare) |
| 17 | Bug | Cloud sync: 'Sessione cloud scaduta' / errore sync (indagare più avanti). | ⏳ POSTICIPATO (da investigare) |
| 3 | Bug | Task list chat mostrava `chat.toolActivity` grezza. | ✅ RISOLTO (chiave i18n `8420fb75`) |
| 4 | Bug | Messaggi agente **mezzi in inglese** ("I can see i seguenti PDF...") → rafforzare il prompt di sistema per risposta sempre in italiano. | ⏳ PER ULTIMO (ordine Mirko 19/10) |
| 5 | Chiarito | Provider deep agent che ricarica la config salvata (ollama già selezionato) → comportamento corretto, non bug. | ✅ chiuso |
| 6 | Feature | **File esclusi di default dal backup cloud** (desktop + mobile): l'utente sceglie cosa salvare. | ⏳ in coda |
| 7 | Feature | Cronologia chat persistente locale. | ✅ GIÀ FATTO (Mirko 19/10: la cronologia persistente locale c'è già) |
| 8 | Feature | Focus pallino → input. | ⏳ prossimo (con #9 stessa build) |
| 9 | Feature | Drag-resize del riquadro chat. | ⏳ prossimo (con #8 stessa build) |
| 10 | Feature | Feedback strumenti con esito sempre. | ⏳ in coda |
| 11 | Feature | Migliorare "sto pensando" (no blocco percepito). | ⏳ in coda |
| 12 | Feature | Workspace non configurata → l'agente propone di configurarla. | ⏳ in coda |
| 13 | Feature | Avatar profilo Saru (dopo il deep agent). | ⏳ in coda (ultimo) |

| 18 | Bug | L'agente **ri-esegue azioni vecchie dalla cronologia persistente** (es. scrivi "ciao che file vedi?" e rifà il merge di giorni fa). Distinto dal Bug 14 (che è l'esito che sparisce). Da sistemare limitando/pulendo la history inviata all'agente. | ⏳ PROSSIMO (dopo C14b) |

| 19 | Bug | Tool **elenca_workspace** segnala 'require the cartella parameter': `elenca_workspace()` è senza parametri ma il modello lo confonde con `elenca_file(cartella)` → va chiarito lo schema/prompt o rimosso l'ambiguo. | ⏳ in coda (dopo C14c) |

| 20 | Feature | L'agente deve poter **caricare file da PC nell'editor** e fare **operazioni sui file dell'editor** (punto 4 di Mirko 19/10). | ⏳ in coda (da pianificare) |

### Ordine di avanzamento (deciso da Mirko 19/10, aggiornato 14:06)
Dopo la build C14b (merge: _tool_result legge anche nodo tools) → **BUG 18** (ri-esecuzione azioni vecchie dalla cronologia) → 8+9 (stessa build) → 10 → 11 → 12 → 16 → 17 → 4 (per ultimo) → 6. #7 già fatto. #13 avatar ultimo in assoluto.

---

## Log dei cicli fatti

- **C1 (17/10, 14:33)**: / BUG 1 startup — fix in lavorazione. Build → test → esito.