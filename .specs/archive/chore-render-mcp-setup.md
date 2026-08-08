# Chore: Render MCP Server Setup

**Status:** ✅ Completata (2026-07-08)
**Priority:** MEDIA (Infrastructure)
**Complexity:** Low
**Estimated Time:** 30 min

## Obiettivo

Configurare il Render MCP server per interagire con i servizi Render via Claude/IDE.

## Prerequisiti

- Docker (installato)
- Render API key (da [dashboard.render.com/account/api-tokens](https://dashboard.render.com/account/api-tokens))

## Setup

### 1. Genera Render API key

Vai su [dashboard.render.com/account/api-tokens](https://dashboard.render.com/account/api-tokens) → Create API Token → copia il token.

### 2. Avvia Render MCP server via Docker

```bash
docker pull renderops/render-mcp-server:latest
docker run -e RENDER_API_KEY="rnd_xxxxx" renderops/render-mcp-server
```

### 3. Configura in VS Code (`.vscode/mcp.json`)

```json
{
  "servers": {
    "render": {
      "type": "docker",
      "image": "renderops/render-mcp-server:latest",
      "env": {
        "RENDER_API_KEY": "${RENDER_API_KEY}"
      }
    }
  }
}
```

### 4. Comandi disponibili

- `list_services` — elenca servizi
- `get_service <id>` — dettagli servizio
- `list_deploys <serviceId>` — storico deploy
- `get_deploy <serviceId> <deployId>` — dettagli deploy
- `list_logs <resource>` — logs
- `get_metrics <resourceId>` — metriche CPU/memoria
- `query_render_postgres <postgresId> <sql>` — query SQL sul DB
- `list_postgres_instances` — elenca DB PostgreSQL
- `list_workspaces` — elenca workspace

## Output atteso

✅ Render MCP server funzionante da VS Code/Claude:

- `list_services` mostra il backend PdfEditor
- `list_logs` mostra i log recenti
- `get_metrics` mostra CPU/memory usage
