# Lessons Learned

> **Scopo:** Documentare le lezioni apprese durante lo sviluppo, problemi architetturali emersi, e regole per evitare che si ripetano.
> **Aggiornato:** 2026-09-28

---

## bash `set -u` + array vuoto: due crash distinti nello stesso script di release, uno per piattaforma

> **Lezione appresa (2026-09-28), durante il rilascio di v0.1.39:**

`desktop/build-sidecar.sh` (`set -euo pipefail`) è passato pulito in locale per mesi, poi ha rotto **la release CI su tutte e 3 le piattaforme** in due tentativi successivi, con due bug distinti della stessa famiglia:

1. `for cand in "$TESSERACT_CMD" ...` — referenziare una variabile d'ambiente non settata sotto `set -u` termina lo script immediatamente (`unbound variable`). In locale funzionava perché lo sviluppatore aveva `TESSERACT_CMD` nell'ambiente; su GitHub Actions no.
2. Risolto il primo, è emerso il secondo: `"${BUNDLE_ARGS[@]}"` con l'array vuoto (quando tesseract non è trovato) crasha **solo su bash 3.2** (il default di macOS, mai aggiornato da Apple per motivi di licenza — bash 4.4+ lo gestisce senza problemi). Lo stesso identico codice passava su Linux/Windows (bash più recente) e in locale su qualunque bash moderno.

**Regola:** con `set -u`, ogni riferimento a una variabile che POTREBBE essere vuota/non settata (env var opzionali, array costruiti condizionalmente) va protetto esplicitamente: `"${VAR:-}"` per le stringhe, `"${ARR[@]+"${ARR[@]}"}"` per gli array (idioma portabile, funziona anche su bash 3.2). Testare uno script di release con `set -u` **solo** sulla shell locale non basta — serve testarlo (o quantomeno leggerlo con questo pattern in mente) per ogni piattaforma target, specialmente macOS che resta bloccato su una bash di 15+ anni fa.

## Render "Auto-Deploy After CI Checks Pass" legge la Statuses API classica, non la Checks API di GitHub Actions

> **Lezione appresa (2026-09-28):**

Il frontend web (`pdeditor-frontend` su Render) non si è ridistribuito automaticamente per **9 giorni**, nonostante decine di merge su `main` tutti con CI verde. Nessun errore visibile, nessun evento di deploy loggato — semplicemente silenzio totale, il che ha reso il problema difficile da notare finché non è stato chiesto esplicitamente di verificare la landing page.

**Causa:** l'opzione "Auto-Deploy: After CI Checks Pass" di Render legge la **Commit Status API classica** di GitHub (`GET /commits/{sha}/status`), non la **Checks API** più recente che GitHub Actions popola nativamente. Verificato direttamente: `gh api repos/.../commits/<sha>/status` restituiva `{"state":"pending","statuses":[],"total_count":0}` su un commit con 13/13 check verdi secondo la Checks API. Render aspettava un segnale che i workflow nativi non avrebbero mai prodotto.

**Fix tentato:** un workflow (`render-status.yml`) che dopo ogni push su `main` interroga la Checks API e ripubblica il risultato come status classico. **Non ha risolto da solo** — sembra che Render valuti il gate solo al momento del webhook di push iniziale, senza ri-controllare quando lo status arriva pochi minuti dopo da un workflow separato. La correzione definitiva raccomandata è disattivare "After CI Checks Pass" e usare l'auto-deploy diretto su push, dato che la branch protection di GitHub già garantisce che solo codice con CI verde arrivi su `main` — rendendo il gate di Render ridondante e, in pratica, rotto silenziosamente.

**Regola:** un'integrazione tra due sistemi (CI + piattaforma di deploy) che si basa su un nome di feature generico ("aspetta la CI") va verificata leggendo la documentazione tecnica di **entrambi i lati** (quale API esatta legge/scrive ciascuno), non assumendo che "CI checks" significhi la stessa cosa ovunque. Un gate che fallisce silenziosamente (nessun errore, nessun evento) è il caso peggiore — vale la pena controllare periodicamente che un meccanismo di deploy automatico stia *davvero* deployando, non solo che sia configurato.

---

## React Native: PanResponder e componenti che "dimenticano" lo stato tra un gesto e l'altro

> **Lezione appresa (2026-09-27), durante il testing dal vivo di firma/annotazioni mobile su device reale:**

Costruendo `PositionSelectorNative` (riquadro trascinabile/ridimensionabile sopra l'anteprima di una pagina PDF), tre bug distinti sono nati dalla stessa causa: **un valore letto da una closure creata una volta sola, invece che da un ref sempre aggiornato.**

- `PanResponder.create({...})` va chiuso in un `useRef(...).current` per avere un riferimento stabile tra i render (altrimenti si ricrea l'handler di gesto ad ogni render, rompendo il gesto in corso). Ma questo significa che **tutte le callback al suo interno (`onPanResponderGrant`, `onPanResponderMove`, ecc.) restano congelate ai valori del render in cui sono state create** — leggere `boxPos`/`boxSizePx` (stato React) direttamente in quelle callback dava sempre il valore del PRIMO render, non quello attuale.
- Il bug è stato risolto per posizione/dimensione con dei ref (`boxPosRef`, `boxSizePxRef`) aggiornati in parallelo allo stato tramite funzioni wrapper (`setBoxPos`, che aggiorna sia il ref che lo state). Il fix però è stato applicato solo parzialmente la prima volta — la larghezza "zoomata" (`renderWidth`, derivata da `previewWidth * zoom`) è rimasta una variabile chiusa nella stessa closure congelata, e il limite di trascinamento a destra restava quindi bloccato al valore pre-zoom.
- **Regola:** in qualunque `PanResponder`/gestore di gesti creato una volta con `useRef`, **ogni singolo valore che le sue callback leggono deve venire da un ref**, non da una variabile di stato o da un valore derivato nel corpo del componente — anche se "sembra" già coperto da un fix precedente sullo stesso componente. Il modo più sicuro è fare una checklist esplicita di tutte le variabili lette dentro il `PanResponder.create({...})` e verificare che ognuna sia un `.current`.

## `react-native-pdf`: `singlePage` onora `page`/dimensioni solo al mount

> **Lezione appresa (2026-09-27):**

Cambiare la prop `page` di `<Pdf singlePage>` dopo il primo caricamento **non fa cambiare pagina** — la libreria carica la pagina indicata solo al montaggio del componente e ignora aggiornamenti successivi della prop. Lo stesso vale per le dimensioni quando si implementa uno zoom cambiando `style`/`width`/`height`: il rendering interno resta a quello iniziale.

**Fix standard:** dare al componente `<Pdf>` una prop `key` che cambia insieme al valore che deve far ricaricare la pagina (es. `key={`${pageNumber}-${zoom}`}`), forzando React a smontare e rimontare un'istanza fresca invece di aggiornare quella esistente. Costa un breve flash di ricaricamento, accettabile per un'anteprima.

## React Native: scroll 2D annidato richiede dimensioni esplicite, non `flex: 1`

> **Lezione appresa (2026-09-27):**

Per ottenere pan orizzontale+verticale con `ScrollView` (che scorre un solo asse per istanza) serve annidare una `ScrollView horizontal` dentro una verticale. `flex: 1` sui due componenti annidati **non si risolve in modo affidabile**, perché il contenitore di contenuto di una `ScrollView` non ha un'altezza fissa contro cui calcolare il flex — il risultato è un layout che non clippa né scrolla come previsto. La soluzione documentata e affidabile è dare a entrambe le `ScrollView` **dimensioni esplicite** (`width`/`height` numeriche) che rispecchiano rispettivamente il viewport visibile e il contenuto zoomato.

## Uno scroll automatico "durante il trascinamento" ha bisogno sia di un evento sia di un timer

> **Lezione appresa (2026-09-27):**

Implementando l'auto-scroll quando si trascina un elemento vicino al bordo di un'area scrollabile, chiamare la logica di scroll **solo** dentro un `setInterval` indipendente sembrava la soluzione più "pulita" (scroll continuo mentre il dito resta fermo vicino al bordo) — ma durante un gesto attivo e veloce il thread JS è impegnato a processare gli eventi di tocco, e i timer schedulati con `setInterval` possono arrivare in ritardo o non arrivare affatto finché il gesto non si ferma. Il risultato percepito era "lo scroll non funziona più". La soluzione robusta è **usare entrambi**: una chiamata diretta ad ogni evento `onPanResponderMove` (reattiva al movimento reale) più un timer di backup per quando il dito resta fermo vicino al bordo.

## Una feature può essere completa e testata (a livello di codice) e comunque fallire in produzione: verificare sempre la parità degli endpoint deployati

> **Lezione appresa (2026-09-27), testando OCR/annotazioni/condivisione mobile su device reale:**

Le tre feature (già implementate e con test verdi su `dev`) fallivano con `{"detail":"Not Found"}` su un device reale collegato al backend di produzione. Prima di sospettare un bug nel codice mobile, una chiamata `curl` diretta contro l'API di produzione (upload di un PDF di test + chiamata all'endpoint sospetto) ha confermato in pochi minuti che le route **non esistevano affatto** sul branch deployato — `main` era indietro di 165 commit rispetto a `dev`. Nessun bug nel codice: la feature semplicemente non era ancora stata rilasciata.

**Regola:** quando una feature di rete fallisce con un errore che sembra "generico" (404/Not Found senza un messaggio applicativo specifico come "PDF not found"), verificare per prima cosa se l'endpoint esiste davvero sull'ambiente contro cui si sta testando (es. `curl` diretto, o `GET /openapi.json` per elencare tutte le route registrate) — prima di passare ore a debuggare un client che in realtà è corretto.

---

## Sistema di licenze/tier: disattivato di default finché non è progettato bene

> **Decisione (2026-09-26), dopo una mappatura completa del sistema di tier nella codebase:**

Il fallimento CI del punto precedente (test import immagini con tier sbagliato) ha fatto emergere un problema più ampio: il default nel codice (`DISABLE_LICENSE_ENFORCEMENT: bool = False`, cioè enforcement **attivo**) contraddiceva sia il template tracciato `.env.example` (che dice `True`) sia il `.env` locale di sviluppo (anch'esso `True`) — e **né la CI né (probabilmente) la produzione su Render avevano un override**, quindi entrambe giravano con l'enforcement realmente attivo, mentre l'intenzione era che fosse spento ovunque finché il sistema di tier non è progettato in modo compiuto.

**Mappatura trovata (non esaustiva, vedi commit per dettagli):**
- Solo 3 feature (`annotations`, `ocr`, `sign_pdf`) + export/import sono davvero applicate via `check_feature_access`/`verify_feature_access`; altre definite in `license_seed.py` (`merge_pdf`, `split_pdf`, `reorder_pages`, ecc.) SONO applicate ma solo tramite `Depends(verify_feature_access(...))`, un pattern diverso dalla chiamata diretta — facile da perdere in un grep superficiale.
- Il tier `lifetime` è assegnabile da admin ma non ha nessuna feature seedata in `license_seed.py` → un utente lifetime non-admin fallirebbe ogni check.
- Naming incoerente: backend/admin usa `pro`, la landing page marketing usa `premium` per lo stesso piano.
- `BRIEF.md` (documento di design originale) dichiarava esplicitamente che il sistema di abbonamento NON era previsto per la prima versione, solo "architettura preparata" — mai formalizzato come "spento di default" nel codice.

**Decisione presa:** flip del default a `DISABLE_LICENSE_ENFORCEMENT = True` in `backend/app/core/config.py` — enforcement spento ovunque (locale, CI, produzione) finché il sistema di tier non viene ridisegnato con calma. I test che verificano esplicitamente il comportamento di blocco (`test_license_enforcement.py`, `test_annotations.py`, `test_ocr.py`, `test_sign.py`, e ora anche `test_import_jpg_requires_enterprise_tier`) forzano l'enforcement a `False` con `monkeypatch`/`patch.object`, quindi restano validi e continuano a testare il comportamento reale quando serve.

**Da verificare manualmente:** su Render, controllare se la variabile d'ambiente `DISABLE_LICENSE_ENFORCEMENT` è impostata esplicitamente sul servizio backend. Se è assente, il nuovo default (`True`) si applica automaticamente al prossimo deploy. Se è impostata a `False` a mano, va rimossa o cambiata in `True`.

---

## `backend/.env` locale (gitignored) può mascherare fallimenti che solo la CI vede

> **Lezione appresa (2026-09-26, prima vera esecuzione CI del branch `feature/desktop-0139-fixes`):**

Aperta la PR #845 dopo settimane di lavoro su questo branch (62 commit), la suite locale era sempre stata verde. La CI invece ha fallito subito: `test_import_jpg` e `test_import_image_formats` (aggiunti in un commit precedente per GIF/BMP) si aspettavano `201` con un utente tier **pro**, ma `import_images` è una feature **enterprise-only** — `license_seed.py` lo dichiara esplicitamente, e non era mai stato vero il contrario.

**Perché in locale non falliva mai:** `backend/.env` (gitignored, non versionato) contiene `DISABLE_LICENSE_ENFORCEMENT=True` — impostato per comodità di sviluppo. Ogni esecuzione locale di questi test bypassava completamente il controllo tier, mascherando l'assunzione sbagliata nel test. La CI non ha (giustamente) questo file, quindi girava con l'enforcement reale.

**Fix:** aggiunta fixture `enterprise_headers` in `conftest.py`, aggiornati i test per usarla, aggiunto un test negativo che verifica che `pro` riceva davvero 403.

**Regola per il futuro:**
- Prima di aprire una PR/fare un merge dopo un lungo periodo di sviluppo locale, eseguire la suite con le stesse variabili d'ambiente della CI (es. `DISABLE_LICENSE_ENFORCEMENT=False python -m pytest`), non fidarsi solo del verde locale se esiste un `.env` locale con override di sicurezza/feature flag.
- Quando un test usa `pro_headers`/`free_headers`/ecc. per una feature gated, verificare il tier richiesto in `license_seed.py` — non assumerlo dal nome del fixture usato altrove nello stesso file.
- Un branch che accumula molti commit senza mai passare per una vera esecuzione CI (PR aperta solo a lavoro concluso) rischia di scoprire più bug "vecchi" tutti insieme, proprio come qui.

---

## Endpoint pubblici con path dinamico + middleware di sicurezza disabilitato nei test = bug invisibile

> **Lezione appresa (2026-09-26, link di condivisione PDF sempre rotto in produzione):**

`POST /share/{token}/download` restituiva sempre `403 CSRF validation failed` — nessun link di condivisione avrebbe mai funzionato per un visitatore esterno. Eppure 12 test su `test_share.py` passavano tutti, incluso uno che chiamava esattamente quell'endpoint.

**Causa doppia:**
1. `CSRF_EXEMPT_PATHS` è un `set` di stringhe esatte (`request.url.path in CSRF_EXEMPT_PATHS`). Un path con un segmento dinamico come `/share/{token}/download` non può MAI comparire lì dentro come stringa letterale — l'endpoint quindi non è mai stato davvero esente, nonostante fosse pubblico e non richiedesse autenticazione.
2. `conftest.py` disabilita il CSRF globalmente per **tutta** la suite (`DISABLE_CSRF=True`), e solo `test_csrf.py`/`test_csrf_validation.py` lo riattivano esplicitamente per i propri test. `test_share.py` non lo faceva mai, quindi i suoi test verificavano solo la logica di business, non il comportamento reale con la sicurezza attiva.

**Il bug è stato trovato leggendo il codice** (ragionando sul flusso reale: browser anonimo → nessun cookie cross-origin → nessun header CSRF → endpoint non esente → 403), non da un test che falliva o da una build manuale.

**Regola per il futuro:**
- Quando un endpoint pubblico/non autenticato ha un segmento di path dinamico, verificare ESPLICITAMENTE come funziona il meccanismo di esenzione dai middleware di sicurezza (CSRF, rate limit, auth) — un controllo per stringa esatta non copre path parametrici, serve un prefisso o una regex.
- Ogni endpoint pubblico dovrebbe avere almeno un test che gira con il middleware di sicurezza **realmente attivo** (non nel setup di default disabilitato), altrimenti il test verifica solo che la funzione esista, non che sia raggiungibile.
- Prima di deployare/testare manualmente una feature "implementata ma mai verificata in build reale", vale la pena una code review mirata al flusso end-to-end reale (richiesta anonima → middleware → handler), non solo ai singoli file toccati.

---

## `desktop/frontend/src/shared/` è una copia generata — modificarla non serve a nulla

> **Lezione appresa (2026-09-26, dialogo di stampa custom + fix auto-login):**

Ho modificato `desktop/frontend/src/shared/auth.tsx` per aggiungere `refreshSession()`. `npx tsc --noEmit` passava, tutti i test passavano. Poi `npm run build` (dentro `tauri build`) falliva con `Property 'refreshSession' does not exist` — come se le mie modifiche non esistessero.

**Causa:** `desktop/frontend/src/shared/` **non è codice sorgente** — è generata dallo script di prebuild `copy-shared.js`, che copia `shared/src/*.ts(x)` (il vero sorgente condiviso tra desktop/web/mobile) dentro `desktop/frontend/src/shared/` **ad ogni build**, sovrascrivendo qualsiasi modifica locale. `tsc --noEmit` da riga di comando non esegue il prebuild, quindi vedeva la mia copia modificata — ma `npm run build` sì, e la sovrascriveva prima di compilare.

**Regola per il futuro:** prima di modificare un file sotto `desktop/frontend/src/shared/` (o l'equivalente in `frontend/src/shared/`), controllare se esiste un file con lo stesso nome in `shared/src/` — se sì, è quello il sorgente da modificare. Un `grep -rn "copy-shared\|prebuild"` nei `package.json` del progetto conferma rapidamente se un pacchetto ha questo pattern.

---

## Undo/redo con `useRef` non triggera il re-render dei bottoni

> **Lezione appresa (2026-09-24, firma PDF):**

Nel `SignModal` ho implementato undo/redo con due stack (`undoStackRef`/`redoStackRef`) come `useRef`. I bottoni Annulla/Ripeti avevano `disabled={undoStackRef.current.length === 0}`. Dopo `undo()`, lo stack redo veniva popolato ma il bottone **restava disabilitato**.

**Causa:** mutare un `useRef.current` NON triggera un re-render di React. Il bottone leggeva `redoStackRef.current.length` al render iniziale (0) e non veniva mai ri-renderizzato, anche se lo stack ora aveva 1 elemento.

**Soluzione:** aggiunto uno state `historyVersion` (incrementato ogni volta che uno stack cambia) e referenziato nel render (es. `data-history={historyVersion}` sul container). Così React ri-renderizza e i bottoni si aggiornano.

**Regola per il futuro:** quando si usa un `useRef` per dati che influenzano l'UI (es. stack, cache), serve uno state separato (contatore/versione) per forzare il re-render. Un `useRef` mutato non basta — React non lo osserva.

---

## Google OAuth mobile: il redirect URI Android è `com.<package>:/oauthredirect`

> **Lezione appresa (2026-09-15, issue #796):**

Il login Google su mobile (Expo/React Native) falliva con "accesso negato" nonostante il backend fosse corretto e il client Android configurato in Google Cloud Console.

**Causa:** il provider Google di `expo-auth-session` genera il redirect URI di default come:

```
${Application.applicationId}:/oauthredirect
```

Dove `Application.applicationId` è il `android.package` (`com.mirkobechini.pdfeditor`). Quindi il redirect URI esatto è:

```
com.mirkobechini.pdfeditor:/oauthredirect
```

**Nota critica:** ha **un solo slash** (`:/oauthredirect`), NON due (`://`). Google è preciso sul redirect URI — se configuri un URI diverso, rifiuta con "accesso negato".

**Regola per il futuro:** per il Google OAuth su Android con `expo-auth-session`, il redirect URI autorizzato in Google Cloud Console deve essere `<android.package>:/oauthredirect` (un solo slash). Verificare sempre il redirect URI esatto generato dal provider (in `node_modules/expo-auth-session/src/providers/Google.ts`) prima di configurare la console Google.

**Nota:** le impostazioni di Google Cloud Console possono richiedere da 5 minuti a qualche ora per essere applicate.

---

## Security audit: mai salvare credenziali in chiaro né loggarle

> **Lezione appresa (2026-09-12):**

L'analisi di sicurezza ha trovato 2 falle di privacy:

1. **Password PDF in chiaro nel DB** (`password_cache`): le password dei PDF protetti erano salvate in chiaro. Fix: cifrate con **Fernet** (key da SECRET_KEY) in `app/core/password_cipher.py`.
2. **Token loggati in chiaro**: il reset token (email_service) e il Google id_token (auth_service) erano loggati. Fix: rimossi dai log.

**Regola per il futuro:** mai salvare password/token in chiaro nel DB, mai loggarli (nemmeno parzialmente). Se serve una cache di credenziali, cifrarla con la SECRET_KEY. Se serve un log di debug, loggare solo identificatori non sensibili (es. email).

---

## Re-export dal shared: il mock dei test deve colpire il path reale

> **Lezione appresa (2026-09-11):**

Nel refactor unify auth (#761), il web re-exportava `lib/api.ts`/`lib/tauri.ts`/`lib/error-map.ts` dal shared (`src/shared/`). I test web che mockavano `../api` (il vecchio path) **non colpivano più** il shared api, che importa da `./api` (src/shared/api.ts). Risultato: i test fallivano con `null` invece dell'utente atteso.

**Perché è subdolo:** il re-export nasconde il path reale. Il test mocka `lib/api.ts`, ma il shared api usa `src/shared/api.ts`. Il mock non viene applicato.

**Fix:** aggiornare i mock per colpire il path reale del shared (`../../../shared/api` dal test in `src/app/lib/__tests__/`). **Nota:** successivamente `api.ts` web è stato ripristinato all'originale (il re-export rompeva login/register e2e), quindi il web re-exporta solo `tauri.ts`/`error-map.ts`/tipi.

**Regola:** quando si introduce un re-export, verificare che i test mockino il path **reale** del modulo importato, non il path del re-export. Un mock che non colpisce il modulo giusto produce fallimenti confusi (`null` invece dell'utente).

---

## Non forzare il shared auth nel web: modelli auth diversi

> **Lezione appresa (2026-09-11):**

Nel refactor #761 si è tentato di far usare al web il shared `auth.tsx` (desktop-first, con `cloudApi` per login/register). Questo ha **rotto il flusso auth web** (register/login non portavano più a `/app`), perché il web è cookie-based con un solo backend, mentre il desktop usa sidecar + cloud. Dopo 4 fix successivi (copy-shared, i18n, getCloudApiBaseUrl) il flusso restava rotto.

**Fix:** revert del `lib/auth.tsx` web all'originale (cookie-based con `api`). Il web re-exporta solo `tauri.ts`/`error-map.ts` e i tipi dal shared, NON `auth.tsx` e NON `api.ts` (il shared `api.ts` ha auto-refresh 401 e CSRF diverso che rompevano login/register e2e — il web usa la copia originale `lib/api.ts` cookie-based).

**Regola:** l'unificazione ha senso per moduli con logica identica (tauri helpers, error-map). NON forzare l'unificazione di moduli con modelli architetturali diversi (auth web cookie-based vs desktop sidecar+cloud, api client con auto-refresh vs CSRF guard). Il costo in regressioni supera il beneficio del code drift.

---

## Loop su audience vuote non chiama mai la funzione mockata (CI rossa)

> **Lezione appresa (2026-09-09):**

Il PR #756 ha introdotto un loop sulle audience Google per supportare sia il client web che Android. Il loop faceva `if not aud: continue` per saltare le audience vuote. In CI `GOOGLE_CLIENT_ID` è vuoto (non impostato), quindi **tutte** le audience erano vuote → `verify_oauth2_token` non veniva mai chiamato → `info` restava `None` → `ValueError: Invalid or expired Google token`. 6 test fallivano.

**Perché è subdolo:** i test mockano `verify_oauth2_token`, ma il mock non veniva mai invocato perché il loop lo saltava. L'errore non era nel mock né nella logica di validazione, ma nel fatto che la funzione non veniva proprio chiamata.

**Fix:** rimosso lo skip delle audience vuote. Ora `verify_oauth2_token` viene sempre chiamato almeno una volta (con audience vuota il mock lo ignora).

**Regola:** quando si itera su una lista di valori di configurazione (audience, client ID, URL) che possono essere vuoti in alcuni ambienti (CI, test), NON saltare l'iterazione con `continue` se questo impedisce di chiamare la funzione sotto test. Verificare SEMPRE che i test colpiscano davvero la funzione mockata (es. `assert mock.call_count > 0`).

---

## CSRF è ridondante per richieste Bearer-authenticated

> **Lezione appresa (2026-09-06):**

Il cloud upload dava 403 CSRF su mobile e desktop. Causa: il client autenticato via **Bearer token** non inviava `X-CSRF-Token`, e il backend lo rifiutava.

**Perché il CSRF è ridondante con Bearer:** il CSRF protegge dalle richieste che si autenticano **automaticamente via cookie** (il browser li invia da solo). Il Bearer token invece è **esplicito** — deve essere incluso nell'header `Authorization`, e un sito malevolo non può leggerlo. Quindi non c'è nulla da sfruttare.

**Fix:** nel middleware CSRF, se c'è un Bearer token **valido** (verificato con `decode_access_token`) e **nessun cookie CSRF**, esentare la validazione. Il web (cookie-based) resta protetto perché il ramo `if csrf_cookie` si attiva.

**Regola:** per richieste autenticate esclusivamente via Bearer JWT, il CSRF è ridondante e va esentato. Verificare SEMPRE che il Bearer token sia valido prima di esentare.

---

## CI release-desktop timeout inutile quando non ci sono check runs

> **Lezione appresa (2026-09-02):**

La `release-desktop.yml` aspettava 15 minuti anche quando non c'erano check runs per il commit taggato. Causa: `ci-desktop.yml` ha path filter `desktop/**` + `shared/**`, ma sui tag viene pushato solo il commit (spesso con modifiche `.github/workflows/` o doc) — il path filter esclude il commit dalla CI. `wait-for-ci` eseguiva 30 loop da 30s aspettando check runs inesistenti.

**Regola:** se `RESULT` è vuoto (nessun check run), procedere immediatamente. Il loop di attesa serve solo per aspettare CI in corso, non per attendere CI che non partirà mai.

## Keep-warm troppo aggressivo esaurisce le compute hours di Neon

> **Lezione appresa (2026-09-01):**

Il keep-warm (GitHub Actions cron ogni 5min) mantiene Render sveglio ma tiene anche attiva la connessione a Neon. Il free tier di Neon ha 100h/mese di compute: con ping ogni 5min H24, il compute si esaurisce in ~4 giorni. Il cloud sync smette di funzionare silenziosamente.

**Sintomo:** cloud sync mobile/desktop smette di funzionare dopo ~4 giorni dall'inizio del mese (o dall'attivazione del keep-warm).

**Regola:** Il keep-warm deve pingare ogni 14min (threshold sleep Render = 15min). Non serve frequenza maggiore — Render si risveglia in ~2s dalla richiesta dell'utente. Meno ping = meno compute Neon consumato.

---

## \_add_missing_columns generica vs Alembic per il sidecar desktop

> **Lezione appresa (2026-09-01):**

Il sidecar crashava con `no such column: pdf_documents.upload_source` su DB legacy (creato prima che venisse aggiunta la colonna). La `_add_missing_columns()` originale aveva una lista manuale di colonne da aggiungere — mancava `upload_source`.

**Tentativo di soluzione:** aggiungere la colonna manualmente. **Soluzione corretta:** riscrivere `_add_missing_columns()` per auto-rilevare le colonne mancanti confrontando `Base.metadata.sorted_tables` con lo schema reale del DB.

**Perché non Alembic per il sidecar:** Alembic richiede che `alembic.ini` e le versioni siano disponibili a runtime nel bundle PyInstaller (path management complesso in `_MEIPASS`). La funzione generica è sufficiente per SQLite desktop che non richiede rename/drop colonne.

**Regola:** Ogni nuova colonna nel modello SQLAlchemy è gestita automaticamente da `_add_missing_columns()` nel sidecar — nessuna modifica manuale necessaria. Per il cloud (Neon), continuare a usare Alembic come definito in ADR.

---

## Google login desktop: syncUser deve restituire token locale

> **Lezione appresa (2026-09-01):**

Dopo il login Google su desktop, il sidecar crashava con `UNIQUE constraint failed: users.email`. Causa: `auth/sync` faceva upsert solo per ID cloud, ignorando l'utente locale esistente con la stessa email (ID diverso). Inoltre, anche quando `syncUser` funzionava, il risultato veniva ignorato e `api` manteneva il JWT cloud → 401 loop → 500 su `/pdfs`.

**Regola:** `auth/sync` deve fare upsert per email come fallback. Il chiamante deve usare `syncResult.access_token` (JWT locale del sidecar) per `api.setToken()` e `store_jwt`, non il JWT cloud.

---

## Non usare `--runtime-tmpdir` nella build manuale del sidecar

> **Lezione appresa (2026-08-30):**

Ho ricostruito il sidecar manualmente con `pyinstaller --onefile --runtime-tmpdir "."`. Lo script ufficiale `desktop/build-sidecar.ps1` NON usa `--runtime-tmpdir` (default PyInstaller = `%TEMP%`). Conseguenza: a runtime, quando Tauri spawna il sidecar con cwd = `%LOCALAPPDATA%/PdfEditor/`, PyInstaller estraeva i file `_MEI*` **lì** invece che in `%TEMP%`. Dopo 3 avvii si sono accumulate 3 cartelle `_MEI*` da ~126MB ciascuna (~380MB di spazzatura).

**Sintomo:** `%LOCALAPPDATA%/PdfEditor/_MEI*` ripiene, git mostrava `desktop/src-tauri/_MEI350922/` come untracked.

**Regola:** Quando si ricostruisce il sidecar in locale, usare SEMPRE lo script ufficiale `desktop/build-sidecar.ps1` (o il comando PyInstaller identico, **senza** `--runtime-tmpdir`). Mai improvvisare opzioni diverse — PyInstaller ha default sensati per `--onefile`.

**Nota:** `%APPDATA%/PdfEditor/` (DB, secret.key, storage) è distinto da `%LOCALAPPDATA%/PdfEditor/` (exe estratti + temp). Non confonderli durante le pulizie.

---

## JWT_SECRET_KEY deve essere persistente per sidecar desktop

> **Lezione appresa (2026-08-18):**

Il sidecar PyInstaller rigenerava `JWT_SECRET_KEY` casuale a ogni avvio (perché `.env.desktop` non la specificava e `config.py` usava `secrets.token_urlsafe(48)`). Questo invalidava tutti i JWT emessi nella sessione precedente, causando "Invalid or expired token" dopo ogni riavvio.

**Sintomo:** L'upload PDF funzionava, ma dopo aver chiuso e riaperto l'app, tutti i PDF sparivano (il token non era più valido per `getMe` e `listPdfs`).

**Regola:** In un'applicazione desktop con sidecar, la chiave JWT deve essere **persistente su file** (es. `%APPDATA%/PdfEditor/secret.key`), non rigenerata a ogni avvio. La generazione avviene una volta sola, poi viene riletta.

## Sync utente cloud → sidecar deve includere password per login offline

> **Lezione appresa (2026-08-18):**

`POST /auth/sync` creava l'utente in SQLite locale con `hashed_password=""`, quindi il login locale falliva sempre (password vuota non verifica). L'utente doveva rifare login via cloud ogni volta.

**Regola:** Quando si sync un utente dal cloud al sidecar locale, includere la password (plaintext) e hasharla lato sidecar. Così il login offline funziona dopo il primo sync.

## syncUser non deve usare \_fetch (evita loop 401)

> **Lezione appresa (2026-08-18):**

`syncUser` usava `_fetch` che aggiunge l'Authorization header con il JWT corrente. Se il JWT era del cloud (non valido per il sidecar), il sidecar rispondeva 401, `_fetch` tentava refresh (falliva), e `syncUser` ritornava `null` silenziosamente.

**Regola:** Endpoint che non richiedono autenticazione (come `/auth/sync`) devono usare `fetch` diretto, non `_fetch`, per evitare il loop 401 → refresh → fail.

---

## Versioni separate per piattaforma — non usare versione web per release mobile

> **Lezione appresa (2026-08-07):**

Durante la creazione della prima release mobile, è stato usato per errore il tag `v0.1.34-build9` (versione del web/desktop) invece della versione mobile corretta. Il mobile ha la sua versione indipendente in `mobile/package.json` e `mobile/app.json` (expo.version). EAS Build usa `app.json` per l'APK, non `package.json`.

**Regola:** La versione mobile è **indipendente** da web/desktop. Prima di creare un tag per una release mobile:

1. Verificare che `mobile/package.json` e `mobile/app.json` (expo.version) siano allineati
2. Usare uno script di bump che aggiorni entrambi (`scripts/bump-version.js` ora lo fa)
3. Il tag deve riflettere la versione mobile (es. `v0.1.0-mobile`), non quella del web (es. `v0.1.34`)

## pdf-lib non supporta encryption — Fork @cantoo/pdf-lib come alternativa

> **Lezione appresa (2026-08-07):**

`pdf-lib@1.17.1` (ultima versione ufficiale) **non supporta** encryption/decryption dei PDF. Il tipo `PDFDocument` non ha il metodo `encrypt()` né l'opzione `password` in `load()`. Questa funzionalità è assente nell'originale Hopding/pdf-lib.

Il fork **`@cantoo/pdf-lib`** (v2.8.1) aggiunge sia `encrypt(SecurityOptions)` che `load(bytes, { password })`, ma ha una dipendenza da `node-html-better-parser` (Node-only) che potrebbe causare fallimenti di bundle con Metro in React Native.

**Regola:** Prima di implementare password protect/unlock, verificare che `@cantoo/pdf-lib` sia compatibile con React Native (Metro bundler). Se non lo è, cercare un fork alternativo o implementare manualmente la crittografia PDF (RC4/AES con trailer).

**Note:** UI e funzioni già scritte in `pdfService.ts` e `ToolsScreen.tsx` — serve solo attivare la libreria giusta.

---

## Ghost PDF — rimuovere dal DB, non solo dalla UI

> **Lezione appresa (2026-08-03):**

I record orfani nel DB (PDF senza file fisico su disco) non devono essere solo nascosti dalla UI. Se non li cancelli dal DB, al prossimo riavvio la lista `listPdfs` li restituisce di nuovo e il problema si ripresenta.

**Soluzione:** Dopo aver constatato il 404 con HEAD request, chiamare `api.deletePdf(id)` per rimuovere definitivamente il record.

**Regola:** "Rimuovere" dalla lista non basta — bisogna eliminare il record dal database.

---

## Sidecar cleanup — taskkill da solo non basta

> **Lezione appresa (2026-08-01):**

Chiamare `taskkill /F /IM fastapi-sidecar.exe` NON è sufficiente per terminare il sidecar definitivamente. Dopo il kill, Windows può riavviare il processo in assenza di un cleanup completo del process group.

**Soluzione:** Triplice kill: 1) `CommandChild.kill()` via handle Tauri nativo, 2) `taskkill /F /IM fastapi-sidecar*` (wildcard per target triple suffix), 3) `std::process::exit(0)` per uscita immediata del processo senza cleanup Tauri che possa riavviare orfani.

**Regola:** Quando si termina un sidecar Tauri, non affidarsi solo a comandi esterni (taskkill). Usare SEMPRE il `CommandChild` handle restituito da `.spawn()` per kill pulito, combinato con exit forzato.

---

## Tauri IPC senza npm modules — withGlobalTauri

> **Lezione appresa (2026-08-01):**

`tauriInvoke("plugin:opener|open_url")` non funziona in produzione perché il comando IPC non è direttamente accessibile via `__TAURI_INTERNALS__`. La soluzione corretta è abilitare `withGlobalTauri: true` in `tauri.conf.json`, che rende `window.__TAURI__` disponibile con tutti i plugin (opener, dialog, ecc.) senza bisogno di moduli npm.

**Comandi disponibili con withGlobalTauri:**

- `window.__TAURI__.opener.openUrl(url)` — apre URL nel browser di sistema
- `window.__TAURI__.dialog.open(options)` — dialog nativo per file/cartelle

**Regola:** Per qualsiasi API Tauri nel frontend, abilitare `withGlobalTauri: true` e usare `window.__TAURI__.*` invece di importare pacchetti npm che non vengono inclusi nello static export di Next.js.

---

## CORS in produzione Tauri — tauri.localhost vs tauri://localhost

> **Lezione appresa (2026-08-01):**

La webview Tauri in produzione usa `http://tauri.localhost` come origin, NON `https://tauri.localhost` (con 's').
Mancava in `ALLOWED_ORIGINS`, causando CORS error su tutte le fetch. Il dev mode funzionava perché l'origin era `http://localhost:3000`.

**Regola:** Quando si configura CORS per Tauri, aggiungere SEMPRE tutti e tre: `tauri://localhost`, `http://tauri.localhost`, `https://tauri.localhost`.

---

## Quality assurance — i test devono copiare il flusso reale

> **Lezione appresa (2026-07-13):**

4 bug critici sono arrivati in produzione nonostante 256 test passassero. Causa: i test mockavano/bypassavano il comportamento reale invece di testarlo.

**Regole per test futuri:**

1. Il flusso cookie-based deve essere testato con cookie, non con Bearer header
2. CSRF/rate limiting non possono essere semplicemente disabilitati — vanno testati separatamente
3. I mock di librerie esterne (jwt.decode, Google certs) vanno verificati contro il comportamento reale
4. Ogni nuova feature deve includere test che simulano lo scenario di produzione (dominio diverso, cookie cross-origin, ecc.)
5. `TestClient` ha limitazioni intrinseche (stesso-origin) — i test E2E con Playwright sono necessari per la vera validazione cross-origin

---

## Migrazioni infrastrutturali

### 2026-07-21 — Schema DB incompleto dopo migrazione Neon

**Problema:** L'import dei dati da Render PostgreSQL a Neon ha copiato i dati ma non lo schema completo. La colonna `bug_reports.report_count` era definita solo nel modello Python, non in una migrazione Alembic. Su Render funzionava perché il database era stato modificato manualmente. Su Neon, tutte le operazioni che accedevano a `bug_reports` fallivano con `UndefinedColumn`, causando una cascata di errori (Google SSO, upload, admin bug report, ecc.).

**Rimedio:** Creata migrazione Alembic `6b1f5a3e8c9d` per aggiungere `report_count` a `bug_reports`.

**Regola per il futuro:** Ogni colonna nel modello DEVE avere una migrazione Alembic corrispondente. `_add_missing_columns()` in `main.py` è un workaround, non una soluzione — le migrazioni sono l'unico source of truth per lo schema.

---

### 2026-07-21 — Google SSO usava HTTPException raw invece di error_response

**Problema:** Il `google_login()` in `auth.py` usava `HTTPException(status_code=401, detail=str(e))` invece di `error_response(ErrorCode.GOOGLE_AUTH_FAILED, ...)`. Il frontend non trovava un codice mappabile e mostrava `common.unknownError` invece di `auth.googleAuthFailed`.

**Rimedio:** Sostituita raw HTTPException con `error_response()` nel google_login handler (PR #373, issue #372).

**Regola per il futuro:** Ogni endpoint DEVE usare `error_response()` con un codice `ErrorCode` stabile — mai `HTTPException` raw.

---

### 2026-07-21 — Upload cross-origin blocca senza handshake CSRF iniziale

**Problema:** Il middleware `CSRFMiddleware` imposta il cookie `csrf_token` solo dopo una richiesta "safe" (GET/HEAD/OPTIONS). Se l'utente esegue il primo POST (upload) subito dopo il login, la richiesta viene respinta con `403` e il browser la segnala come errore CORS perché gli header sono generati prima del middleware CORS.

**Fix 1 (hotfix #376):** Il cookie `csrf_token` viene ora emesso contestualmente al login/register/google tramite `set_csrf_cookie(response)` in `auth.py`. Il frontend non necessita più di una GET preliminare — il primo POST dopo login funziona immediatamente.

**Fix 2 (hotfix #381):** Il `csrf_token` viene ora restituito anche nel **body della risposta** di login/register/google (campo `csrf_token` in `TokenResponse`). Il frontend lo memorizza in memoria nell'`ApiClient` perché `document.cookie` non è leggibile cross-origin (dominio API ≠ dominio frontend).

**Regola per il futuro:** Ogni flusso cross-origin che usa CSRF double-submit pattern deve prevedere un meccanismo per trasmettere il token al frontend via body della risposta, non solo via cookie.

---

### 2026-07-21 — Ordine middleware CSRF/CORS in Starlette

**Problema:** In Starlette, l'**ultimo** middleware registrato con `add_middleware()` è il **più esterno** (quello che avvolge tutti gli altri). Se CSRFMiddleware è registrato dopo CORSMiddleware, le risposte 403 del CSRF bypassano il CORS e il browser le vede come errori CORS.

**Fix (PR #380):** CORSMiddleware ora è l'ultimo middleware registrato (outermost), CSRFMiddleware è registrato prima (inner). La risposta 403 del CSRF risale attraverso CORSMiddleware che aggiunge `Access-Control-Allow-Origin`.

**Regola per il futuro:** `add_middleware(CORSMiddleware)` deve essere SEMPRE l'ultimo middleware registrato nell'app FastAPI, per intercettare tutte le risposte (inclusi errori da middleware interni).

---

## Security audit

### 2026-09-12 — Audit dipendenze: fixare prima le critical/high fixabili, accettare le moderate/non fixabili

Audit completo (npm audit + pip-audit + cargo audit) con AGENT_FLOW 7.1. Risultato:

- **Fixati**: next 16.3.5 (critical RCE), js-yaml 4.3.2 (high), sharp 0.35.4 (high), fastapi 0.141.1 → starlette 1.6.0 (14 CVE), expo 57.0.22.
- **Accettati**: vitest 4.x (3 moderate, dev tool non esposto in produzione), Expo sub-deps (non fixabili senza downgrade).
- **Lezione**: prima di accettare una vulnerabilità, verificare se è in produzione o in dev-deps, e se il fix richiede breaking changes. Le critical/high fixabili vanno sempre fixate; le moderate in dev tool si possono documentare e accettare.

### 2026-07-15 — I bug vanno cercati nel codice, non aspettare che emergano in produzione

L'audit manuale del 2026-07-15 ha trovato 21 bug + 10 miglioramenti, tutti fixati con PR e CI. La lezione è che il testing automatizzato da solo non basta — serve revisione attiva del codice.

### 2026-07-09 — Security audit completato

20/24 issue risolte (83%). Tutte le vulnerabilità critiche e alte sono state corrette. Vedi [`CHANGELOG.md`](./CHANGELOG.md) per l'elenco completo.

---

## Note tecniche

- Il warning `StarletteDeprecationWarning: Using httpx with starlette.testclient is deprecated; install httpx2 instead` è stato risolto con l'upgrade a starlette 1.6.0 (PR #783) — ora usa `httpx2`.

### 2026-08-02 — Sync user non basta per CSRF sidecar

**Problema:** `api.syncUser(u)` salva l'utente in SQLite locale ed emette un JWT locale, ma il frontend continua a usare il token JWT della cloud (con SECRET_KEY diversa) per chiamare il sidecar. Il sidecar non riconosce il token e `getMe()`/`refreshCsrf()` falliscono.

**Lezione:** Non basta sincronizzare l'utente — bisogna anche **sostituire il token JWT** nel client con quello locale emesso dal sidecar. `syncUser()` restituisce già `access_token` e `csrf_token`, ma il frontend non li usa per aggiornare `api.setToken()`/`api.setCsrfToken()`.

**Regola:** Dopo aver chiamato un endpoint che restituisce un nuovo JWT, aggiornare SEMPRE il client locale con `api.setToken(newToken)` prima di chiamare altre API sul sidecar.

### 2026-08-02 — SameSite cookie su connessione cross-site Tauri

**Problema:** Il cookie CSRF non veniva inviato sulle POST cross-site in ambiente Tauri. La webview Tauri ha origin `http://tauri.localhost`, mentre il sidecar ascolta su `http://127.0.0.1:7723` — due origini diverse. Con `SameSite=Lax`, il browser non invia il cookie su richieste POST cross-site.

**Soluzione:** Rilevare se la connessione è su localhost (127.0.0.1, localhost, ::1) e in quel caso usare `SameSite=None, Secure=False`. Chrome/Edge permettono `SameSite=None` senza `Secure` su localhost.

**Regola:** In ambiente Tauri, dove webview origin ≠ sidecar origin, i cookie devono usare `SameSite=None` anche su HTTP (localhost). Non assumere mai che localhost = same-site.

### 2026-07-26 — I file .env pubblici su GitHub non devono contenere secret

**Problema:** `desktop/.env.desktop` conteneva `SECRET_KEY`, `JWT_SECRET_KEY` e `SUPER_ADMIN_EMAIL` hardcoded e pubblici su GitHub. Anche se il backend desktop ascolta solo su localhost, è cattiva pratica.

**Rimedio:** Rimosse tutte le chiavi hardcoded da `.env.desktop`. Aggiunta auto-generazione di `SECRET_KEY` in `config.py` se vuota (PR #446).

**Regola per il futuro:** I file `.env` pubblici non devono mai contenere secret. Se un valore è opzionale (auto-generabile), lascialo vuoto. Se è obbligatorio, documentalo in `.env.example` ma non nel file bundlato.

### 2026-07-27 — La versione dell'app va aggiornata in 3 file prima di ogni release

**Problema:** `tauri.conf.json`, `package.json` e `pyproject.toml` avevano tutti `version = "0.1.0"` nonostante i tag `v0.1.1`, `v0.1.2`, `v0.1.3`. L'installer desktop mostrava ancora "0.1.0" internamente.

**Rimedio:** Aggiornati tutti e 3 i file manualmente.

**Regola per il futuro:** Prima di creare un tag release, aggiornare SEMPRE `tauri.conf.json`, `package.json` e `pyproject.toml` con la nuova versione. Il `release-desktop.yml` dovrebbe idealmente automatizzare questo passaggio leggendo il nome del tag.

### 2026-07-27 — La CI non faceva build check, bug di compilazione in produzione

**Problema:** La frontend CI eseguiva solo `vitest run` ma non `npm run build`. Un import mancante (`useAuth` in `page.tsx`) non veniva rilevato — i test passavano ma la build falliva su Render e nella release desktop.

**Rimedio:** Aggiunto step `npm run build` in `ci-web.yml` dopo i test frontend.

**Regola per il futuro:** La CI frontend DEVE includere un build check (`npm run build` o `tsc --noEmit`) oltre ai test. I test unitari non verificano la compilazione.

### 2026-07-27 — Parametri invalidi a librerie di terze parti non rilevati dai test

**Problema:** `GoogleLoginButton` usava `width="100%"` che la Google Identity Services library non supporta. Il parametro invalido causava l'errore `Provided button width is invalid` e un crash a catena. Nei test il componente era mockato — l'errore non emergeva.

**Rimedio:** Rimosso `width="100%"`, sostituito con wrapper CSS.

**Regola per il futuro:** I parametri delle librerie esterne (Google, Stripe, ecc.) vanno verificati sulla documentazione ufficiale, non dati per scontati. Aggiungere un test che verifichi i parametri passati anche quando il componente è mockato.
