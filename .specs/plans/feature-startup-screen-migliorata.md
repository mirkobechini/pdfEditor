# Feature: Startup screen migliorata — messaggi più specifici e backend non parte

## Problema

La startup screen attuale (PR #517) è stata resa troppo minimalista: mostra solo "Avvio in corso..." e reindirizza subito al login. Questo ha causato 2 problemi:

1. **L'utente non vede cosa sta succedendo** — se il backend impiega 30s, la startup screen non dà feedback, poi il login mostra un warning generico.
2. **Il backend non parte** — potenzialmente il sidecar non viene avviato correttamente, e la startup screen non lo diagnostica.

## Requisiti

- La startup screen deve essere la PRIMA schermata (come era prima)
- Deve mostrare messaggi di progresso reali, non solo "Avvio in corso..."
- Se il backend non parte, deve mostrare un errore specifico (es. "Sidecar non trovato", "Porta 7723 occupata")
- L'utente deve capire che sta effettivamente facendo qualcosa
- Non deve bloccare per più di 60 secondi senza un messaggio chiaro

## Comportamento originale (da ripristinare con migliorie)

La versione originale (PR #511) aveva 3 step:

1. "Avvio del backend in locale..." — health check al sidecar FastAPI
2. "Connessione al database..." — ping SQLite
3. "Verifica API e servizi..." — ping a un endpoint API

## Step proposti (con messaggi migliorati)

| Step | Messaggio                              | Cosa fa                                 | Durata max |
| ---- | -------------------------------------- | --------------------------------------- | ---------- |
| 1    | "Avvio del backend in locale..."       | Health check su `127.0.0.1:7723/health` | 30s        |
| 2    | "Connessione al database SQLite..."    | Ping database locale                    | 5s         |
| 3    | "Verifica API e servizi..."            | Chiamata a un endpoint API              | 5s         |
| ✅   | "Pronto! Reindirizzamento al login..." | —                                       | 1s         |

## Gestione errori

| Step | Errore                               | Messaggio                                                                                     |
| ---- | ------------------------------------ | --------------------------------------------------------------------------------------------- |
| 1    | Sidecar non risponde dopo 30s        | "Il backend non risponde. Verifica che il sidecar sia presente o riprova."                    |
| 1    | Connessione rifiutata (porta chiusa) | "Impossibile contattare il backend sulla porta 7723. Verifica che non sia già in esecuzione." |
| 2    | Database non raggiungibile           | "Errore di connessione al database. Verifica il file pdfeditor.db."                           |
| 3    | API endpoint non risponde            | "L'API non risponde correttamente. Il backend potrebbe essere in errore."                     |

## Note

- Non usare polling infinito. Dopo 60s totali, mostrare errore con pulsante Riprova che resetta il timer.
- Il login deve comunque avere un health check, ma non deve essere il punto principale di attesa.
- Se il sidecar non è presente, mostrare messaggio specifico (non generico "Tempo scaduto").
- Al completamento, redirect a wizard (prima installazione) o login.

## Priorità

🔴 Alta — UX primo avvio, blocca l'uso dell'app se il backend non parte.
