import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLead, deleteLead, getLeadStats, readLeads, updateLead } from './src/utils/leadStore.js';
import { scoreLeadRecord } from './src/utils/leadScoring.js';

const app = express();
const port = Number(process.env.PORT || 3001);
const dirname = path.dirname(fileURLToPath(import.meta.url));
const allowedOrigins = (process.env.ALLOWED_ORIGIN || 'http://localhost:5173')
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
    stats: getLeadStats(leads)
  });
});

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
