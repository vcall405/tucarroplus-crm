import fs from 'node:fs/promises';
import path from 'node:path';
import { readLeads } from '../src/utils/leadStore.js';

const leads = await readLeads();
const trainingData = {
  leads: leads.map((lead, index) => ({
    lead_id: index + 1,
    created_at: lead.createdAt,
    converted: lead.status === 'vendido',
    days_to_close: ['vendido', 'perdido'].includes(lead.status)
      ? Math.max(0, Math.round((new Date(lead.updatedAt) - new Date(lead.createdAt)) / 86400000))
      : null,
    vendor: lead.vendor
  })),
  interactions: leads.map((lead, index) => ({
    lead_id: index + 1,
    interaction_date: lead.updatedAt,
    status_change: lead.status,
    days_since_creation: Math.max(0, Math.round((new Date(lead.updatedAt) - new Date(lead.createdAt)) / 86400000))
  })),
  vehicles_viewed: leads.map((lead, index) => ({
    lead_id: index + 1,
    vehicle_name: lead.vehicle || 'por definir',
    vehicle_price: null,
    vehicle_type: lead.vehicle?.toLowerCase().includes('rav4') ? 'suv' : 'unknown'
  })),
  lead_context: leads.map((lead, index) => ({
    lead_id: index + 1,
    source: lead.source,
    campaign: lead.campaign,
    is_repeat_contact: lead.isRepeatContact,
    phone_validated: lead.phoneValidated
  }))
};

const output = path.resolve(process.cwd(), 'ml/data/training-data.json');
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, `${JSON.stringify(trainingData, null, 2)}\n`);
console.log(`Training data exportado: ${output}`);
