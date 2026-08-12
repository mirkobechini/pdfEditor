# Feature: Personalizzare la pagina browser del Google OAuth Desktop

## Obiettivo

Sostituire le pagine HTML di risposta per il flusso Google OAuth desktop con pagine personalizzate con il branding dell'app (PdfEditor), sia per il caso di successo che per quello di errore.

## Contesto

Le pagine attuali sono HTML inline in `backend/app/api/v1/auth.py`:

- `google_desktop_token_receive()` — pagina di successo/errore dopo il redirect dal cloud
- La pagina di successo mostra solo "Login con Google riuscito! <script>window.close();</script>"
- La pagina di errore mostra solo "Google login failed"

## Cosa fare

1. Creare un template HTML con branding PdfEditor (logo, colori, font) per la pagina di successo
2. Creare un template HTML per la pagina di errore
3. Sostituire gli HTML inline in `auth.py` con i nuovi template

## Design

- Logo PdfEditor (monkey logo)
- Colori: gradienti arancione (#f7871f, #ea580c)
- Messaggio: "Accesso completato! Puoi chiudere questa finestra."
- Per errore: "Accesso non riuscito. Riprova dall'app."
- Stesso stile della landing page

## Output atteso

- Dopo Google login, la pagina del browser mostra una pagina con il branding PdfEditor invece di testo semplice
- Sia successo che errore hanno una pagina curata

## Status

[ ] Non iniziata
