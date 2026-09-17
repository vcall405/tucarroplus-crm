import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createLead, deleteLead, getLeadStats, readLeads, updateLead } from './src/utils/leadStore.js';
import { scoreLeadRecord } from './src/utils/leadScoring.js';
import { createMcpServer } from './src/mcpServer.js';

const app = express();
const port = Number(process.env.PORT || 3001);
const dirname = path.dirname(fileURLToPath(import.meta.url));
const allowedOrigins = (process.env.ALLOWED_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const agentToken = process.env.AGENT_API_TOKEN || '';
const mcpAllowedOrigins = (process.env.MCP_ALLOWED_ORIGINS || 'https://claude.ai,https://claude.com,https://chatgpt.com,https://chat.openai.com')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    const isVercelPreview = origin && new URL(origin).hostname.endsWith('.vercel.app');
    if (!origin || isVercelPreview || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
      return;
    }
    callback(new Error(`Origin not allowed: ${origin}`));
  }
}));
app.use(express.json({ limit: '1mb' }));

function agentAuth(req, res, next) {
  if (!agentToken) {
    res.status(503).json({ error: 'Agent API no configurada: falta AGENT_API_TOKEN en el servidor.' });
    return;
  }
  const provided = req.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  const valid = provided.length === agentToken.length
    && crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(agentToken));
  if (!valid) {
    res.status(401).json({ error: 'Token de agente inválido o ausente.' });
    return;
  }
  next();
}

function validateMcpOrigin(req, res, next) {
  const origin = req.get('origin');
  if (origin && !mcpAllowedOrigins.includes(origin)) {
    res.status(403).json({ error: 'Origen MCP no permitido.' });
    return;
  }
  next();
}

async function forwardToN8n(payload) {
  if (!process.env.N8N_WEBHOOK_URL) return { forwarded: false };
  try {
    const response = await axios.post(process.env.N8N_WEBHOOK_URL, payload, {
      timeout: 5000,
      headers: process.env.N8N_API_KEY ? { 'X-N8N-API-KEY': process.env.N8N_API_KEY } : undefined
    });
    return { forwarded: true, status: response.status };
  } catch (error) {
    return { forwarded: false, error: error.message };
  }
}

app.get('/health', async (_req, res) => {
  const leads = await readLeads();
  res.json({
    ok: true,
    service: process.env.CRM_NAME || 'Tucarroplus CRM',
    agentApi: Boolean(agentToken),
    stats: getLeadStats(leads)
  });
});

app.get('/agent/openapi.json', agentAuth, (req, res) => {
  res.json({
    openapi: '3.0.3',
    info: { title: 'Tucarroplus CRM Agent API', version: '1.0.0' },
    servers: [{ url: `${req.protocol}://${req.get('host')}/agent` }],
    security: [{ bearerAuth: [] }],
    paths: {
      '/leads': { get: { summary: 'Listar leads', parameters: [{ name: 'pending_only', in: 'query', schema: { type: 'boolean' } }, { name: 'status', in: 'query', schema: { type: 'string' } }, { name: 'source', in: 'query', schema: { type: 'string' } }, { name: 'vendor', in: 'query', schema: { type: 'string' } }] }, post: { summary: 'Crear lead' } },
      '/leads/{id}': { get: { summary: 'Consultar lead' }, patch: { summary: 'Actualizar lead' }, delete: { summary: 'Eliminar lead' } },
      '/stats': { get: { summary: 'Ver estadísticas' } }
    },
    components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } } }
  });
});

app.get('/agent/stats', agentAuth, async (_req, res) => {
  const leads = await readLeads();
  res.json({ ...getLeadStats(leads), pendingFollowUp: leads.filter((lead) => !['vendido', 'perdido'].includes(lead.status)).length });
});

app.get('/agent/leads', agentAuth, async (req, res) => {
  const leads = await readLeads();
  const filtered = leads.filter((lead) => (!req.query.status || lead.status === req.query.status)
    && (!req.query.source || lead.source === req.query.source)
    && (!req.query.vendor || lead.vendor === req.query.vendor)
    && (req.query.pending_only !== 'true' || !['vendido', 'perdido'].includes(lead.status)));
  res.json({ leads: filtered, stats: getLeadStats(filtered) });
});

app.get('/agent/leads/:id', agentAuth, async (req, res) => {
  const lead = (await readLeads()).find((item) => item.id === req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead no encontrado' });
  res.json({ lead });
});

app.post('/agent/leads', agentAuth, async (req, res) => {
  res.status(201).json({ lead: await createLead(req.body || {}) });
});

app.patch('/agent/leads/:id', agentAuth, async (req, res) => {
  const result = await updateLead(req.params.id, req.body || {});
  if (!result) return res.status(404).json({ error: 'Lead no encontrado' });
  res.json({ lead: result.lead });
});

app.delete('/agent/leads/:id', agentAuth, async (req, res) => {
  const existing = (await readLeads()).find((item) => item.id === req.params.id);
  if (!existing) return res.status(404).json({ error: 'Lead no encontrado' });
  if (req.body?.confirm_name !== existing.name) return res.status(409).json({ error: 'confirm_name debe coincidir exactamente con el nombre del lead.' });
  res.json({ ok: true, lead: await deleteLead(req.params.id) });
});

async function handleMcp(req, res) {
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  const server = createMcpServer();
  res.on('close', () => transport.close());
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
}

app.post('/mcp', agentAuth, validateMcpOrigin, handleMcp);
app.get('/mcp', agentAuth, validateMcpOrigin, handleMcp);

app.get('/api/leads', async (_req, res) => {
  const leads = await readLeads();
  res.json({ leads, stats: getLeadStats(leads) });
});

app.get('/api/leads/:id', async (req, res) => {
  const leads = await readLeads();
  const lead = leads.find((item) => item.id === req.params.id);
  if (!lead) {
    res.status(404).json({ error: 'Lead no encontrado' });
    return;
  }
  res.json({ lead });
});

app.post('/api/leads', async (req, res) => {
  const lead = await createLead(req.body || {});
  res.status(201).json({ lead });
});

app.patch('/api/leads/:id', async (req, res) => {
  const result = await updateLead(req.params.id, req.body);
  if (!result) {
    res.status(404).json({ error: 'Lead no encontrado' });
    return;
  }

  const webhookResult = await forwardToN8n({
    event: 'lead_status_changed',
    leadId: result.lead.id,
    oldStatus: result.previous.status,
    newStatus: result.lead.status,
    lead: result.lead,
    timestamp: new Date().toISOString()
  });

  res.json({ lead: result.lead, webhook: webhookResult });
});

app.delete('/api/leads/:id', async (req, res) => {
  const lead = await deleteLead(req.params.id);
  if (!lead) {
    res.status(404).json({ error: 'Lead no encontrado' });
    return;
  }
  res.json({ ok: true, lead });
});

app.post('/api/score', async (req, res) => {
  const lead = scoreLeadRecord(req.body || {});
  res.json({ lead, score: lead.score, conversionProbability: lead.conversionProbability });
});

app.post('/webhook/lead-update', async (req, res) => {
  const { leadId, id, ...patch } = req.body || {};
  const result = await updateLead(String(leadId || id || ''), patch);
  if (!result) {
    res.status(404).json({ error: 'Lead no encontrado' });
    return;
  }
  res.json({ ok: true, lead: result.lead });
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(dirname, 'dist')));
  app.get(/^(?!\/api|\/webhook|\/health).*/, (_req, res) => {
    res.sendFile(path.join(dirname, 'dist', 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`Tucarroplus CRM API running on http://localhost:${port}`);
});
