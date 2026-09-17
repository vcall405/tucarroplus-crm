import axios from 'axios';
import seedLeads from '../ml/data/leads.json';
import { normalizeLead, scoreLeadRecord } from './utils/leadScoring.js';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || ''
});

const STORAGE_KEY = 'tucarroplus-crm-leads';

function readLocalLeads() {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  const source = stored ? JSON.parse(stored) : seedLeads;
  const leads = source.map((lead, index) => scoreLeadRecord(normalizeLead(lead, index)));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  return leads;
}

function getBrowserLeadStats(leads) {
  const total = leads.length;
  const byStatus = leads.reduce((acc, lead) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1;
    return acc;
  }, {});
  const scored = leads.filter((lead) => Number.isFinite(Number(lead.score))).length;
  const averageScore = total
    ? Math.round(leads.reduce((sum, lead) => sum + Number(lead.score || 0), 0) / total)
    : 0;
  const hotLeads = leads.filter((lead) => Number(lead.score || 0) >= 75).length;
  return { total, byStatus, scored, averageScore, hotLeads };
}

export async function fetchLeads() {
  try {
    const { data } = await api.get('/api/leads', { headers: { Accept: 'application/json' } });
    if (data?.leads && Array.isArray(data.leads)) return data;
  } catch {
    // The public Vercel UI can run before the Railway API is connected.
  }

  const leads = readLocalLeads();
  return { leads, stats: getBrowserLeadStats(leads), mode: 'browser-local' };
}

export async function updateLead(id, payload) {
  try {
    const { data } = await api.patch(`/api/leads/${id}`, payload);
    if (data?.lead) return data;
  } catch {
    // Fallback to browser-local persistence.
  }

  const leads = readLocalLeads();
  const nextLeads = leads.map((lead, index) => {
    if (lead.id !== id) return lead;
    return scoreLeadRecord(normalizeLead({
      ...lead,
      ...payload,
      id,
      updatedAt: new Date().toISOString()
    }, index));
  });
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextLeads));
  return { lead: nextLeads.find((lead) => lead.id === id), webhook: { forwarded: false }, mode: 'browser-local' };
}
