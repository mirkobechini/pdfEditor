# Feature Plan: AI-Powered PDF Editing Service

**Status:** Planning
**Priority:** BASSA (Future Premium Feature)
**Complexity:** VERY HIGH
**Estimated Time:** 2-4 settimane (prototipo)

---

## Obiettivo

Offrire un servizio AI che suggerisce modifiche al PDF e le applica, sia in locale (con chiave API propria dell'utente) che via cloud (abbonamento PdfEditor).

## Visione

L'utente seleziona un PDF e dice all'AI cosa vuole fare in linguaggio naturale:

- _"Traduci questo PDF in inglese"_
- _"Riassumi questo documento in 3 paragrafi"_
- _"Rendi questo PDF più leggibile, aumenta i font e aggiungi spaziatura"_
- _"Estrai tutte le tabelle in un foglio Excel"_

L'AI analizza il PDF, propone modifiche, e le applica automaticamente.

## Architettura

### Due modalità

#### 1. Modalità BYOK (Bring Your Own Key)

L'utente inserisce la propria API key (OpenAI, Anthropic, Google AI, ecc.) e le modifiche vengono processate localmente.

```
[Frontend] → [Backend PdfEditor] → [API LLM (OpenAI/Anthropic)] → [Backend applica modifiche] → [PDF modificato]
```

- Nessun costo per PdfEditor
- L'utente paga il proprio provider AI
- I dati non lasciano il controllo dell'utente

#### 2. Modalità PdfEditor Cloud (a pagamento)

L'utente ha un abbonamento PdfEditor che include crediti AI.

```
[Frontend] → [Backend PdfEditor] → [LLM PdfEditor (OpenAI API key centralizzata)] → [Backend applica modifiche] → [PDF modificato]
```

- Integrato con Stripe MCP subscriptions
- Crediti mensili in base al tier
- Nessuna configurazione richiesta per l'utente

### Backend

#### 1. AI Service

```python
# backend/app/services/ai_service.py
class AIService:
    """Service for AI-powered PDF editing."""

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or settings.AI_API_KEY

    async def suggest_edits(self, pdf_content: bytes, prompt: str) -> list[AIEdit]:
        """Send PDF + prompt to LLM, get suggested edits."""
        # 1. Extract text from PDF via PyMuPDF
        # 2. Send text + prompt to LLM
        # 3. Parse response into structured edits
        pass

    async def apply_edits(self, pdf_content: bytes, edits: list[AIEdit]) -> bytes:
        """Apply AI-suggested edits to PDF."""
        pass
```

#### 2. Endpoint

```python
# backend/app/api/v1/ai.py
@router.post("/pdfs/{id}/ai-edit")
async def ai_edit_pdf(
    pdf_id: str,
    req: AIEditRequest,  # { prompt: str, api_key?: str }
    current_user: User = Depends(get_current_user),
    service: PdfService = Depends(get_pdf_service),
):
    """Edit PDF using AI suggestions."""
    # 1. Get PDF content
    # 2. Call AI service
    # 3. Apply edits
    # 4. Return modified PDF
```

#### 3. Schema

```python
class AIEditRequest(BaseModel):
    prompt: str = Field(..., description="Natural language description of edits")
    api_key: str | None = Field(None, description="Optional BYOK API key")
    provider: str = Field("openai", description="AI provider: openai, anthropic, google")
```

### Frontend

#### 1. AI Edit Dialog

```tsx
// frontend/src/app/components/AIEditDialog.tsx
interface AIEditDialogProps {
  open: boolean;
  onClose: () => void;
  pdfId: string | null;
}

// Features:
// - Textarea per prompt in linguaggio naturale
// - Selezione provider (OpenAI/Anthropic/Google)
// - Input per API key (BYOK mode)
// - Pulsante "Preview Changes" (mostra modifiche prima di applicare)
// - Pulsante "Apply" (applica modifiche)
// - Progress indicator durante elaborazione AI
```

#### 2. Toolbar Button

```tsx
// In Toolbar.tsx
<button onClick={onAIEdit} title="AI Edit">
  🤖 AI Edit
</button>
```

### Pricing Model (Futuro)

| Tier       | AI Access | Limiti             |
| ---------- | --------- | ------------------ |
| Free       | BYOK only | —                  |
| Pro        | Cloud AI  | 50 crediti/mese    |
| Enterprise | Cloud AI  | Crediti illimitati |

## Dipendenze

- **Backend:** `openai` / `anthropic` Python SDK
- **Frontend:** Nessuna nuova dipendenza
- **Infrastruttura:** Stripe MCP per abbonamenti (se modalità cloud)

## Files da creare

**Backend:**

- `backend/app/services/ai_service.py` — AI service
- `backend/app/api/v1/ai.py` — AI endpoint
- `backend/app/schemas/ai.py` — AI schemas

**Frontend:**

- `frontend/src/app/components/AIEditDialog.tsx` — AI dialog
- `frontend/src/app/components/AIEditPreview.tsx` — Preview modifiche

## Files da modificare

- `frontend/src/app/components/Toolbar.tsx` — Aggiungere pulsante AI
- `frontend/src/app/app/page.tsx` — Handler AI edit
- `frontend/src/app/lib/api.ts` — Aggiungere metodi AI
- `frontend/messages/en.json` — Chiavi i18n
- `frontend/messages/it.json` — Chiavi i18n

## Acceptance Criteria

- [ ] Utente può scrivere prompt in linguaggio naturale
- [ ] AI suggerisce modifiche (preview)
- [ ] Modifiche applicabili al PDF
- [ ] BYOK mode funziona con OpenAI/Anthropic
- [ ] Cloud mode funziona con abbonamento
- [ ] Crediti consumati correttamente
- [ ] Tutti i test passano

## Note

- **MVP:** Solo BYOK mode + OpenAI. Cloud mode in Fase 2.
- **Privacy:** I PDF inviati a provider esterni devono essere anonimizzati (rimuovere metadati personali).
- **Rate limiting:** Proteggere endpoint AI da abusi (BYOK ha rate limit più alto).
