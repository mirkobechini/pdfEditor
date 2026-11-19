# Licenze & piani di monetizzazione — decisioni (aggiornato 2026-11-19)

Questo file registra le decisioni di licenza/monetizzazione prese con Mirko, per non perderle di vista.

## Stato attuale del repo
- **Nessun file LICENSE** nel repository (di default vale "tutti i diritti riservati").
- Componenti di terze parti: vedi `THIRD_PARTY_NOTICES.md` (incluse le **AGPL** di PyMuPDF e Ghostscript).

## Decisione del 19/11 (Mirko) — direzione scelta: **Opzione 1**
> Registra sia l'Opzione 1 sia l'Opzione 2, ma "credo che andremo di opzione 1 sia adesso che in futuro" (Mirko, 19/11).

### Opzione 1 — Open source permissivo (SCELTA attuale)
- **Licenza dell'app: Apache-2.0** (da aggiungere al repo: `LICENSE` + nota in README).
- Repo pubblico; chiunque può usare/copiare/ridistribuire il codice (per design).
- Monetizzazione possibile e legittima: **feature Pro, supporto, cloud, licenze enterprise**.
- Le librerie AGPL (PyMuPDF, Ghostscript) sono ok: il progetto è aperto, quindi gli obblighi AGPL sono soddisfatti mantenendo il sorgente pubblico e le notizie.
- Nessun costo aggiuntivo.

### Opzione 2 — Vendita chiusa in futuro (REGISTRATA, da attivare SOLO se si cambia idea)
- Se un giorno si volesse vendere l'app **chiusa/a pagamento** senza regalare il codice:
  1. Cambiare la licenza dell'app in **proprietaria/source-available** (es. EULA o Business Source License) oppure tenere Apache-2.0 ma accettare che chiunque possa ridistribuirla;
  2. **Comprare le licenze commerciali di Artifex per PyMuPDF e Ghostscript** (le UNICHE due componenti che bloccano la vendita chiusa; tutti gli altri — tesseract/qpdf Apache, OCRmyPDF/pikepdf MPL, img2pdf LGPL, fastapi/uvicorn/langchain MIT/BSD — sono compatibili con un prodotto commerciale rispettandone le clausole);
  3. Prima della vendita vera, fare una **consulenza legale breve** per EULA/pricing.

### Riferimenti
- Componenti e licenze: `THIRD_PARTY_NOTICES.md`
- AGPL PyMuPDF: https://github.com/pymupdf/PyMuPDF (LICENSE) — commerciale: Artifex
- AGPL Ghostscript: https://github.com/ArtifexSoftware/ghostpdl — commerciale: Artifex

## TODO
- [ ] Aggiungere `LICENSE` Apache-2.0 al repo (conferma Mirko) + riferimento nel README
- [ ] Rileggere `THIRD_PARTY_NOTICES.md` a ogni aggiunta di dipendenza
