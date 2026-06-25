# Reflections — Week 1

## Il codice fa quello che ho chiesto?

**Parzialmente** — il backend è sostanzialmente completo, il frontend ha delle lacune rispetto alla roadmap.

### Backend (Fase 1a) — ✅ Per lo più sì

Tutte le API richieste dal brief sono state implementate: upload/download con validazione magic bytes, merge/split con PyMuPDF, riordino e rimozione pagine, modifica testo (replace + extract), modifica metadati, conversione PDF ↔ DOCX/XLSX/PNG/JPG/TXT/SVG, autenticazione JWT, SSO Google, modelli licensing e bug reporting.

**Problemi critici:**

1. **❌ Zero enforcement licenze** — Il backend ha endpoint `/licenses/features` che _elenca_ le feature per tier, ma **nessun middleware/blocco** impedisce a un utente free di chiamare merge, split, export, ecc. È un guscio vuoto.
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
| Dark mode toggle                               | ✅ (ma **non persiste** — manca localStorage)                                                    |
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
4. **Modello BugReport divergente** — Il modello implementato (`title`, `description`, `page_url`, `status`) è diverso dal brief (`platform`, `app_version`, `os_info`, sistema di deduplica). Manca: `platform`, `app_version`, `os_info`. In più ha: `title`, `page_url`, `status`.
5. **Enforcement licenze non specificato** — Il brief descrive tabelle e tier ma non dice esplicitamente "blocca le operazioni non consentite". Chi implementa può pensare basti esporre le feature via API.
6. **GOOGLE_CLIENT_ID vuoto in dev** — Non è chiaro se in sviluppo il SSO Google debba funzionare o sia accettabile che fallisca senza configurazione.

## Cosa ho imparato sul briefing?

**Un brief efficace deve specificare non solo cosa fare, ma anche cosa significa "fatto".** Ogni feature dovrebbe avere criteri di accettazione precisi: quali endpoint sono protetti, dove avviene l'elaborazione (client/server), modello dati esatto campo per campo, e se il licensing include solo la struttura o anche l'enforcement.

## Prossimo passo

Prima di procedere, risolveremo questi punti nell'ordine:

1. **Aggiungere il pulsante di segnalazione bug nel frontend** — previsto dalla roadmap Fase 1b, API backend già pronta ✅
2. **Aggiungere UI di autenticazione (login/register)** — i metodi API ci sono, mancano i componenti
3. **Persistenza dark mode (localStorage)** — fix piccolo, alto impatto UX
4. **Implementare l'enforcement licenze** — middleware/dependency che blocchi operazioni non consentite per tier
5. **Allineare modello BugReport al brief** (campi `platform`, `app_version`, `os_info`)
6. **Aggiungere dashboard admin** (gestione utenti, licenze, bug report)
7. **Sostituire I18nProvider custom con next-intl** (già installato)
8. **Decidere se merge/split deve avvenire lato client o server** — attualmente fanno entrambi la stessa cosa in modo indipendente
