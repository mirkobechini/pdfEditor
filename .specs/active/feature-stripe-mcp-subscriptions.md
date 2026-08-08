# Feature Plan: Stripe MCP Server — Abbonamenti e Pagamenti

**Status:** Planning
**Priority:** Medium (Fase 2-3)
**Complexity:** High
**Estimated Time:** 3-5 giorni

---

## Objective

Integrare Stripe per gestire abbonamenti e pagamenti degli utenti PdfEditor, utilizzando l'MCP server ufficiale di Stripe per semplificare l'implementazione lato agent/AI.

## Contesto

Attualmente il sistema di licensing è basato su tier statici (`free`, `premium`, `lifetime`, `admin`) assegnati manualmente via admin dashboard o CLI. Non esiste integrazione con pagamenti reali.

Con l'arrivo della Fase 2 (web app su cloud), serve un sistema di abbonamenti per:

- Permettere agli utenti di passare da free a premium
- Gestire pagamenti ricorrenti (monthly/yearly)
- Gestire pagamenti una tantum (lifetime)
- Emettere fatture/ricevute
- Gestire cancellazioni e rinnovi

## Stripe MCP Server

Stripe fornisce un **MCP server ufficiale** accessibile via:

```
https://mcp.stripe.com
```

L'MCP server è **remoto** e si autentica via **OAuth 2.0**. Non richiede installazione locale — basta configurare l'agent (Copilot, Claude, Cursor) per connettersi.

### Vantaggi dell'MCP server Stripe

- **Zero infrastruttura**: non devi hostare nulla
- **API sempre aggiornate**: Stripe mantiene il server
- **OAuth sicuro**: nessuna API key esposta all'agent
- **Strumenti pre-costruiti**: creare prodotti, prezzi, customer, subscription, invoice
- **Skill aggiuntive**: `npx skills add https://docs.stripe.com` per best practices

### Configurazione per Copilot / VS Code

```json
// .vscode/mcp.json (o configurazione equivalente)
{
  "servers": {
    "stripe": {
      "type": "url",
      "url": "https://mcp.stripe.com",
      "auth": "oauth"
    }
  }
}
```

### Alternativa: Stripe Agent Toolkit

Stripe offre anche `@stripe/agent-toolkit` (repo: `stripe/ai`) con:

- SDK per integrare Stripe con LLM e agent framework
- `@stripe/ai-sdk` per Vercel AI SDK
- Skill per Claude Code, Cursor, Codex

## Implementazione

### Fase A — Setup Stripe

1. Creare account Stripe (https://dashboard.stripe.com)
2. Configurare prodotti e prezzi:
   - **Premium Monthly**: €X/mese
   - **Premium Yearly**: €Y/anno
   - **Lifetime**: €Z una tantum
3. Configurare webhook per eventi Stripe → backend FastAPI
4. Ottenere API keys (publishable + secret)

### Fase B — Backend

1. Aggiungere modello `Subscription` al database:
   ```python
   class Subscription(Base):
       id: UUID
       user_id: FK → User
       stripe_customer_id: str
       stripe_subscription_id: str | None
       tier: str  # premium, lifetime
       status: str  # active, canceled, past_due
       current_period_end: datetime
       created_at: datetime
   ```
2. Endpoint backend:
   - `POST /billing/create-checkout-session` — crea sessione Stripe Checkout
   - `POST /billing/webhook` — riceve eventi Stripe (payment success, cancel, etc.)
   - `GET /billing/portal` — link al customer portal Stripe
   - `GET /billing/subscription` — stato abbonamento corrente
3. Aggiornare `license_tier` dell'utente in base agli eventi webhook
4. Gestire grace period per pagamenti falliti

### Fase C — Frontend

1. Pagina `/app/billing` o sezione nel profilo utente
2. Bottone "Upgrade to Premium" → redirect a Stripe Checkout
3. Visualizzazione stato abbonamento corrente
4. Link a Stripe Customer Portal per gestire pagamenti

### Fase D — MCP Integration

1. Configurare MCP server Stripe nell'ambiente di sviluppo
2. Usare l'agente per creare prodotti/prezzi su Stripe
3. Usare l'agente per testare il flusso di checkout
4. Usare l'agente per monitorare subscription e pagamenti

## Dipendenze

- `stripe` Python SDK (`pip install stripe`)
- `@stripe/stripe-js` frontend
- MCP server Stripe configurato
- Account Stripe attivo

## Output atteso

- Utente può fare upgrade da free a premium tramite Stripe Checkout
- Webhook Stripe aggiorna automaticamente `license_tier`
- Customer portal per gestire abbonamento
- Admin può vedere stato abbonamenti nella dashboard
- MCP server Stripe disponibile per operazioni di sviluppo

## Status

[ ] Non iniziata
