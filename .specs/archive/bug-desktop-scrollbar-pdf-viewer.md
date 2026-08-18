# Bug: Scrollbar in tutta l'app dopo apertura PDF su desktop

## Obiettivo

Quando si apre un PDF nella desktop app, compaiono scrollbar in tutta l'app che richiedono di ridimensionare la finestra per tornare alla visualizzazione normale.

## Causa probabile

La finestra Tauri è impostata a 1600x1000, ma il PDF viewer aggiunge contenuto che eccede l'altezza disponibile, causando scrollbar sull'intera app.

## Soluzione proposta

1. Aprire la finestra Tauri **massimizzata** all'avvio (usa `maximized: true` in tauri.conf.json)
2. Impostare dimensioni minime adeguate (1280x800 già presenti)

## Output atteso

- All'avvio, la finestra si apre massimizzata
- Il PDF viewer non causa scrollbar perché la finestra ha spazio sufficiente

## Status

[ ] Non iniziata
