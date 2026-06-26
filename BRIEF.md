# Brief: PdfEditor

## Obiettivo

Applicazione **cross-platform** per la modifica e gestione di file PDF, con funzionalità di visualizzazione, annotazione, conversione, modifica testo e manipolazione avanzata. Desktop (Tauri), Web (Next.js), Mobile (React Native).

## Stato avanzamento

_Aggiornato automaticamente dall'agente alla chiusura di ogni issue (merge in `dev`)._

- [x] **Fase 0** — Prototipo HTML statico ✅
- [x] **Fase 1a** — Backend FastAPI ✅ (con enforcement licenze ✅ e BugReport model allineato ✅)
- [x] **Fase 1b** — Frontend Next.js (bug report ✅, auth UI ✅, dark mode ✅, header controls ✅, dialog refactor ✅)
- [ ] **Fase 1c** — Desktop Tauri v2
- [ ] **Fase 2** — Web app su cloud
- [ ] **Fase 3** — Cloud sync
- [ ] **Fase 4** — Mobile app React Native

## Stack scelto

| Livello                | Tecnologia               | Ruolo                                                                  |
| ---------------------- | ------------------------ | ---------------------------------------------------------------------- |
| **Frontend**           | React + TailwindCSS      | UI condivisa tra web, desktop e mobile                                 |
| **Web app**            | Next.js (app router)     | Versione browser, PWA installabile                                     |
| **Desktop**            | Tauri v2 (Rust)          | App nativa leggera (~5MB UI + ~30-50MB sidecar FastAPI), stessa web UI |
| **Mobile**             | React Native (Expo bare) | App nativa iOS/Android, logica React condivisa                         |
| **Backend**            | FastAPI (Python)         | Auth, elaborazione PDF, cloud sync                                     |
| **PDF modifica testo** | PyMuPDF (fitz)           | Modifica testo, estrazione, manipolazione                              |
| **PDF viewer**         | PDF.js (Mozilla)         | Render lato client                                                     |
| **Database offline**   | SQLite                   | Stessa struttura del cloud, sync bidirezionale                         |
| **Database cloud**     | PostgreSQL               | Produzione, sincronizzato con SQLite locale                            |

## Roadmap (ordine di implementazione)

> Panoramica macro delle fasi. Il dettaglio operativo con issue number è nella sezione [Feature roadmap](#feature-roadmap-ordine-di-implementazione) più avanti.

1. **Prototipo (Fase 0)** — Singola pagina HTML statica ✅ Completato
2. **Desktop app (Fase 1)** — Tauri + Next.js + FastAPI locale (sidecar). Prima versione funzionante offline
   - **Fase 1a**: Backend FastAPI
   - **Fase 1b**: Frontend Next.js
   - **Fase 1c**: Tauri wrapper
3. **Web app (Fase 2)** — Next.js + FastAPI cloud. Stessa UI, backend remoto
4. **Cloud sync (Fase 3)** — Sync bidirezionale SQLite ↔ PostgreSQL
5. **Mobile app (Fase 4)** — React Native. Stesse API cloud

> Ogni fase parte SOLO dopo che la precedente è stata approvata dall'utente.

## Risoluzione falle tecniche

### 1. PyMuPDF — Licenza AGPL

Il progetto sarà **open source** (no intenzione commerciale), quindi la licenza AGPL è compatibile. Se un domani dovesse diventare closed source, si valuterà licenza commerciale PyMuPDF o alternative.

### 2. Next.js per Tauri (static export)

- Usare **app router** per compatibilità con `output: 'export'` di Next.js
- Le API routes non servono: tutte le API vanno su FastAPI
- Next.js è solo UI + chiamate REST

### 3. React Native: UI ≠ condivisa, logica sì

- **Logica condivisibile**: hook personalizzati (usePdfFiles, useAuth), API client, contesti, utility
- **UI separata**: componenti HTML (Next.js) vs componenti nativi (React Native). Non copia-incollare
- `react-native-web` valutabile per ridurre il gap
- **Expo bare workflow** (Dev Client) — accesso completo ai moduli nativi senza migrazioni future. WebView, file system e SQLite nativi già coperti

### 4. SQLite ↔ PostgreSQL sync

- **UUID** come chiavi primarie dappertutto (nessun autoincrement)
- **timestamp** su ogni record per `updated_at`
- API di sync dedicata:
  - `GET /sync/pull?since=<timestamp>` — tutte le modifiche dopo X
  - `POST /sync/push` — invia modifiche locali
- **Risoluzione conflitti**: lock ottimistico — quando un utente apre un PDF per modificarlo, viene registrato un lock. Se un altro utente prova a modificare lo stesso PDF, lo vede in sola lettura. Il lock si rilascia al salvataggio esplicito o dopo un timeout di inattività (es. 30 min)
- Il sync è una fase separata, non blocca lo sviluppo offline

### 5. PDF.js su React Native

- Mobile viewer via **WebView** che carica PDF.js
- Stessa libreria, stesso rendering, UX accettabile

### 6. Tauri v2 sidecar per FastAPI locale

- Tauri **v2** (non v1) — versione attuale, future-proof, con supporto plugin nativi e architettura a plugin npm/cargo
- FastAPI bundlato con **PyInstaller** in un eseguibile unico
- Tauri lo avvia come **sidecar** all'avvio dell'app
- Occupazione extra: ~30-50MB (accettabile, sotto il limite di 50MB dichiarato)

### 7. PDF protetti da password

- **Rilevamento automatico**: all'upload, PyMuPDF rileva se il PDF è criptato e restituisce un flag `requires_password: true`
- **UI**: la toolbar mostra un modale "Questo PDF è protetto — inserisci password" prima di permettere visualizzazione/modifica
- **API**: l'endpoint di apertura accetta un campo `password` opzionale; se omessa e il file è protetto, risponde con 403 + flag
- **Cache**: la password viene tenuta in memoria per la sessione (non salvata su disco)
- **Fallback**: se la password è errata, l'API restituisce errore e l'utente può riprovare

### 8. Undo/redo per modifiche PDF

- **Cronologia lato server**: ogni operazione di modifica (riordino pagine, rimozione, modifica testo) registra uno snapshot del file prima dell'operazione
- **Limite**: massimo 10 snapshot per sessione (configurabile), i più vecchi vengono scartati
- **API undo/redo**:
  - `POST /pdf/{id}/undo` — ripristina lo snapshot precedente
  - `POST /pdf/{id}/redo` — riapplica l'operazione annullata
- **Reset cronologia**: il salvataggio esplicito del file resetta la cronologia undo/redo
- **Lato UI**: pulsanti Undo/redo nella toolbar, con shortcut `Ctrl+Z` / `Ctrl+Shift+Z`

### 9. Internazionalizzazione (i18n)

- **Libreria**: `next-intl` — nativamente compatibile con Next.js App Router
- **Struttura**: file JSON per lingua in `messages/{locale}.json`
- **Lingue**: italiano (`it`) come lingua primaria, inglese (`en`) come fallback. Pronte per aggiungere altre lingue
- **Setup**: integrata da subito nel progetto Next.js per evitare rifattorizzazioni future
- **Scope**: UI (menu, toolbar, pulsanti) + messaggi di errore API. Il contenuto dei PDF ovviamente non è tradotto
- **Selettore lingua**: dropdown nell'header, posizionamento accanto al dark mode toggle

### 10. Tagged PDF (accessibilità output)

- **Default**: tutti i PDF generati dal programma (merge, split, conversione DOCX→PDF, modifica testo) sono **tagged PDF** — contengono tag strutturali (intestazioni, paragrafi, ordine di lettura, lingua)
- **Screen reader compatibili**: i PDF prodotti sono leggibili da VoiceOver, JAWS, NVDA
- **Implementazione**: PyMuPDF supporta l'aggiunta di tag a livello di pagina. Ogni operazione di output include la generazione dei tag
- **Complessità**: media — si integra nel service layer di generazione PDF, non nella logica di modifica
- **Test**: aggiungere un test di validazione struttura tagged per ogni operazione di output

## Componenti principali

- Visualizzazione dei file PDF
- Barra laterale con elenco dei PDF caricati e opzioni di gestione (elimina, rinomina, ecc.)
- Barra degli strumenti in alto con opzioni per annotare, modificare e convertire i PDF
- Area di lavoro centrale per visualizzare il PDF selezionato
- Conversione dei PDF in altri formati (Word, Excel, immagini) e viceversa

### Funzionalità bonus (post-MVP)

- Unione e divisione di file PDF (merge/split)
- Modifica del contenuto dei PDF (aggiunta/rimozione di pagine, modifica del testo, riordino pagine con drag & drop)
- Modifica metadati PDF (titolo, autore, soggetto, parole chiave)
- Dark mode
- SSO con Google (futuro: Apple, Samsung)
- Cloud save opzionale (offline-first)

## Architettura

```
┌──────────────────────────────────────────────────────┐
│                  CLIENT                               │
│  ┌──────────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  NEXT.JS     │  │  TAURI   │  │ REACT NATIVE  │  │
│  │  Web / PWA   │  │ Desktop  │  │ Mobile        │  │
│  │  React+Tailw │  │ ~5MB     │  │ iOS/Android   │  │
│  └──────┬───────┘  └────┬─────┘  └───────┬───────┘  │
│         └───────┬───────┴────────┬────────┘         │
│                 │          REST/JSON (+ JWT)         │
└─────────────────┼───────────────────────────────────┘
                  │
┌─────────────────┼───────────────────────────────────┐
│           BACKEND (FASTAPI)                          │
│  ┌──────────────┴────────────────────────────────┐  │
│  │           FASTAPI (Python)                     │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │  │
│  │  │ Auth     │ │ PDF proc │ │ Cloud sync   │  │  │
│  │  │ JWT+OAuth│ │ PyMuPDF  │ │ PostgreSQL/S3│  │  │
│  │  └──────────┘ └──────────┘ └──────────────┘  │  │
│  └───────────────────────────────────────────────┘  │
│                                                      │
│  OFFLINE: SQLite + file system locale                │
│  CLOUD:   PostgreSQL + S3 (stessa struttura)         │
└──────────────────────────────────────────────────────┘
```

## Struttura repository

```
PdfEditor/
├── backend/              # FastAPI (Python)
│   ├── app/
│   ├── tests/
│   ├── alembic/
│   └── requirements.txt
├── frontend/             # Next.js (Fase 1b)
│   └── ...
├── desktop/              # Tauri v2 sidecar (Fase 1c - futuro)
├── mobile/               # React Native Expo (Fase 4 - futuro)
└── .gitignore
```

> La struttura parte semplice (`frontend/` per Next.js). Quando arriveranno Tauri e mobile, si valuterà la migrazione a monorepo (es. `apps/web`, `apps/desktop`, `apps/mobile`, `packages/shared`).

## Backend architecture pattern (FastAPI)

Equivalente a MVC in Laravel. I router (≈ Controllers) NON contengono validazione — quella va negli schemas Pydantic.

```
backend/
├── app/
│   ├── api/              # Router (≈ Controller) — solo routing
│   │   ├── v1/
│   │   │   ├── upload.py
│   │   │   ├── merge_split.py
│   │   │   ├── reorder.py
│   │   │   ├── text.py
│   │   │   ├── metadata.py
│   │   │   ├── convert.py
│   │   │   ├── auth.py
│   │   │   ├── admin.py
│   │   │   └── bug_report.py
│   │   └── deps.py       # Dipendenze (get_current_user, get_db)
│   ├── schemas/          # Pydantic (≈ FormRequest) — validazione
│   │   ├── pdf.py
│   │   ├── auth.py
│   │   └── sync.py
│   ├── models/           # SQLAlchemy (≈ Eloquent Model)
│   │   ├── pdf.py
│   │   ├── user.py
│   │   ├── license.py
│   │   └── bug_report.py
│   ├── services/         # Logica di business
│   │   ├── pdf_service.py
│   │   ├── auth_service.py
│   │   ├── bug_report_service.py
│   │   └── sync_service.py
│   ├── repositories/     # Accesso DB
│   │   ├── pdf_repo.py
│   │   └── user_repo.py
│   ├── core/             # Config, security, database
│   │   ├── config.py
│   │   ├── security.py
│   │   ├── database.py
│   │   └── storage.py
│   └── main.py
├── tests/
│   ├── conftest.py
│   ├── test_upload.py
│   ├── test_merge_split.py
│   ├── test_reorder.py
│   ├── test_text.py
│   ├── test_metadata.py
│   ├── test_convert.py
│   ├── test_auth.py
│   ├── test_license.py
│   └── test_bug_report.py
├── alembic/              # Migrations (≈ Laravel Migrations)
│   ├── versions/
│   └── env.py
├── requirements.txt
└── pyproject.toml
```

## Feature roadmap (ordine di implementazione)

_Ogni feature è un'issue GitHub separata. La numerazione è progressiva._

### Fase 1a — Backend API (FastAPI) — per desktop offline

- [x] API upload/download file PDF (file system locale)
- [x] API merge/split PDF (PyMuPDF)
- [x] API riordino e rimozione pagine (PyMuPDF)
- [x] API **modifica testo** nei PDF (PyMuPDF)
- [x] API **modifica metadati** PDF
- [x] API conversione PDF ↔ DOCX/XLSX/PNG/JPG
- [x] Autenticazione JWT (email/password)
- [x] SSO con Google
- [x] Modelli licensing (User.license_tier, LicenseFeature)
- [x] API bug reporting (BugReport model + endpoint)

### Fase 1b — Desktop UI (Next.js + TailwindCSS) — prima versione

- [x] Setup Next.js (app router) + React + TailwindCSS
- [x] Porting prototipo da HTML statico a componenti React
- [x] Sidebar con elenco PDF (upload, elimina, rinomina)
- [x] Toolbar navigazione + zoom + azioni
- [x] Viewer PDF.js integrato
- [x] Dark mode toggle nell'header
- [x] Design responsive completo
- [x] Bonus: merge, split, riordino, rimozione pagine (via pdf-lib lato client + conferma server)
- [x] Pulsante segnalazione bug nell'interfaccia
- [x] DeleteModal con anteprima PDF per conferma eliminazione
- [ ] Dashboard admin per gestione utenti, licenze e bug report

### Fase 1c — Desktop app (Tauri v2)

- [ ] Setup Tauri + Next.js build statica
- [ ] PyInstaller: bundle FastAPI in eseguibile
- [ ] Sidecar: avvio FastAPI locale all'avvio
- [ ] SQLite locale per dati offline
- [ ] Salvataggio file su file system dell'utente
- [ ] Installer per Windows (primario), macOS/Linux (secondario)

### Fase 2 — Web app (Next.js su cloud)

- [ ] Deploy FastAPI su Railway/Render/Fly.io
- [ ] Deploy Next.js su Vercel
- [ ] PostgreSQL cloud
- [ ] Upload file su S3 (o equivalente)
- [ ] Stessa UI, backend remoto invece di locale

### Fase 3 — Cloud sync

- [ ] Sync bidirezionale SQLite → PostgreSQL (UUID + timestamp)
- [ ] Risoluzione conflitti (lock ottimistico)
- [ ] Modalità offline/online seamless

### Fase 4 — Mobile app (React Native)

- [ ] Setup React Native (Expo bare workflow)
- [ ] Logica React condivisa (API client, hooks auth, utility PDF)
- [ ] UI nativa: schermate con View/Text/TouchableOpacity
- [ ] Viewer PDF.js via WebView
- [ ] SSO Google login
- [ ] Store deployment (Google Play / Apple)

## Strategia di testing

- **Ogni funzione atomica** deve avere il suo test prima di essere considerata completa
- I test sono eseguiti con **pytest** (backend Python) e **vitest** (frontend React)
- Prima di passare da una fase all'altra, **tutti i test devono essere eseguiti e passare**
- Se un test fallisce, la fase non è completa
- **Ordering**: il BRIEF definisce l'ordine di sviluppo. L'agente segue la roadmap senza saltare o riordinare feature

### Best practices di sviluppo

- **Migration rule**: ogni volta che si crea o modifica un modello SQLAlchemy, generare migration Alembic con `alembic revision --autogenerate -m "descrizione"`. Committare la migration insieme al modello, prima dei test

### Bug noti e soluzioni tecniche

#### 1. Override `dependency_overrides` in test

Quando FastAPI ha un wrapper `deps.py` che fa `yield from _get_db()`, la dipendenza registrata nei route è `deps.get_db`, **non** `core.database.get_db`. Il `yield from` è una chiamata Python diretta, FastAPI non la intercetta.

❌ **Sbagliato** — override su `core.database.get_db`:

```python
app.dependency_overrides[get_db] = override_get_db  # non funziona!
```

✅ **Corretto** — override su `deps.get_db`:

```python
from app.api.deps import get_db as deps_get_db
app.dependency_overrides[deps_get_db] = override_get_db  # funziona!
```

#### 2. Isolamento DB nei test su Windows

SQLite in-memory su Windows ha un comportamento particolare: ogni connessione crea un DB separato con `sqlite://`. Per test isolati, usare **file temporanei unici** (`tmp_path` di pytest + `uuid`) invece che `sqlite://` o `StaticPool`.

## Licensing (futuro — architettura preparata ora)

Non è previsto un sistema di abbonamento nella prima versione, ma l'architettura dei modelli e del middleware è progettata per supportarlo senza migrazioni future.

### Tier previsti

| Tier         | Dispositivi per tipo          | Descrizione                                 |
| ------------ | ----------------------------- | ------------------------------------------- |
| **free**     | 0 desktop, 0 mobile, 1 web    | Solo web, funzionalità base                 |
| **premium**  | 1 desktop, 1 mobile, 3 web    | Tutte le funzionalità, pagamento ricorrente |
| **lifetime** | 5 desktop, 5 mobile, 10 web   | Accesso perpetuo, assegnato manualmente     |
| **admin**    | 99 desktop, 99 mobile, 99 web | Nessun limite. Solo per il proprietario.    |

### Come si gestisce

- **Admin**: solo il proprietario tramite dashboard dedicata
- **Lifetime**: assegnato manualmente via dashboard (es. beta tester, amici, collaboratori)
- **Premium**: gestito tramite integrazione pagamenti (Stripe/Lemon Squeezy) — futura
- **Free**: tier predefinito per nuovi utenti

### Modelli dati (creati in Fase 1a)

```python
class User(Base):
    license_tier: str  # "free" | "premium" | "lifetime" | "admin"
    # Default in fase di sviluppo: "admin"

class LicenseFeature(Base):
    tier: str
    feature: str
    enabled: bool
```

### Funzionalità bloccabili per tier

| Funzionalità          | free              | premium | lifetime | admin |
| --------------------- | ----------------- | ------- | -------- | ----- |
| Visualizzazione PDF   | ✅                | ✅      | ✅       | ✅    |
| Upload PDF            | ❌ (web limitato) | ✅      | ✅       | ✅    |
| Merge/split           | ❌                | ✅      | ✅       | ✅    |
| Modifica testo        | ❌                | ✅      | ✅       | ✅    |
| Conversione DOCX/XLSX | ❌                | ✅      | ✅       | ✅    |
| Modifica metadati     | ❌                | ✅      | ✅       | ✅    |
| Export PNG/JPG        | ❌                | ✅      | ✅       | ✅    |
| Cloud sync            | ❌                | ✅      | ✅       | ✅    |
| SSO Google            | ✅                | ✅      | ✅       | ✅    |

## Bug reporting (futuro)

Gli utenti potranno segnalare bug tramite un pulsante nell'app. Il report includerà:

| Campo            | Descrizione                                                                                                            |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Utente**       | ID utente autenticato (se loggato)                                                                                     |
| **Piattaforma**  | web, desktop, mobile                                                                                                   |
| **Versione app** | Numero versione (es. 1.2.3)                                                                                            |
| **System info**  | OS, browser (web), modello (mobile)                                                                                    |
| **Descrizione**  | Testo libero: "cosa stavi facendo quando è successo?"                                                                  |
| **Timestamp**    | Data/ora del report                                                                                                    |
| **Conteggio**    | Quanti utenti diversi hanno riportato lo stesso bug (tramite deduplica sul testo descrizione o su un ID bug opzionale) |

Il backend salverà i report in una tabella `bug_reports` accessibile solo dall'admin tramite dashboard.

### Modello dati bug report (creato in Fase 1a)

```python
class BugReport(Base):
    user_id: UUID (nullable — anche utenti non loggati)
    platform: str       # "web", "desktop", "mobile"
    app_version: str
    os_info: str
    description: text
    created_at: datetime
```

## Strategia di sicurezza (trasversale, obbligatoria in ogni fase)

Ogni funzione/feature implementata **deve** includere i seguenti controlli di sicurezza. Non sono opzionali né rimandabili.

### Sicurezza upload file

| Controllo                   | Descrizione                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| **Magic bytes**             | Validare il reale contenuto del file (non fidarsi del MIME dichiarato né dell'estensione)   |
| **Sanificazione nome file** | Salvare i file con UUID + estensione originale. Mai usare il nome utente come path          |
| **Limite dimensione**       | Bloccare file > 50MB a ogni livello (client + server)                                       |
| **Struttura PDF sicura**    | Analizzare il PDF con PyMuPDF per rilevare bombe (oggetti eccessivi, compressione infinita) |
| **Timeout processing**      | Ogni operazione su PDF deve avere un timeout massimo (30s default)                          |

### Sicurezza API

| Controllo              | Descrizione                                                           |
| ---------------------- | --------------------------------------------------------------------- |
| **Validazione input**  | Pydantic schema per ogni endpoint. Mai fidarsi dei parametri raw      |
| **Rate limiting**      | Proteggere endpoint sensibili (upload, auth) con rate limit           |
| **Autenticazione JWT** | Token scadenza breve + refresh token. Password con hash bcrypt/argon2 |
| **Path traversal**     | Bloccare nomi file che contengono `../`, `..\\`, o path assoluti      |
| **Content-Type**       | Forzare `Content-Type: application/json` su tutte le risposte API     |

### Sicurezza frontend

| Controllo                 | Descrizione                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------------- |
| **CSP headers**           | Content Security Policy per prevenire XSS                                                                |
| **Sanitizzazione output** | Non fidarsi del contenuto PDF per il rendering (PDF.js è safe, ma attenzione ai metadati mostrati in UI) |
| **Dipendencies**          | Mantenere librerie aggiornate (Dependabot su GitHub)                                                     |

### Sicurezza desktop (Tauri v2)

| Controllo           | Descrizione                                                            |
| ------------------- | ---------------------------------------------------------------------- |
| **Sidecar isolato** | FastAPI eseguito con permessi ridotti, accesso limitato al file system |
| **Timeout RPC**     | Ogni chiamata al sidecar ha timeout massimo                            |
| **No eval**         | Mai eseguire codice dinamico derivato da input utente                  |

### Checklist di sicurezza per ogni commit

Prima di considerare completata una funzione, verificare:

- [ ] I file caricati superano i controlli magic bytes?
- [ ] I nomi file sono sanitizzati con UUID?
- [ ] C'è un timeout su operazioni lunghe?
- [ ] L'input è validato con Pydantic schema?
- [ ] I test coprono anche i casi edge di sicurezza (file malformati, path traversal)?

## Librerie chiave

| Libreria             | Scopo                                     | Licenza                        |
| -------------------- | ----------------------------------------- | ------------------------------ |
| **PDF.js** (Mozilla) | Viewer lato client                        | Apache 2.0                     |
| **PyMuPDF** (fitz)   | Modifica testo, estrazione, manipolazione | AGPL (⚡ progetto open source) |
| **pdf-lib**          | Merge/split/riordino (anche lato client)  | MIT                            |
| **python-docx**      | PDF ↔ DOCX                                | MIT                            |
| **openpyxl**         | PDF ↔ XLSX                                | MIT                            |
| **Pillow**           | PDF ↔ immagini                            | Historical                     |
| **Authlib**          | SSO Google/Apple/Samsung                  | BSD                            |
| **SQLAlchemy**       | ORM Python                                | MIT                            |

## Vincoli

- I file uplodabili devono essere massimo 50MB
- Desktop app leggera (installer < 100MB, app < 50MB)
- Funzionamento offline (desktop + mobile) come modalità primaria
- Deve essere responsive e funzionare su dispositivi mobili
- Supporto SSO: Google (primario), Apple/Samsung (futuro)
- Compatibile con Chrome, Firefox, Safari, Edge
- Solo librerie open source o gratuite
- Cloud save **opzionale** (offline-first)
- **UUID** come chiavi primarie (fondamentale per sync futuro)
- **app router** di Next.js (con `output: 'export'` per compatibilità Tauri)

## Output atteso per fase

| Fase | Output                                            | Collaudo        |
| ---- | ------------------------------------------------- | --------------- |
| 1a   | FastAPI funzionante con SQLite + test passanti    | `pytest` OK     |
| 1b   | Next.js che chiama FastAPI locale + test passanti | `vitest` OK     |
| 1c   | Tauri app con FastAPI sidecar, installer Windows  | Collaudo utente |
| 2    | Next.js + FastAPI su cloud                        | Collaudo utente |
| 3    | Sync offline↔cloud funzionante                    | Collaudo utente |
| 4    | React Native su store                             | Collaudo utente |

## Output atteso

- Prototipo Fase 0 ✅ completato
- Backend FastAPI con API REST per tutte le operazioni PDF
- Frontend Next.js + TailwindCSS per browser (PWA)
- App desktop Tauri v2 (Windows, macOS, Linux)
- App mobile React Native (iOS, Android)
- Cloud sync opzionale con PostgresSQL + S3
