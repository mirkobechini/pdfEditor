# Reflections — Week 1

## Il codice fa quello che ho chiesto?

**Parzialmente** — il backend è sostanzialmente completo, il frontend ha delle lacune rispetto alla roadmap.

### Backend (Fase 1a) — ✅ Per lo più sì

Tutte le API richieste dal brief sono state implementate: upload/download con validazione magic bytes, merge/split con PyMuPDF, riordino e rimozione pagine, modifica testo (replace + extract), modifica metadati, conversione PDF ↔ DOCX/XLSX/PNG/JPG/TXT/SVG, autenticazione JWT, SSO Google, modelli licensing e bug reporting.

**Problemi critici:**

1. **✅ Enforcement licenze** — Implementato con `verify_feature_access()` in `deps.py`. Protegge tutti gli endpoint PDF avanzati. PR #62.
2. **⚠️ Nessuna autenticazione sugli endpoint PDF** — upload, merge, split, reorder... sono tutti pubblici. Potrebbe essere voluto per uso desktop offline, ma non è specificato.
3. **⚠️ BugReportService bypassa il repository pattern** — usa query dirette invece dei repository come fanno AuthService e PdfService.

### Frontend (Fase 1b) — ❌ Parzialmente

| Richiesta                                      | Stato                                                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Setup Next.js app router + React + TailwindCSS | ✅                                                                                               |
| Porting prototipo HTML a componenti React      | ✅                                                                                               |
| Sidebar (upload, elimina, rinomina)            | ✅                                                                                               |
| Toolbar navigazione + zoom + azioni            | ✅                                                                                               |
| Viewer PDF.js via CDN                          | ✅                                                                                               |
| **Dark mode toggle**                           | **✅ Completato (PR #60)** — localStorage persist + system preference fallback                   |
| Design responsive                              | ✅                                                                                               |
| Merge/split/riordino/rimozione (pdf-lib)       | ✅                                                                                               |
| **Pulsante segnalazione bug**                  | **✅ Completato (PR #56)**                                                                       |
| **Dashboard admin**                            | **❌ Non implementata**                                                                          |
| **UI autenticazione (login/register)**         | **✅ Completato (PR #58)**                                                                       |
| **i18n con next-intl**                         | **⚠️** `next-intl` è installato ma **non usato** — è stato implementato un `I18nProvider` custom |

## L'agente ha rispettato lo stack?

**Sì — con qualche deroga**

| Tecnologia                                | Rispettata?                                                                                     | Note                   |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------- |
| React + TailwindCSS v4                    | ✅                                                                                              |                        |
| Next.js app router con `output: "export"` | ✅                                                                                              |                        |
| FastAPI + SQLAlchemy 2.0 + SQLite         | ✅                                                                                              |                        |
| PyMuPDF (fitz)                            | ✅                                                                                              |                        |
| PDF.js                                    | ✅                                                                                              | Caricato via CDN cdnjs |
| UUID come PK                              | ✅                                                                                              |                        |
| Pydantic v2 + bcrypt                      | ✅                                                                                              |                        |
| pytest / vitest                           | ✅                                                                                              |                        |
| **Authlib** (SSO Google)                  | ⚠️ **No** — L'SSO Google è implementato con **PyJWT + requests**, non Authlib                   |
| **next-intl** (i18n)                      | ⚠️ **No** — Installato ma inutilizzato. Hanno creato un `I18nProvider` custom con React Context |

**Deroga principale**: Authlib non è stato usato per il SSO Google — implementazione manuale con PyJWT + requests. Funzionale ma non segue lo stack.
**Deroga secondaria**: next-intl è in `package.json` ma inutilizzato. Il provider i18n custom funziona ma aggiunge codice da mantenere.

## Cosa non era chiaro nel brief?

1. **Autenticazione endpoint PDF** — Il brief descrive JWT ma non specifica se _tutti_ gli endpoint debbano essere protetti o solo admin/bug report.
2. **Stato effettivo Fase 1b** — La checklist ha voci barrate come completate ma bug report button e admin dashboard non sono implementati.
3. **Merge/split lato client vs server** — I dialoghi usano pdf-lib lato client _invece_ degli endpoint API corrispondenti. Coesistono due implementazioni parallele.
4. **Modello BugReport divergente** — ✅ Risolto (PR #64): aggiunti `platform`, `app_version`, `os_info`. Refactoring con repository pattern.
5. **Enforcement licenze non specificato** — Il brief descrive tabelle e tier ma non dice esplicitamente "blocca le operazioni non consentite". Chi implementa può pensare basti esporre le feature via API.
6. **GOOGLE_CLIENT_ID vuoto in dev** — Non è chiaro se in sviluppo il SSO Google debba funzionare o sia accettabile che fallisca senza configurazione.

## Cosa ho imparato sul briefing?

**Un brief efficace deve specificare non solo cosa fare, ma anche cosa significa "fatto".** Ogni feature dovrebbe avere criteri di accettazione precisi: quali endpoint sono protetti, dove avviene l'elaborazione (client/server), modello dati esatto campo per campo, e se il licensing include solo la struttura o anche l'enforcement.

## Prossimo passo

Prima di procedere, risolveremo questi punti nell'ordine:

1. **Aggiungere il pulsante di segnalazione bug nel frontend** — previsto dalla roadmap Fase 1b, API backend già pronta ✅
2. **Aggiungere UI di autenticazione (login/register)** — i metodi API ci sono, mancano i componenti ✅
3. **Persistenza dark mode (localStorage)** — fix piccolo, alto impatto UX ✅
4. **Implementare l'enforcement licenze** — middleware/dependency che blocchi operazioni non consentite per tier ✅
5. **Allineare modello BugReport al brief** (campi `platform`, `app_version`, `os_info`) ✅
6. **DeleteModal con anteprima PDF per conferma eliminazione** ✅ (PR #74, issue #73)
7. **Aggiungere dashboard admin** (gestione utenti, licenze, bug report)
8. **Sostituire I18nProvider custom con next-intl** (già installato)
9. **Decidere se merge/split deve avvenire lato client o server** — attualmente fanno entrambi la stessa cosa in modo indipendente

## Bug aperti scoperti durante l'esplorazione (2026-06-25)

1. **🐛 Dark mode toggle non accessibile su login/register** — `ToggleDarkMode` è solo dentro `AppLayout` (usato dalla home protetta da auth). Un utente non loggato non può cambiare tema.
2. **🐛 Testo illeggibile in dark mode su login/register** — `<h1>`, `<label>` e `<input>` senza `dark:text-*` ereditano il colore nero di default su `bg-gray-800`.
3. **🐛 Validazione email backend troppo restrittiva** — `prova@example` viene rifiutata (422). Il backend usa validazione Pydantic che richiede un TLD valido.
4. **🐛 Messaggi di errore validazione in inglese** — Anche con lingua IT, gli errori di validazione lato server arrivano in inglese (es. "Invalid email address").

## UX feedback dall'esplorazione (2026-06-25)

### Ordine header (da destra a sinistra)

Attuale: `[Nome] [Esci] [Segnala Bug] [☀️] [IT/EN]`
Richiesto: `[☀️] [IT/EN] [Segnala Bug] [Nome] [Esci]`

### Language selector

- Deve essere visibile a chiunque (anche non loggato), non solo dentro AppLayout

### Upload PDF

- Drag & drop anche sul viewer centrale (non solo sidebar), specialmente quando appare "Seleziona un PDF da visualizzare"

### Merge / Split / Reorder / Remove (modifiche all'UX)

- Devono operare **sul PDF attualmente visualizzato**, senza richiedere di selezionare altri PDF
- **Reorder**: mostrare miniature di tutte le pagine con drag & drop per riordinare
- **Split**: simile a reorder — mostrare miniature e selezionare pagine da estrarre
- **Remove**: mostrare miniature di tutte le pagine, selezionare quelle da rimuovere, modale di conferma finale
- **Default**: qualsiasi modifica crea **un nuovo file da scaricare**, non modifica l'originale

### Login/Register

- Pagina register: migliorare layout dei messaggi di errore (stile più curato)

### Dark mode - prima visita

- Punto già implementato in PR #60: prima visita segue `prefers-color-scheme`, poi memorizza in localStorage. Verificare che funzioni correttamente su login/register (potrebbero non ereditare la classe `dark` all'avvio perché non passano da AppLayout).

## Sicurezza upload file — analisi (2026-06-25)

### Già protetto ✅

- Estensione controllata (.pdf)
- Magic bytes `%PDF` verificati
- Validazione PyMuPDF (apre e verifica che sia un PDF valido)
- Path traversal impossibile (filename UUID generato dal server)

### Da implementare ❌

1. **Limite dimensione non enforceato** — `MAX_UPLOAD_SIZE_MB=50` in config.py ma **mai controllato** nell'upload. File da 5GB crasherebbe il server.
2. **Lettura in memoria senza limiti** — `file.file.read()` carica tutto in RAM. Va controllata la dimensione PRIMA di leggere.
3. **Limite pagine** — Un PDF con 100.000 pagine passerebbe la validazione ma esaurirebbe risorse.
4. **Validazione endpoint `/pddfs/import`** — Accetta TXT/PNG/JPG/GIF/BMP con validazione minima.
5. **Nessun antivirus/ClamAV** — Oltre le tue esigenze probabilmente, ma segnalato per completezza.

## UX miglioramenti da fare (2026-06-25)

### Delete confirmation con modale e anteprima

- Attualmente: conferma inline con ✓ / ✗ accanto al file nella sidebar
- Richiesto: modale con anteprima prima pagina del PDF da eliminare
- ✅ **Completato (PR #74, issue #73)** — Creato `DeleteModal` con anteprima prima pagina via PDF.js, integrato in `Sidebar`, test completi (10 test passati)
