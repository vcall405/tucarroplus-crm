import fs from 'node:fs/promises';
import path from 'node:path';
import { normalizeLead, scoreLeadRecord, scoreLeads } from './leadScoring.js';

const DEFAULT_DATA_FILE = 'ml/data/leads.json';

export function getDataFile() {
  return path.resolve(process.cwd(), process.env.DATA_FILE || DEFAULT_DATA_FILE);
}

export async function ensureDataFile() {
  const file = getDataFile();
  await fs.mkdir(path.dirname(file), { recursive: true });
  try {
    await fs.access(file);
  } catch {
    await fs.writeFile(file, '[]\n');
  }
  return file;
}

export async function readLeads() {
  const file = await ensureDataFile();
  const raw = await fs.readFile(file, 'utf8');
  const parsed = raw.trim() ? JSON.parse(raw) : [];
  return parsed.map((lead, index) => normalizeLead(lead, index));
}

export async function writeLeads(leads) {
  const file = await ensureDataFile();
  const normalized = leads.map((lead, index) => normalizeLead(lead, index));
  await fs.writeFile(file, `${JSON.stringify(normalized, null, 2)}\n`);
  return normalized;
}

export async function importLeads(leads) {
  return writeLeads(scoreLeads(leads));
}

export async function scoreStoredLeads() {
  const leads = await readLeads();
  return writeLeads(leads.map((lead) => scoreLeadRecord(lead)));
}

export async function updateLead(id, patch) {
  const leads = await readLeads();
  const index = leads.findIndex((lead) => lead.id === id);
  if (index === -1) return null;

  const previous = leads[index];
  const next = scoreLeadRecord(
    normalizeLead({
      ...previous,
      ...patch,
      id: previous.id,
      updatedAt: new Date().toISOString()
    }, index)
  );
  leads[index] = next;
  await writeLeads(leads);
  return { previous, lead: next };
}

export async function createLead(input = {}) {
  const leads = await readLeads();
  const now = new Date().toISOString();
  const lead = scoreLeadRecord(normalizeLead({
    ...input,
    id: input.id || `tcp-${Date.now()}`,
    createdAt: now,
    updatedAt: now
  }, leads.length));
  await writeLeads([...leads, lead]);
  return lead;
}

export async function deleteLead(id) {
  const leads = await readLeads();
  const index = leads.findIndex((lead) => lead.id === id);
  if (index === -1) return null;
  const [deleted] = leads.splice(index, 1);
  await writeLeads(leads);
  return deleted;
}

export function getLeadStats(leads) {
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
