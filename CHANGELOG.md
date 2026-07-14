# Changelog

## 2026-07-14

- ✅ **Bug B1: Duplicate HTTPException in auth.py** — Rimosso dead code in `update_me()` (PR #288, issue #287)
- ✅ **Bug B2: \_cleanup_all_pdf_handles non funzionante** — Rimossi `_open_pdf_handles` (mai popolato) e relativa funzione (PR #290, issue #289)
- ✅ **Bug B3: PDF protetto senza cache restituiva bytes cifrati** — Ora lancia ValueError con messaggio chiaro (PR #292, issue #291)
- ✅ **Bug B4: Header duplicati in uploadPdf()** — Rimosso `headers: this.getHeaders()` da uploadPdf() (PR #294, issue #293)
- ✅ **Bug B5: handleDelete non chiamava api.deletePdf** — Centralizzata logica delete in page.tsx (PR #296, issue #295)
- ✅ **Bug B6: SECRET_KEY vuoto — token forgeable** — Validazione all'avvio in main.py (PR #298, issue #297)
- ✅ **Bug B7: \_run_migrations chiamato 2 volte** — Rimosso create_all duplicato in lifespan (PR #300, issue #299)
- ✅ **ADR audit** — Aggiunta sezione con 21 bug trovati nel codice + 10 miglioramenti
- ✅ **21 bug-audit plans** — Creati `.specs/plans/bug-audit-*.md` per ogni bug

## 2026-07-13

- ✅ **Bug fix: cookie cross-origin login** — `api.ts` ora passa `credentials: 'include'`, `samesite='none'` in produzione (PR #261, issue #260)
- ✅ **CI/CD: 256 test verdi** — Fix `DEBUG=True` in conftest + CSRF test con httpx fresh client
- ✅ **Forgot-password: 404 se email non trovata** — Messaggio chiaro invece di 202 generico
- ✅ **Email: SMTP → SendGrid HTTP API** — Render blocca porta 587, ora usa API HTTP (PR #263, issue #262)
- ✅ **Test auth riscritti per flusso cookie-based** — Coprono il flusso reale di produzione
- ✅ **Bug report: select categoria** — Aggiunto campo Category (UI, PDF Processing, Auth, ecc.) (PR #265, issue #264)
- ✅ **Dark mode dropdown fix** — CSS globale per option leggibili in dark mode (issue #266)
- ✅ **CI: CodeQL permissions fix** — Aggiunto `permissions: contents: read` al workflow
- ✅ **AGENT_FLOW aggiornato** — Subtask decomposition, CI-first merge, end-of-task validation
- ✅ **ADR aggiornato** — Lezioni apprese post-deploy + regole qualità test

## 2026-07-12

- ✅ **Bug report de-duplication & voting** — Ricerca bug esistenti, voto, report_count (PR #252)
- ✅ **Backend coverage 93%** — csrf 100%, storage 100% (PR #249, #250)
- ✅ **Starlette status constants fix** — Raw integers per compatibilità cross-version (PR #247)
- ✅ **CI/CD pipeline** — test.yml unificato, Node 22, Force Node24, PYTHONPATH fix
- ✅ **Privacy Policy page** — GDPR/CCPA compliant, 10 sezioni (PR #256)
- ✅ **Terms of Service page** — 7 sezioni legali (PR #256)
- ✅ **Cookie Policy page** — 4 sezioni (PR #256)
- ✅ **Landing footer pages** — Status, Docs, Guide, FAQ, API, Roadmap (PR #256)
- ✅ **Landing footer links** — Tutti i link ora puntano a pagine reali (PR #256)
- ✅ **Admin send reset email** — Pulsante nella dashboard admin (PR #237)
- ✅ **User bug report status** — Sezione bug reports nel profilo (PR #235)
- ✅ **ADR aggiornato** — Coverage, test counts, feature completate
- ✅ **pdf_service.py refactor** — Estratto PdfMergeSplitService (PR #241)
- ✅ **api.ts refactor** — Tipi in api-types.ts (PR #244)
- ✅ **Sidebar UX error feedback** — Messaggio errore su loadFiles fallito (PR #245)
- ✅ **Password strength validation on reset** — Aggiunta validazione password in reset_password() (PR #218)
- ✅ **usePdfJs hook extract** — Rimosso codice duplicato PDF.js in Split/Reorder/Remove dialogs (PR #220)
- ✅ **License seed extract** — Dati seed condivisi tra main.py e conftest.py (PR #222)
- ✅ **Password strength** — Validazione backend (PR #208)
- ✅ **Header injection** — Sanitize Content-Disposition (PR #208)
- ✅ **Frontend tests Phase 1** — Sidebar, Toolbar, PdfViewer tests (131 total, 40% coverage)
- ✅ **Code Review #1** — Password strength su reset password (PR #218)
- ✅ **Code Review #2** — License features seed duplicato rimosso (PR #222)
- ✅ **Code Review #3** — PDF.js loading duplicato → usePdfJs hook (PR #220)
- ✅ **Code Review #4** — ADR slim 50% + CHANGELOG.md creato (PR #224)
- ✅ **Code Review #5** — pdf_service.py split → PdfMergeSplitService (PR #241)
- ✅ **Code Review #6** — api.ts types → api-types.ts (PR #244)
- ✅ **Code Review #7** — Sidebar error feedback UX (PR #245)

## 2026-07-11

- ✅ **CSRF protection middleware** — Protezione CSRF con cookie token (PR #214)
- ✅ **JWT httpOnly cookie** — Eliminata vulnerabilità XSS localStorage (PR #216)
- ✅ **Graceful shutdown** — Cleanup PyMuPDF handles su SIGTERM (PR #212)
- ✅ **Large file upload progress bar** — Progress indicator in Sidebar (PR #206)
- ✅ **Admin bug report display** — Colonne platform, app_version, os_info (PR #204)
- ✅ **Backend coverage** — 92% (225 test, 0 failures) (PR #202)
- ✅ **Warning suppression** — 0 warnings nei test
- ✅ **Librerie aggiornate** — fastapi 0.139.0, slowapi 0.1.10

## 2026-07-10

- ✅ **Fix 3 test falliti** — google_oauth + migration PermissionError (PR #200)
- ✅ **User dashboard** — Pagina `/app/profile` (PR #198)
- ✅ **Admin license restrictions** — Protezione licenze pagate (PR #196)
- ✅ **Metadata pre-populate** — Campi pre-popolati in MetadataDialog (PR #194)
- ✅ **PDF sidebar refresh** — Nuovo PDF visibile senza F5 (PR #192)
- ✅ **Login infinite loading** — Fix loading state (PR #190)
- ✅ **Google OAuth account linking** — Collegamento account Google

## 2026-07-09

- ✅ **Security audit** — DEBUG=False, SECRET_KEY richiesto, health check, rate limiting
- ✅ **Dependency bumps** — PyJWT 2.13.0, python-multipart 0.0.31, pytest 9.0.3
- ✅ **CodeQL fix** — Path traversal protection in storage.py

## 2026-07-08

- ✅ **Render deploy** — Backend + frontend + PostgreSQL su Render
- ✅ **S3 storage** — Cloudflare R2 per persistenza PDF
- ✅ **Render MCP server** — Setup per automazione deploy

## 2026-07-02 — Completamenti vari

- ✅ **ReplaceTextDialog** — Find & replace UI
- ✅ **PdfThumbnail** — Componente fallback per anteprime
- ✅ **Dashboard admin filtri** — Filtri per licenza, data, email
- ✅ **MAX_SNAPSHOTS configurabile** — Da `.env`

## 2026-06-25 — 2026-07-01 (Prima fase)

- ✅ Auth UI (login/register)
- ✅ Dark mode persistente
- ✅ License enforcement backend
- ✅ Bug report model + UI
- ✅ Merge/Split/Reorder/Remove dialogs
- ✅ DeleteModal con anteprima
- ✅ Admin dashboard
- ✅ Auth endpoint PDF (user_id protection)
- ✅ next-intl migration
- ✅ PDF password protection
- ✅ Undo/Redo snapshots
- ✅ MAX_UPLOAD_SIZE_MB e MAX_PAGE_COUNT enforce
- ✅ Test coverage frontend reporting
- ✅ Google SSO
- ✅ Reset password con token
- ✅ Super admin protection
