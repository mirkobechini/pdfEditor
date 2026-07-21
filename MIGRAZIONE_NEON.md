# Guida alla migrazione: Render PostgreSQL → Neon

> **Data:** 2026-07-21
> **Obiettivo:** Sostituire PostgreSQL su Render (free tier in chiusura) con Neon (free tier permanente) senza perdita di dati.

---

## Panoramica

| Passo | Azione                                             | Tempo |
| ----- | -------------------------------------------------- | ----- |
| 1     | Ottenere la connection string di Render PostgreSQL | 2 min |
| 2     | Creare il progetto su Neon e abilitare pooler      | 5 min |
| 3     | Importare i dati in Neon via Import Wizard         | 5 min |
| 4     | Aggiornare Render con la connection string di Neon | 5 min |
| 5     | Verificare il funzionamento                        | 5 min |
| 6     | Pulizia: eliminare il vecchio database Render      | 2 min |

**Totale:** ~25 minuti — **nessun tool da installare**

---

## Prerequisiti

- Accesso al dashboard di [Render](https://dashboard.render.com)
- Accesso a [Neon Console](https://console.neon.tech) (ti registri con GitHub)
- Le credenziali R2 di Cloudflare già pronte (nel `.env` le hai già)
- **Niente da installare** — tutto via web

---

## Passo 1 — Ottenere la connection string di Render

> ⚠️ **Render free tier non genera backup esportabili.** L'unico modo per migrare i dati è usare l'Import Wizard di Neon con connessione diretta.

1. Vai su [Render Dashboard](https://dashboard.render.com) e fai login
2. Nella lista dei servizi, clicca su **pdeditor-postgres**
3. Nel menu a sinistra, clicca su **Info**
4. Nella sezione **Connections**, clicca su **Show secret** accanto a **External Database URL**
5. Copia la stringa che appare (sarà simile a):
   ```
   postgresql://pdfeditor_postgres_user:password@dpg-xxx.frankfurt-postgres.render.com/pdfeditor_postgres
   ```
6. Tienila da parte — servirà al Passo 3

---

## Passo 2 — Creare il progetto su Neon

1. Vai su [console.neon.tech](https://console.neon.tech) e registrati con GitHub
2. Clicca **Create a project**
   - **Name:** `pdfeditor`
   - **Region:** **Frankfurt (eu-central-1)**
   - **Plan:** **Free**
3. Dopo la creazione, ti viene mostrata la **connection string**. Copiala SUBITO in un posto sicuro (es. password manager):

   ```
   postgresql://alex:AbC123@ep-cool-pond-123456.eu-central-1.aws.neon.tech/pdfeditor?sslmode=require
   ```

   > ⚠️ **La password viene mostrata UNA SOLA VOLTA.** Se la perdi, dovrai resettarla.

### 2b — Abilitare il connection pooling (opzionale ma raccomandato)

1. Nel progetto Neon, vai su **Settings → Connection pooling**
2. Attiva **PgBouncer**
3. Prendi nota della connection string **con pooler** (ha `-pooler.` nell'host):

   ```
   postgresql://alex:AbC123@ep-cool-pond-123456-pooler.eu-central-1.aws.neon.tech/pdfeditor?sslmode=require
   ```

---

## Passo 3 — Importare i dati in Neon

### 3a — Connessione diretta a Render (raccomandata)

1. Vai su [console.neon.tech](https://console.neon.tech) → progetto **pdfeditor**
2. Nella dashboard, clicca su **Import data**
3. Seleziona **Connect to source database**
4. Incolla la connection string di Render (copiata al Passo 1)
5. Clicca **Import**
6. Neon si connette direttamente a Render, esporta e importa tutto in automatico
7. I dati vengono importati in una branch separata chiamata `import-<data>`

### 3b — Impostare la branch import come default

Dopo l'import, i dati sono in una branch `import-...`, non in `production`. Per usarli:

1. Vai su **Branches** nel menu a sinistra
2. Trova la riga della branch `import-2026-07-21...`
3. Clicca sui tre puntini (⋮) alla fine della riga
4. Seleziona **Set as default** (oppure **Rename** → rinominala in `production`)
5. In alternativa: clicca sulla branch `import-...`, vai su **Overview**, premi **Connect** e usa direttamente quella connection string su Render

### 3c — Verifica import

1. In Neon Console, vai su **Tables** (menu a sinistra)
2. Dovresti vedere le tabelle: `users`, `pdf_documents`, `bug_reports`, `license_features`, ecc.
3. Clicca su ogni tabella per vedere le righe importate — i numeri devono corrispondere a quelli di Render

---

## Passo 4 — Aggiornare Render con la nuova connection string

1. Vai su [Render Dashboard](https://dashboard.render.com)
2. Seleziona il servizio **pdeditor-backend**
3. Vai su **Environment → Environment Variables**
4. **Modifica** `DATABASE_URL`:
   - Sostituisci il vecchio valore con la connection string di Neon
   - **Usa quella con il pooler** (contiene `-pooler.` nell'host)
5. Se non esistono già, **aggiungi** le variabili R2 (se già presenti, controlla siano corrette):

   | Variabile         | Valore                                                              |
   | ----------------- | ------------------------------------------------------------------- |
   | `STORAGE_BACKEND` | `s3`                                                                |
   | `S3_BUCKET`       | `pdfeditor-prod`                                                    |
   | `S3_ENDPOINT`     | `https://cf00be0ce4bc2522e36418f2137a0efa.r2.cloudflarestorage.com` |
   | `S3_ACCESS_KEY`   | _(dal tuo .env)_                                                    |
   | `S3_SECRET_KEY`   | _(dal tuo .env)_                                                    |
   | `S3_REGION`       | `auto`                                                              |

6. Salva le modifiche — Render **riavvia automaticamente** il servizio

---

## Passo 5 — Verificare il funzionamento

### 5a — Health check

Apri il browser e vai su:

```
https://pdeditor-backend.onrender.com/health
```

Risposta attesa:

```json
{ "status": "ok", "database": "connected" }
```

### 5b — Login test

Apri il frontend (il tuo dominio Cloudflare), fai login con le tue credenziali.

### 5c — Verifica PDF

Controlla che i tuoi PDF siano ancora tutti presenti nella sidebar.

### 5d — Upload test

Carica un nuovo PDF, verifica che venga salvato e sia scaricabile.

---

## Passo 6 — Pulizia (dopo verifica)

> ⚠️ **Fai questi passaggi solo DOPO aver verificato che Neon funziona perfettamente.**

### 6a — Rimuovere il vecchio database Render

1. Vai su Render Dashboard → **pdeditor-postgres**
2. Clicca su **Settings → Delete Service**
3. Inserisci il nome del servizio e conferma

### 6b — Eliminare il servizio PostgreSQL da render.yaml

Il file è già stato aggiornato — nessuna azione necessaria.

---

## Troubleshooting

### ❌ "sslmode=require" — Neon richiede SSL

Neon richiede connessioni SSL. Se il backend non riesce a connettersi, verifica che `sslmode=require` sia nella connection string.

### ❌ Connection pool esaurito

Se vedi errori `too many connections`, usa la connection string **con pooler** (PgBouncer). Il pooler limita a ~10 connessioni simultanee, che è più che sufficiente per questo progetto.

### ❌ Database sospeso per inattività

Neon sospende il database dopo 5 minuti di inattività. Al primo accesso, la connessione impiega ~1-2 secondi per riattivarsi. Questo è normale e non è un errore.

### ❌ I PDF non si vedono dopo la migrazione

Verifica che `STORAGE_BACKEND=s3` sia impostato su Render. I PDF non sono mai stati nel database PostgreSQL — sono su Cloudflare R2 (già configurato).

---

## Riferimenti

- [Neon docs: Import data](https://neon.tech/docs/import/import-from-postgres)
- [Neon docs: Connection pooling](https://neon.tech/docs/connect/connection-pooling)
- [Render docs: PostgreSQL](https://render.com/docs/postgresql)
- [Cloudflare R2 dashboard](https://dash.cloudflare.com/?to=/:account/r2)
