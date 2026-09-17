# Tucarroplus CRM

CRM React + Express para operar leads automotrices de Tucarroplus con scoring automatico 0-100, persistencia JSON y webhooks.

## Estado actual

- UI React lista: dashboard, tabla de leads, detalle, formulario de status y score card.
- API Express: `/health`, `/api/leads`, `/api/leads/:id`, `/api/score`, `/webhook/lead-update`.
- API para agentes: REST autenticado en `/agent/*` y MCP remoto en `/mcp`. Ver `docs/AGENT-API.md`.
- Data: `ml/data/leads.json`.
- Importador: `npm run import:leads -- leads.json`.
- Scoring batch: `npm run score:leads`.
- Docker/Railway/Vercel config incluidos.

## Desarrollo local

```bash
npm install
npm run import:leads -- leads.sample.json
npm run score:leads
npm run dev
```

Frontend local: `http://localhost:5173`  
Backend local: `http://localhost:3001`

## Variables de entorno

```env
PORT=3001
NODE_ENV=production
DATA_FILE=ml/data/leads.json
ALLOWED_ORIGIN=https://tu-frontend.vercel.app
VITE_API_URL=https://tu-backend.railway.app
N8N_WEBHOOK_URL=https://n8n2.vcallia.com/webhook/tucarroplus-crm
N8N_API_KEY=secret
```

## Deploy recomendado

### Backend en Railway

1. Crear proyecto Railway desde este repo.
2. Usar Dockerfile.
3. Variables:
   - `PORT=3001`
   - `DATA_FILE=ml/data/leads.json`
   - `ALLOWED_ORIGIN=https://<frontend-vercel-url>`
   - `N8N_WEBHOOK_URL` y `N8N_API_KEY` si aplica.
4. Healthcheck: `/health`.

### Frontend en Vercel

1. Importar el mismo repo.
2. Framework: Vite.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Variable: `VITE_API_URL=https://<backend-railway-url>`.

## Verificacion

```bash
npm test
npm run build
Invoke-RestMethod http://localhost:3001/health
```

## Kumo

NVIDIA Kumo queda preparado como capa posterior. Mientras no haya API/modelo activo, el scoring usa reglas deterministicamente explicables para operar el CRM hoy.
