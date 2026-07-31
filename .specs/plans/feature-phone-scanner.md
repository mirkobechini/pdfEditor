# Feature: Scanner da fotocamera telefono → PDF automatico

## Obiettivo
Permettere all'utente di scansionare documenti con la fotocamera del telefono e convertirli automaticamente in PDF direttamente nell'app.

## Dipendenze
- Nessuna dipendenza tecnica immediata (feature futura, da pianificare)

## Stack proposto
- **Mobile**: React Native / Expo camera module (futuro, Fase 4)
- **Backend**: API di upload immagine + conversione PDF via PyMuPDF
- **Frontend web**: WebRTC per fotocamera (fallback browser) o QR code → mobile
- **QR code pairing**: Mostrare QR nell'app desktop/web, scansionare col telefono per attivare la fotocamera remota

## Casi d'uso

1. **Scansione singola**: foto → crop automatico → PDF
2. **Multi-pagina**: sequenza di foto → unico PDF multipagina
3. **Document camera**: OCR + auto-crop + edge detection
4. **QR pairing**: desktop mostra QR, telefono lo scansiona, camera stream sul desktop

## Output atteso
- Upload foto → conversione PDF con compressione
- Multi-pagina supportato
- Crop automatico (rilevamento bordi)

## Status

[ ] Non iniziata