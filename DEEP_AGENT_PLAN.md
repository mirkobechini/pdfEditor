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
- **T1b** — Aggiungere OpenAI + Hugging Face al resolver; test con key utente.
- **T2a** — Ingest + chunking PDF della workspace (senza vector store).
- **T2b** — Chroma: embeddings + vector store persistito + retrieval con citazioni.
- **T3a** — Config backend: provider/modello/key/workspace/RAG (API + persistenza locale).
- **T3b** — UI config: step nel wizard + sezione Impostazioni.
- **T4a** — Chat UI base: pallino sotto fast actions + pannello chat + streaming.
- **T4b** — HUD chat: task list visibili + stati + errori.
- **T5a** — Tool: split + merge via agent.
- **T5b** — Tool: sign + annotate/highlight.
- **T5c** — Tool: OCR + compress + convert DOCX→PDF.
- **T6** — REST API pubblica documentata (/mind/*, OpenAPI).
- **T7** — MCP server.
- **T8** — Rifinitura grafica chat.

Regola: **prima di passare alla tranche successiva si verifica che tutte le precedenti funzionino** (test + esito osservabile + merge verde).

## Passi futuri
- Voce (ascolta/risponde).
- Subagent paralleli; deploy online cloud provider.

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
