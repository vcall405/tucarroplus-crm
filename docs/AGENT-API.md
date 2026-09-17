# API para agentes

La API de agentes permite que Codex, Claude Cowork y otros agentes trabajen con Tucarroplus CRM.

## Acceso

La base pública es:

```text
https://tucarroplus-crm-api-production.up.railway.app
```

Todas las rutas `/agent/*` y `/mcp` requieren:

```http
Authorization: Bearer <AGENT_API_TOKEN>
```

El token vive únicamente como variable privada `AGENT_API_TOKEN` en Railway.

## REST

- `GET /agent/stats`
- `GET /agent/leads?pending_only=true&status=nuevo&source=whatsapp&vendor=Miguel`
- `GET /agent/leads/:id`
- `POST /agent/leads`
- `PATCH /agent/leads/:id`
- `DELETE /agent/leads/:id` con cuerpo `{"confirm_name":"Nombre exacto"}`
- `GET /agent/openapi.json`

El borrado exige que `confirm_name` coincida exactamente con el nombre actual del lead.

## MCP remoto

Endpoint para clientes MCP compatibles:

```text
https://tucarroplus-crm-api-production.up.railway.app/mcp
```

Herramientas disponibles:

- `tucarroplus_list_leads`
- `tucarroplus_get_stats`
- `tucarroplus_get_lead`
- `tucarroplus_create_lead`
- `tucarroplus_update_lead`
- `tucarroplus_delete_lead`
- `tucarroplus_score_lead`

Las herramientas de modificación recalculan el score. El borrado es destructivo y exige confirmación exacta del nombre.

## Ejemplo REST

```powershell
$headers = @{ Authorization = "Bearer $env:TUCARROPLUS_AGENT_TOKEN" }
Invoke-RestMethod `
  -Uri "https://tucarroplus-crm-api-production.up.railway.app/agent/leads?pending_only=true" `
  -Headers $headers
```

No pongas el token en el repositorio, en Vercel ni dentro de los prompts de los agentes.
