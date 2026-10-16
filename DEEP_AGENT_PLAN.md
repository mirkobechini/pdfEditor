## Problema/Obiettivo (Mirko 05/10 — piano esteso 15/10)
Integrare un **Deep Agent** eseguibile dentro l'app desktop PdfEditor, con **RAG**, **chat UI**, **MCP server / REST API**, **multi-provider** e **tools sulle funzionalità dell'app**. Motore riusato da **pdfmind** (che doveva essere il deep agent di questo progetto).

## Requisiti chiave
- **Offline**: funziona SENZA connessione usando un agente locale (**Ollama** o **llama.cpp** o altro runtime LLM locale).
- **Online**: con le **key dell'utente** su Claude / OpenAI / OpenRouter / Hugging Face (le inserisce Mirko nel wizard/settings, salvate in locale, mai sul cloud).
- **Config**: sia nello **step del wizard** (setup iniziale) sia nelle **Impostazioni/Settings** (modificabile): provider, modello, key, workspace, RAG on/off, tutto il Deep Agent.
- **RAG**: retrieval tra i documenti con memoria; sorgente primaria = **workspace**, + indicizzazione anche dei **PDF aperti singolarmente**. Vector store = **Chroma** (locale, persistito).
- **Chat UI**: pallino flottante **sotto** l'area fast actions (stile chatbot web), pannello chat, streaming, task list visibili. Grafica da rifinire.
- **Tools esposti all'agente**: split, merge, sign, annotate/highlight, OCR, compress, convert DOCX→PDF, export, share, print, rename, delete — chiamano le API reali dell'app.
- **REST API pubblica (prima) + MCP server (dopo)** consumabile da altri sistemi; "skills" documentate.
- **Passo futuro**: interazione **vocale** (dopo che sarà perfettamente funzionante).

## Dove vive
Nel repo **pdfEditor (monorepo)**, dentro `backend/`. pdfmind resta standalone come riferimento: il codice si porta/riusa dentro pdfEditor.

## Micro-tranche (tutte su UNICO branch feature/932-deep-agent, UNICA PR a fine feature — decisione Mirko 15/10: non PR per tranche, ma verifica incrementale)
- **T0a — Copiare motore pdfmind in `backend/` (agents/, tools/, server/mind.py); import funzionanti, inattivo.** ✅ COMPLETATA 2026-10-15: motore in `backend/app/deep_agent/` (agents/pdfmind.py + tools/docs,workspace,profile,dev + server/mind.py non montato), import adattati a `app.deep_agent.*`, deps aggiunte a `backend/requirements.txt` (deepagents, langchain-ollama, langchain-openai, pypdf), test `tests/test_deep_agent_t0a.py` **9/9 verdi** (import, build agent senza LLM, profilo user senza tool dev, profilo dev con tool dev, path guard scrivi_output, docs tool su testo). `main.py` non monta rotte mind (motore inattivo).
- **T0b — Rotta `/mind` separata nel backend pdfEditor (router dedicato, non in UI).** ✅ COMPLETATA 2026-10-15: creato `backend/app/api/v1/mind.py` (router `/mind` con `/health`, `/config`, `/chat` SSE, `/approve`), montato in `main.py` (`from app.api.v1.mind import router as mind_router` + `app.include_router(mind_router)`). Profilo forzato a `user` in questa fase. Verificato via TestClient: `/mind/health` 200, `/mind/config` 200, metodi errati 405, chat senza `goal` 422. Test `tests/test_deep_agent_t0b.py` **4/4 verdi**.
- **T0c — Sicurezza profili: solo `user`, nessun tool dev esposto.** ✅ COMPLETATA 2026-10-15: `/mind/chat` rifiuta (400) qualsiasi profilo ≠ `user` (`_ALLOWED_PROFILES = {"user"}`), con fallback mai-dev; tool dev (git, log, API, issue) assenti per costruzione dalla tool list user. Test `tests/test_deep_agent_t0c.py` **4/4 verdi** (dev→400, sconosciuto→400, default user senza chiamate LLM, tool list user senza tool dev).
- **T1a — Estendere `_resolve_model` per Claude + OpenRouter.** ✅ COMPLETATA 2026-10-15: aggiunti prefissi `anthropic:` (ChatAnthropic, env `PDFMIND_ANTHROPIC_API_KEY`/`_BASE_URL`) e `openrouter:` (ChatOpenAI su `https://openrouter.ai/api/v1`, env `PDFMIND_OPENROUTER_API_KEY`), mantenendo `ollama:`/`openai:`; esposto `SUPPORTED_PREFIXES`. Test `tests/test_deep_agent_t1a.py` **7/7 verdi** (resolver per provider, key configurata, fallback stringa non nota).
- **T1b — Aggiungere OpenAI + Hugging Face al resolver; test con key utente.** ✅ COMPLETATA 2026-10-15: aggiunto prefisso `huggingface:` (HF Inference OpenAI-compatible → ChatOpenAI su `https://api-inference.huggingface.co/v1`, env `PDFMIND_HF_API_KEY`/`_BASE_URL`); OpenAI già coperto da `openai:`. Provider supportati completi: ollama, anthropic, openai, openrouter, huggingface. Test `tests/test_deep_agent_t1b.py` **4/4 verdi** (HF→ChatOpenAI, base_url default, openai con key, tutti i prefissi).
- **T2a — Ingest + chunking PDF della workspace (senza vector store).** ✅ COMPLETATA 2026-10-15: creato `backend/app/deep_agent/rag/indexer.py` — estrazione testo (PyMuPDF/pypdf o txt/md), chunking per dimensione con overlap, `ingest_workspace` (sola root), `save_index`→`.mind_index/chunks.json`, `load_index`. Mai tocca i file originali. Test `tests/test_deep_agent_t2a.py` **8/8 verdi** (chunking short/long/empty, extract txt, ingest file source/index, ingest+save+load preserva originali, dir mancante, index mancante).
- **T2b — Chroma: embeddings + vector store persistito + retrieval con citazioni.** ✅ COMPLETATA 2026-10-15: creato `backend/app/deep_agent/rag/store.py` — `index_chunks` (upsert per id `source#index`, metadati source/page/index), `search(k)` con ritorno di source+page+score come citazioni, `count`, persist su `.mind_chroma/` (locale, offline-first; embedding Chroma default all-MiniLM-L6-v2). Deps: + `chromadb`. Test `tests/test_deep_agent_t2b.py` **4/4 verdi** (index+count, search con citazioni, query ritrova il doc giusto, metadati).
- **T3a — Config backend: provider/modello/key/workspace/RAG (API + persistenza locale).** ✅ COMPLETATA 2026-10-15: creato `backend/app/deep_agent/config.py` (store JSON locale in app data dir, chiavi mai sul cloud, `public()` senza chiavi, `env_for()` mappa provider→env), endpoint `GET/PUT /mind/config` nel router. Test `tests/test_deep_agent_t3a.py` **6/6 verdi** (public mai chiavi, save preserva default, load default, env_for, GET/PUT via HTTP).
- **T3b — UI config: step nel wizard + sezione Impostazioni.** ✅ COMPLETATA 2026-10-15 (frontend desktop): in `useSettingsPage` aggiunta sezione `deep_agent` + stato `mindConfig` (lazy load via `getMindConfig`) e handler (`setMindConfigField`, `setMindConfigApiKey`, `saveMindConfig`, `mindConfigError`); in `SettingsTabs` nuovo tab Deep Agent (provider, modello, workspace, RAG toggle, chiave API, salva); in `shared/src/api.ts` (fonte di verità, NON la copia generata `desktop/frontend/src/shared/`) aggiunti `getMindConfig`/`updateMindConfig` + tipi `MindConfig`/`MindConfigUpdate`; wizard con passo 03 Deep Agent (provider/modello/RAG/chiave) che in `handleFinish` salva la config via `api.updateMindConfig`; chiavi i18n `deepAgent*`/`wizard*` in `messages/it.json`+`en.json`. Typecheck frontend pulito. Le chiavi utente restano locali, mai esposte.
  ⚠️ Appreso: `desktop/frontend/src/shared/` è GENERATO da prebuild da `shared/src/` (commit df1f88a4 lo rimosse dal tracking) — le edit ad api.ts vanno fatte lì, non nella copia.
- **T4a — Chat UI base: pallino sotto fast actions + pannello chat + streaming.** ✅ COMPLETATA 2026-10-15: creato `desktop/frontend/src/components/ChatAssistant.tsx` (pallino flottante 🐵 in basso a destra sotto le fast actions, pannello chat 380×520 con streaming SSE via `POST /mind/chat`, parsing eventi `[TASK]`/`[STEP]`/`[DONE]`, storico, stato "pensando", errori); chiavi i18n namespace `chat` (it/en: title, placeholder, send, close, welcome, error, thinking, task); integrato in `app/app/page.tsx` (`<ChatAssistant apiBase={API_BASE}/>`). Typecheck frontend pulito.
- **T4b — HUD chat: task list visibili + stati + errori.** ✅ COMPLETATA 2026-10-15: in `ChatAssistant.tsx` — task emessi dal motore (`[TASK]`) mostrati in un pannello con **stato visivo** (spinner finché running → ✓ quando done), messaggi d'errore tipizzati per codice (401 → errorAuth, 422 → errorValidation, no body → errorConnection, default → error) con bordo/rossiccio dedicato, messaggi con flag `error`. Chiavi i18n `chat.errorAuth/errorValidation/errorConnection` aggiunte (it/en). Typecheck frontend pulito.
- **T5a** — Tool: split + merge via agent. ✅ COMPLETATA 2026-10-15: creato `backend/app/deep_agent/tools/pdf_ops.py` — tool `split_pdf(pdf_id, mode="every"|"range", ranges)` e `merge_pdfs(pdf_ids)` che avvolgono il servizio reale `PdfMergeSplitService` (apertura `SessionLocal`, risoluzione utente da `PDFMIND_USER_ID` o super-admin, ritorno stringa); connessi al profilo user; validazione mode="range" prima del DB. Test `tests/test_deep_agent_t5a.py` **5/5 verdi**. ⚠️ Promemoria Mirko 15/10: **dopo T6 fare BUILD LOCALE + checklist "cosa provare"** (vedi Passi futuri).
- **T5b** — Tool: sign + annotate/highlight. ✅ COMPLETATA 2026-10-15: aggiunti a `tools/pdf_ops.py` — `sign_pdf(pdf_id, signature_image_b64, page_number, x, y, width, height)` e `annotate_pdf(pdf_id, annotation_type, rect, page_number, color, content)` che avvolgono `PdfService` (che compone il mixin di mutate — la classe giusta è `PdfService`, NON `PdfServiceMutate` che non esiste come entry point); validazioni in testa (base64, pagina, dimensioni, tipo, rect); connessi al profilo user. Test `tests/test_deep_agent_t5b.py` **7/7 verdi**.
- **T5c** — Tool: OCR + compress + convert DOCX→PDF. ✅ COMPLETATA 2026-10-15: aggiunti a `tools/pdf_ops.py` — `ocr_pdf(pdf_id, language)` (avvolge `PdfService.ocr_pdf`, gestisce already_searchable), `compress_pdf(pdf_id, quality, overwrite)` (`PdfMergeSplitService.compress`), `convert_docx_to_pdf(filename, content_b64)` (`PdfService.import_file_to_pdf`); validazioni in testa; connessi al profilo user (insieme a split/merge/sign/annotate = famiglia tool app completa). Test `tests/test_deep_agent_t5c.py` **7/7 verdi**.
- **T6** — REST API pubblica documentata (/mind/*, OpenAPI). ✅ COMPLETATA 2026-10-15: `mind.py` — ogni rotta con `summary`/`description` OpenAPI (health, config GET/PUT, chat, approve); aggiunta **`GET /mind/skills`** che elenca i tool dell'agente (per consumatori esterni) e le capabilities (chat streaming/task/HITL, config, RAG); router con `responses` 401. Test `tests/test_deep_agent_t6.py` **3/3 verdi** (skills elenca strumenti, schema con tutte le rotte + summary, schema valido).
- **T7** — MCP server.
- **T8** — Rifinitura grafica chat.
- **T9a (16/10) — FIX workspace fantasma: colonna `default_save_folder` nel modello + repo + API + test.** ✅ COMPLETATA 2026-10-16: il mistero dei "file che non so da dove vengano" era il fallback: `UserPreference` NON aveva la colonna `default_save_folder` (quindi il valore selezionato nelle Impostazioni veniva scartato) e `resolve_workspace` cascava su una **cartella letterale `"workspace"`** relativa al CWD del backend. Aggiunta colonna `default_save_folder` (String(512), default "") al modello, gestione in `PreferenceRepository.upsert` (nuovo + update), esposta in `GET/PUT /settings` (PreferenceResponse/PreferenceUpdateRequest), aggiunta a `Preferences` in `shared/src/types.ts` + fallback in `shared/src/api.ts`. Test `tests/test_deep_agent_workspace_fix_oct16.py` **5/9** (repo persist + update, GET/PUT settings). Regressioni verdi (t0a/t2a/t2b/fix_oct15/migration).
- **T9b (16/10) — FIX workspace fantasma: elimina fallback fittizio + tool rispondono "workspace non configurata".** ✅ COMPLETATA 2026-10-16: `resolve_workspace()` ritorna **stringa vuota** (non più `"workspace"`) se env/config/prefs non risolvono; `tools/workspace.py` (elenca/leggi/scrivi_output) rispondono "workspace non configurata" quando root è None; `tools/docs.py` _resolve e `rag/indexer.py` gestiscono root vuota (niente CWD). Test **4/9** aggiuntivi (resolve vuoto, env override, pref usata, tool unconfigured/configured). Regressioni verdi. Typecheck TS pulito, shared-sync OK.

Regola: **prima di passare alla tranche successiva si verifica che tutte le precedenti funzionino** (test + esito osservabile + merge verde).

## Passi futuri
- **Dopo T6 → BUILD LOCALE + checklist test manuale (richiesto Mirko 15/10)**: ✅ BUILD DI ANTEPRIMA FATTA 16/10 (run 38908435071, installer da artifact preview/932-build). 🔴 Feedback test Mirko 16/10 — nuove tranche/evoluzioni da implementare (vedi sezione "Feedback test 16/10" sotto).
- Voce (ascolta/risponde).
- Subagent paralleli; deploy online cloud provider.

## Feedback test Mirko 16/10 (su build anteprima #932) — da implementare
Esito prova + richieste (esplicite e idee). Vanno come nuove micro-tranche su feature/932-deep-agent.

### ✅ Confermato funzionante
- Workspace: messaggio "workspace non configurata" ok; dopo aver configurato la cartella l'agente vede i file. (T-A/T-B a posto)
- RAG sembra funzionare (cita i documenti).

### 🔧 Bug/bache da correggere
1. **Startup page "resta bloccata tutto verde"** (fix richiesto subito, fatto 16/10): lo step database era "finto" (timer 400ms senza verifica) e il redirect dipendeva da `refreshSession()` che poteva non risolvere → pagina verde ma mai navigava. Fix in `desktop/frontend/src/app/startup/page.tsx`: step DB non più finto (coincide con readiness backend, il backend migra il DB prima di servire /health) + timeout di sicurezza (4s) sul redirect che naviga comunque. Typecheck pulito. 🔨 Committato e milestone: verificare da Mirko con build successiva.
2. **Chat "sto pensando..." poi nulla senza feedback** (test: non c'erano né Ollama acceso né modello configurato): quando non è configurato un provider/modello funzionante, la chat deve mostrare UN ERRORE esplicito (es. "provider/modello non configurato") invece di "sto pensando" e sparire. Vedi anche punto 7 (feedback tool).
3. **Select modello**: oggi il campo modello è un input finché non si apre il select; deve essere SEMPRE una select (disabilitata finché non si sceglie il provider, poi popolata coi modelli reali del provider — /mind/models con chiave, già esiste). Inoltre: selezionando un provider base dovrebbe **aggiungerlo alla lista provider per le precedenze** (punto 7 /multi-provider): quando scegli il provider lo aggiungi alla lista ordinata.
   - Verificare che il provider scelto esista in locale (es. Ollama: modello scaricato? endpoint raggiungibile?) o comunque far scegliere all'utente.
4. **Merge fallisce con "problema con il PDFMIND_USER_ID"**: il tool merge (pdf_ops) risolve l'utente da `PDFMIND_USER_ID` o super-admin `admin@pdfeditor.local`; nel contesto desktop con utente loggato diverso fallisce. Serve usare l'utente autenticato della sessione (non env/super-admin) per risolvere l'utente nei tool app (split/merge/sign/...). 🔴 Da fixare.

### ✨ Idee/evoluzioni (da valutare con Mirko, non ancora ordinate)
5. **Workspace non configurata → l'agente può chiederla lui**: se non c'è workspace potrebbe proporre all'utente di configurarla (messaggio con azione/guida) invece di solo "workspace non configurata".
6. **Focus sull'input al click del pallino**: appena si apre la chat, il focus va sulla riga di input.
7. **Feedback durante "sto pensando" + attività strumenti**: se il modello è lento sembra bloccato; quando usa strumenti (es. merge) deve far capire cosa sta facendo (nome tool, stato) — HUD task/step più ricco, dossier per tool in esecuzione. Il merge ha mostrato "sto pensando..." e poi nulla: serve feedback di esito (riuscito/errore) SEMPRE.
8. **Ridimensionamento chat col mouse**: possibilità di ingrandire il riquadro chat (drag resize).
9. **Cronologia/carrello chat**: chiudo il pallino e riapro → vedo i messaggi vecchi? (valutare persistenza locale storia).
10. **Sessioni tipo ChatGPT/Gemini**: sistema di sessioni conversazionali separate (da valutare con Mirko: sì/no, priorità).

Decisione sui punti 5-10: da chiedere a Mirko (priorità e sì/no), poi ordinarle come tranche. Punti 2/3/4 sicuri da fare; 1 già fatto.


## Accept
1. Agent parte offline (Ollama/llama.cpp) e online (almeno 1 provider cloud) con la workspace scelta.
2. Config in wizard + settings, con le key dell'utente salvate in locale.
3. RAG risponde citando i documenti (workspace + PDF aperti).
4. Chat UI con pallino flottante, streaming e task list.
5. Tools (split/sign/annotate/OCR/...) eseguibili via agent sulle API dell'app.
6. MCP server raggiungibile da un client esterno.
7. Nessun break delle feature esistenti; test verdi.

## Aggiornamenti advance
(da compilare man mano che completi tranche)

### 🔧 Bug aggiuntivi segnalati da Mirko il 16/10 (test build 7ea09b1f) — FIX fatto
- **Wizard non arriva allo step 3 (Deep Agent)**: il bottone mostrava "Finish" già allo step 2 (condizione `currentStep < 1` invece di `currentStep < steps.length - 1`) → lo step Deep Agent era irraggiungibile. FIX: `desktop/frontend/src/app/wizard/page.tsx` — "Continue" finché non si è sull'ultimo step; contatore progressi `total` corretto da 2 a `steps.length`. Typecheck pulito.
- **Auto-login su /login**: comportamento atteso (ripristino sessione/remember-me), non un bug. Da confermare con Mirko se vuole disabilitarlo.
