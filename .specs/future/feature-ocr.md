# Feature: OCR (Optical Character Recognition)

## Obiettivo

Aggiungere la funzionalità OCR per estrarre testo da PDF scansionati (immagini). Il bottone mock "OCR" nella sidebar Fast Actions del desktop e sulla webapp/mobile non fa ancora nulla.

## Dipendenze

- Backend: da creare endpoint `POST /pdfs/{id}/ocr`
- Dipendenza esterna: Tesseract OCR (pytesseract + tesseract-ocr)
- Frontend: modale per visualizzare il testo estratto

## Stack

- Backend: FastAPI + PyMuPDF (fitz) + pytesseract + Tesseract OCR
- Frontend: modale con textarea/visualizzazione testo

## Modifiche necessarie

### Backend

1. Aggiungere `pytesseract` e `tesseract-ocr` come dipendenze
2. Nuovo service `ocr_service.py` con funzione `extract_text_from_pdf(pdf_content) -> str`
3. Nuovo endpoint `POST /pdfs/{id}/ocr` che restituisce il testo estratto
4. Integrare con password cache (PDF protetti)

### Frontend

5. Modale "OCR Result" con textarea readonly contenente il testo estratto
6. Bottone OCR nella sidebar Fast Actions (desktop)
7. Bottone OCR nella webapp
8. Bottone OCR nel mobile

### Sidecar

9. Tesseract OCR deve essere disponibile nel PATH anche per l'eseguibile PyInstaller — richiede configurazione aggiuntiva

## Output atteso

- Click su OCR → chiamata API → modale con testo estratto
- Supporto per PDF protetti (se sbloccati)
- Copia testo negli appunti

## Status

[ ] Non iniziata — Feature futura
