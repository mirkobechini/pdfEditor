# Frontend Components Reference

## Struttura componenti

```
src/app/
├── layout.tsx              # Root layout (Next.js)
├── page.tsx                # Home page
├── globals.css             # Stili globali (TailwindCSS)
├── ClientLayout.tsx        # Client layout con providers
├── components/
│   ├── AppLayout.tsx       # Layout principale app
│   ├── Sidebar.tsx         # Sidebar con elenco PDF
│   ├── Toolbar.tsx         # Toolbar azioni PDF
│   ├── PdfViewer.tsx       # Viewer PDF (PDF.js)
│   ├── HeaderControls.tsx  # Header (auth, dark mode, lingua)
│   │
│   ├── MergeDialog.tsx     # Dialog merge PDF
│   ├── SplitDialog.tsx     # Dialog split PDF
│   ├── ReorderDialog.tsx   # Dialog riordino pagine
│   ├── RemoveDialog.tsx    # Dialog rimozione pagine
│   ├── DeleteModal.tsx     # Modale conferma eliminazione
│   ├── BugReportDialog.tsx # Dialog invio bug report
│   ├── GoogleLoginButton.tsx # Login con Google OAuth
│   │
│   └── *.test.tsx          # Test per ogni componente
├── lib/
│   └── api.ts              # ApiClient class
├── login/
│   └── page.tsx            # Pagina login
├── register/
│   └── page.tsx            # Pagina registrazione
├── admin/
│   ├── page.tsx            # Pannello admin
│   └── AdminPage.test.tsx
├── forgot-password/
│   └── page.tsx            # Password reset request
└── reset-password/
    └── page.tsx            # Password reset form
```

## Dipendenze frontend

| Pacchetto           | Versione | Ruolo                  |
| ------------------- | -------- | ---------------------- |
| next                | 16.2     | Framework React        |
| react               | 19.2     | UI library             |
| tailwindcss         | 4        | Utility CSS            |
| pdf-lib             | 1.17     | (client-side, minore)  |
| @react-oauth/google | 0.13     | Google OAuth           |
| next-intl           | 4.13     | Internazionalizzazione |

## PDF.js

- Versione: **3.11.174** da CDN
- Caricato dinamicamente con `<script>` (non npm)
- Worker: `pdf.worker.min.js` stesso CDN
- Canvas: scaling con `devicePixelRatio` per Retina

## Temi

- Dark mode gestita con classe `dark` su `<html>`
- TailwindCSS varianti `dark:` per styling condizionale
- Internazionalizzazione con `next-intl` (en, it)
