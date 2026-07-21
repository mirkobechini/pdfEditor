# Guida alla migrazione: Render PostgreSQL → Neon

> **Data:** 2026-07-21
> **Obiettivo:** Sostituire PostgreSQL su Render (free tier in chiusura) con Neon (free tier permanente) senza perdita di dati.

---

## Panoramica

| Passo | Azione | Tempo stimato |
|---|---|---|
| 1 | Creare account Neon e progetto | 5 min |
| 2 | Esportare i dati da Render PostgreSQL | 10 min |
| 3 | Importare i dati in Neon | 5 min |
| 4 | Configurare Render con la nuova connection string | 5 min |
| 5 | Verificare il funzionamento | 5 min |
| 6 | Bonus: attivare Storage R2 se non già fatto | 2 min |

**Totale:** ~30 minuti

---

## Prerequisiti

- Accesso al dashboard di [Render](https://dashboard.render.com)
- `pg_dump` e `psql` installati in locale (Windows: via [PostgreSQL installer](https://www.postgresql.org/download/windows/) o `choco install postgresql`)
- Oppure in alternativa: usare **PgAdmin** (GUI) per export/import
- Le credenziali R2 di Cloudflare già pronte (nel `.env` le hai già)

---

## Passo 1 — Creare il progetto su Neon

1. Vai su [neon.tech](https://neon.tech) e registrati (GitHub account)
2. Crea un **nuovo progetto**:
   - **Name:** `pdfeditor`
   - **Region:** **Frankfurt** (eu-central-1) — *deve essere la stessa regione di Render per latenza minima*
   - **Plan:** Free
3. Dopo la creazione, ti viene mostrata la **connection string**. Copiala subito, sarà simile a:

   ```
   postgresql://alex:AbC123@ep-cool-pond-123456.eu-central-1.aws.neon.tech/pdfeditor?sslmode=require
   ```

   > ⚠️ **Salva questa stringa in un posto sicuro** (es. password manager). La password viene mostrata **una sola volta**.

4. Vai su **Settings → Connection pooling** e abilita **PgBouncer** (pooler built-in). La connection string con pooling sarà:

   ```
   postgresql://alex:AbC123@ep-cool-pond-123456-pooler.eu-central-1.aws.neon.tech/pdfeditor?sslmode=require
   ```

   > **Nota:** Il pooler è raccomandato per production perché gestisce meglio le connessioni multiple (Render ha più worker).

---

## Passo 2 — Esportare i dati da Render PostgreSQL

### Opzione A: via terminale (raccomandata)

```bash
# 1. Ottieni la connection string dal dashboard Render:
#    Vai su Render Dashboard → pdeditor-postgres → Info → Connection String
#    Sarà qualcosa come:
#    postgresql://user:password@host:5432/dbname

# 2. Esporta il database con pg_dump (solo dati, no schema)
pg_dump --no-owner --no-acl --data-only \
  "postgresql://user:password@host:5432/dbname" \
  > render_dump_data.sql

# 3. Esporta lo schema separatamente (per verifica)
pg_dump --no-owner --no-acl --schema-only \
  "postgresql://user:password@host:5432/dbname" \
  > render_dump_schema.sql
```

### Opzione B: via PgAdmin (GUI)

1. Apri PgAdmin
2. Connettiti al server Render PostgreSQL
3. Tasto destro sul database → **Backup...**
4. Format: **Plain**
5. Sezione **Dump Options → Data**: Only **Data**
6. Salva il file

### Opzione C: via Render Dashboard (backup一键)

1. Vai su Render Dashboard → pdeditor-postgres
2. Vai su **Backups**
3. Fai clic su **Download Latest Backup** (se disponibile)
4. Scarica il file `.dump`

---

## Passo 3 — Importare i dati in Neon

### 3a — Prima di tutto: creare lo schema su Neon

Prima di importare i dati, lo schema deve esistere su Neon. Usa Alembic (già configurato nel progetto):

```bash
# Assicurati di avere le variabili d'ambiente corrette
# Imposta DATABASE_URL con la connection string di Neon (quella col pooler)
export DATABASE_URL="postgresql://alex:AbC123@ep-cool-pond-123456-pooler.eu-central-1.aws.neon.tech/pdfeditor?sslmode=require"

# Esegui le migrazioni su Neon
cd backend
alembic upgrade head
```

Se Alembic non è configurato per puntare a Neon, imposta temporaneamente in `.env`:

```dotenv
# .env (temporaneamente per la migrazione)
DATABASE_URL=postgresql://alex:AbC123@ep-cool-pond-123456-pooler.eu-central-1.aws.neon.tech/pdfeditor?sslmode=require
```

### 3b — Importare i dati

```bash
# Con lo schema già creato, importa i dati
psql \
  "postgresql://alex:AbC123@ep-cool-pond-123456-pooler.eu-central-1.aws.neon.tech/pdfeditor?sslmode=require" \
  < render_dump_data.sql
```

### 3c — Verifica import

```bash
# Connettiti a Neon e conta le righe
psql \
  "postgresql://alex:AbC123@ep-cool-pond-123456-pooler.eu-central-1.aws.neon.tech/pdfeditor?sslmode=require"

# Poi in psql:
\dt
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM pdf_documents;
SELECT COUNT(*) FROM license_features;
\q
```

I numeri devono corrispondere a quelli di Render.

---

## Passo 4 — Aggiornare Render con la nuova connection string

1. Vai su [Render Dashboard](https://dashboard.render.com)
2. Seleziona il servizio **pdeditor-backend**
3. Vai su **Environment → Environment Variables**
4. **Modifica** `DATABASE_URL`:
   - Sostituisci il vecchio valore con la connection string di Neon
   - **Usa quella con il pooler** (contiene `-pooler.` nell'host)
5. Se non esiste già, **aggiungi** le variabili per R2 (se già presenti, controlla siano corrette):

   | Variabile | Valore |
   |---|---|
   | `STORAGE_BACKEND` | `s3` |
   | `S3_BUCKET` | `pdfeditor-prod` |
   | `S3_ENDPOINT` | `https://cf00be0ce4bc2522e36418f2137a0efa.r2.cloudflarestorage.com` |
   | `S3_ACCESS_KEY` | *(dal tuo .env)* |
   | `S3_SECRET_KEY` | *(dal tuo .env)* |
   | `S3_REGION` | `auto` |

6. Salva le modifiche — Render **riavvia automaticamente** il servizio.

---

## Passo 5 — Verificare il funzionamento

### 5a — Health check

```bash
curl https://pdeditor-backend.onrender.com/health
```

Risposta attesa:
```json
{"status": "ok", "database": "connected"}
```

### 5b — Login test

```bash
curl -X POST https://pdeditor-backend.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "tua@email.com", "password": "tua_password"}'
```

### 5c — Verifica PDF

Apri il frontend, fai il login, controlla che i tuoi PDF siano ancora tutti presenti.

### 5d — Upload test

Carica un nuovo PDF, verifica che venga salvato e sia scaricabile.

---

## Passo 6 — Pulizia (dopo verifica)

### 6a — Rimuovere il vecchio database Render

> ⚠️ Fai solo dopo aver verificato che Neon funziona perfettamente.

1. Vai su Render Dashboard → **pdeditor-postgres**
2. Clicca su **Settings → Delete Service**
3. Inserisci il nome del servizio e conferma

### 6b — Aggiornare il file render.yaml (opzionale)

Il file `render.yaml` è già stato aggiornato in questo commit — il servizio PostgreSQL è stato rimosso e `DATABASE_URL` è ora marcato come `sync: false` (da impostare manualmente).

---

## Troubleshooting

### ❌ "sslmode=require" — Neon richiede SSL

Neon richiede connessioni SSL. Se il backend non riesce a connettersi, verifica che `sslmode=require` sia nella connection string.

### ❌ Connection pool esaurito

Se vedi errori `too many connections`, usa la connection string **con pooler** (PgBouncer). Il pooler limita a ~10 connessioni simultanee, che è più che sufficiente per questo progetto.

### ❌ Database sospeso per inattività

Neon sospende il database dopo 5 minuti di inattività. Al primo accesso, la connessione impiega ~1-2 secondi per riattivarsi. Questo è normale e non è un errore.

### ❌ `pg_dump` non trovato su Windows

Installa PostgreSQL via:
```bash
# Con Chocolatey
choco install postgresql

# Oppure scarica da: https://www.postgresql.org/download/windows/
```

### ❌ I PDF non si vedono dopo la migrazione

Verifica che `STORAGE_BACKEND=s3` sia impostato su Render. I PDF non sono mai stati nel database PostgreSQL — sono su Cloudflare R2 (già configurato). Se il backend leggeva da disco locale, i PDF potrebbero essere andati persi. Controlla nella sezione **Storage** del dashboard Render se c'era storage persistente.

---

## Riferimenti

- [Neon docs: Import data](https://neon.tech/docs/import/import-from-postgres)
- [Neon docs: Connection pooling](https://neon.tech/docs/connect/connection-pooling)
- [Render docs: PostgreSQL](https://render.com/docs/postgresql)
- [Cloudflare R2 dashboard](https://dash.cloudflare.com/?to=/:account/r2)