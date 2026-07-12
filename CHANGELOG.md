# Changelog

## 2026-07-12

- ✅ **Password strength validation on reset** — Aggiunta validazione password in reset_password() (PR #218)
- ✅ **usePdfJs hook extract** — Rimosso codice duplicato PDF.js in Split/Reorder/Remove dialogs (PR #220)
- ✅ **License seed extract** — Dati seed condivisi tra main.py e conftest.py (PR #222)
- ✅ **Password strength** — Validazione backend (PR #208)
- ✅ **Header injection** — Sanitize Content-Disposition (PR #208)
- ✅ **Frontend tests Phase 1** — Sidebar, Toolbar, PdfViewer tests (131 total, 40% coverage)

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
