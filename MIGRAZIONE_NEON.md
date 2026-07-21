# Guida alla migrazione: Render PostgreSQL → Neon

> **Data:** 2026-07-21
> **Obiettivo:** Sostituire PostgreSQL su Render (free tier in chiusura) con Neon (free tier permanente) senza perdita di dati.

---

## Panoramica

| Passo | Azione                                             | Tempo |
| ----- | -------------------------------------------------- | ----- |
| 1     | Scaricare il backup da Render Dashboard            | 2 min |
| 2     | Creare il progetto su Neon e abilitare pooler      | 5 min |
| 3     | Importare i dati su Neon (via web)                 | 5 min |
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

## Passo 1 — Scaricare il backup da Render

1. Vai su [Render Dashboard](https://dashboard.render.com) e fai login
2. Nella lista dei servizi, clicca su **pdeditor-postgres**
3. Nel menu a sinistra, clicca su **Backups**
4. Dovresti vedere una lista di backup automatici con data/ora
5. Clicca sul pulsante **Download** accanto al backup più recente
   - Render scaricherà un file `.dump` (es. `pgdump-20260721-120000.dump`)
6. Salva il file in una cartella che ricordi (es. `Download/pdeditor-backup.dump`)

> ⚠️ **Se non vedi backup disponibili:** Render free tier faceva backup automatici ma potrebbero non essere presenti. In quel caso, la migrazione è comunque possibile — vedi **Passo 1b** sotto.

### Passo 1b — Solo se non ci sono backup disponibili

Se Render non ha backup, puoi connetterti direttamente per esportare i dati via **Neon Console Import**. Neon ha un import wizard che accetta connessione diretta a Render. Ti servirà la **connection string** di Render:

1. Vai su Render Dashboard → **pdeditor-postgres** → **Info** → **Connections**
2. Copia la **Connection String** (sarà tipo `postgresql://user:password@host:5432/dbname`)
3. Prosegui al Passo 2b (Neon Import via connection string)

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

### 3a — Usando il backup .dump scaricato da Render

Neon ha un import wizard web che carica direttamente il file `.dump`:

1. Vai su [console.neon.tech](https://console.neon.tech)
2. Apri il progetto **pdfeditor**
3. Nel menu a sinistra, clicca su **Import**
4. Seleziona **Upload a file**
5. Scegli il file `.dump` scaricato da Render
6. Clicca **Import**
7. Neon elabora il file — ci vogliono 1-2 minuti
8. **Fatto!** I dati sono ora su Neon.

### 3b — Solo se hai usato la connection string (Passo 1b)

1. Vai su [console.neon.tech](https://console.neon.tech) → progetto **pdfeditor**
2. Menu a sinistra → **Import**
3. Seleziona **Connect to source database**
4. Incolla la connection string di Render
5. Clicca **Import**
6. Neon si connette direttamente a Render, esporta e importa tutto in automatico

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
