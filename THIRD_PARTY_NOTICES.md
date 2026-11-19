# Third-Party Notices — Librerie e binari di terze parti

> Aggiornato: 2026-11-19 (mirko) — Motivo: integrazione OCR professionale (OCRmyPDF) nel sidecar desktop.
> Questo file raccoglie i componenti di terze parti distribuiti insieme all'app (in particolare dentro il sidecar `fastapi-sidecar`) e le loro licenze, come richiesto dalle licenze stesse.

## Componenti OCR nel sidecar

| Componente | Versione (ref) | Licenza | Uso | Fonte |
|---|---|---|---|---|
| **OCRmyPDF** | 16.x | MPL-2.0 (Mozilla Public License 2.0) | Motore OCR professionale (ricerca + layer testo su PDF) | https://github.com/ocrmypdf/OCRMmyPDF (MIT-adjacent: MPL-2.0) |
| **Tesseract OCR** | 5.x | Apache-2.0 | Riconoscimento testo + pacchetti lingua (`ita.traineddata`, `eng`) | https://github.com/tesseract-ocr/tesseract — language data Apache-2.0 |
| **Ghostscript** | 10.x | AGPL-3.0 (GNU Affero GPL v3, con eccezione font) — *vedi nota sotto* | Conversione/resize PDF usato da OCRmyPDF | https://github.com/ArtifexSoftware/ghostpdl — licenza anche commerciale (Artifex) |
| **qpdf** | 12.x | Apache-2.0 | Linearizzazione/riscrittura PDF usato da OCRmyPDF | https://github.com/qpdf/qpdf |
| **pikepdf** | 8.x/9.x | MPL-2.0 | Lettura/scrittura PDF in OCRmyPDF | https://github.com/pikepdf/pikepdf |
| **img2pdf** | 0.5.x | LGPL-3.0 | JPEG→PDF dentro OCRmyPDF | https://github.com/josch/img2pdf |
| **pypdfium2** | 4.x | Apache-2.0 / BSD-3-Clause | Render PDF in OCRmyPDF | https://github.com/pypdfium2-team/pypdfium2 |
| **reportlab** | 4.x | BSD-3-Clause | Generazione PDF in OCRmyPDF | https://pypi.org/project/reportlab/ |

## Nota sulla licenza AGPL di Ghostscript

Ghostscript è distribuito sotto **AGPL-3.0** (Artifex offre anche una licenza commerciale). L'app lo usa come **processo separato** (eseguito da OCRmyPDF, senza modifiche al suo codice): in aggregazione con l'app, gli obblighi AGPL si applicano a Ghostscript stesso, che resta **open source** sul repo Artifex. Per conformità includiamo:
- questo file di notizie nel repository/installer;
- l'accesso al sorgente di Ghostscript: https://github.com/ArtifexSoftware/ghostpdl (+ licenza completa `LICENSE` nel suo repo);
- nessuna copia delle fonti modificate (non lo modifichiamo).

**Attenzione legale (da confermare con Mirko):** il repo dell'app **non ha ancora un file LICENSE** (di default = "tutti i diritti riservati"). Distribuendo componenti AGPL/MPL insieme all'app è fortemente consigliato:
1. decidere e aggiungere una **licenza per l'app stessa** (es. MIT o Apache-2.0, scelta di Mirko);
2. mantenerli, questo file, il testo delle licenze inline ove richiesto (MPL e LGPL richiedono di includere il testo/licenza quando si ridistribuiscono i componenti).

## Licenze richieste in distribuzione (promemoria)

- **MPL-2.0** (OCRmyPDF, pikepdf): richiede di rendere disponibile il codice sorgente delle versioni distribuite del componente (provvediamo: sono le release pubbliche su GitHub) e di mantenere i relativi avvisi.
- **Apache-2.0** (tesseract, qpdf): richiede NOTICE/licenza inclusa — inclusa.
- **LGPL-3.0** (img2pdf): richiede la possibilità di sostituire la libreria (provvediamo link al sorgente).
- **AGPL-3.0** (Ghostscript): vedi nota sopra.

## Dove vive nel codice

- `backend/requirements.txt`: `ocrmypdf` (dipendenza OCR).
- `backend/app/deep_agent/tools/pdf_ops.py` e `backend/app/services/pdf_service_mutate.py`: invocazione OCR (deep agent e pulsante in-app).
- `desktop/build-sidecar.sh`: bundling di tesseract/ghostscript/qpdf nel sidecar.
- `desktop/run_backend.py`: PATH/`GS_PROG`/`QPDF` per trovarceli a runtime.
