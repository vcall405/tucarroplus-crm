export const STATUS_OPTIONS = ['nuevo', 'contactado', 'cita', 'negociando', 'vendido', 'perdido'];

export function isFollowUpPending(lead) {
  return !['vendido', 'perdido'].includes(lead.status);
}

export function getNextAction(lead) {
  const actions = {
    nuevo: 'Hacer primer contacto',
    contactado: 'Dar seguimiento',
    cita: lead.apptDate ? 'Confirmar cita' : 'Agendar cita',
    negociando: 'Continuar negociacion'
  };
  return actions[lead.status] || 'Revisar lead';
}

const STATUS_POINTS = {
  nuevo: 10,
  contactado: 24,
  cita: 42,
  negociando: 60,
  vendido: 96,
  perdido: 8
};

const SOURCE_POINTS = {
  referido: 16,
  showroom: 14,
  whatsapp: 12,
  llamada: 10,
  facebook: 8,
  anuncio: 7,
  prospeccion: 5
};

export function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function normalizeLead(input = {}, index = 0) {
  const now = new Date().toISOString();
  const status = STATUS_OPTIONS.includes(String(input.status || '').toLowerCase())
    ? String(input.status).toLowerCase()
    : 'nuevo';
  const source = String(input.source || input.fuente || 'facebook').toLowerCase();
  const createdAt = input.createdAt || input.created_at || now;
  const updatedAt = input.updatedAt || input.updated_at || now;

  return {
    id: String(input.id || input.leadId || input.lead_id || `lead-${String(index + 1).padStart(3, '0')}`),
    name: input.name || input.nombre || 'Lead sin nombre',
    phone: input.phone || input.telefono || input.tel || '',
    email: input.email || '',
    vendor: input.vendor || input.vendedor || process.env.VENDOR_DEFAULT || 'Miguel',
    vehicle: input.vehicle || input.vehiculo || input.auto || '',
    source,
    campaign: input.campaign || input.campana || input.campaignName || '',
    notes: input.notes || input.notas || '',
    status,
    apptDate: input.apptDate || input.fechaCita || '',
    apptTime: input.apptTime || input.horaCita || '',
    lossReason: input.lossReason || input.razonPerdida || '',
    isRepeatContact: Boolean(input.isRepeatContact || input.repetido || false),
    phoneValidated: input.phoneValidated ?? input.telefonoValidado ?? Boolean(input.phone || input.telefono || input.tel),
    conversionProbability: Number.isFinite(Number(input.conversionProbability))
      ? Number(input.conversionProbability)
      : undefined,
    score: Number.isFinite(Number(input.score)) ? Number(input.score) : undefined,
    createdAt,
    updatedAt
  };
}

export function scoreLead(lead) {
  const status = STATUS_OPTIONS.includes(lead.status) ? lead.status : 'nuevo';
  let score = STATUS_POINTS[status] ?? 10;

  score += SOURCE_POINTS[lead.source] ?? 4;
  if (lead.phoneValidated) score += 8;
  if (lead.vehicle) score += 7;
  if (lead.campaign) score += 4;
  if (lead.notes && lead.notes.length > 30) score += 4;
  if (lead.isRepeatContact) score += 5;
  if (lead.apptDate) score += 10;
  if (lead.lossReason) score -= 18;

  const daysOpen = Math.max(0, (Date.now() - new Date(lead.createdAt).getTime()) / 86400000 || 0);
  if (daysOpen > 14 && !['vendido', 'perdido'].includes(status)) score -= 8;
  if (daysOpen > 30 && !['vendido', 'perdido'].includes(status)) score -= 8;

  return clampScore(score);
}

export function scoreLeadRecord(lead) {
  const score = scoreLead(lead);
  return {
    ...lead,
    score,
    conversionProbability: Number((score / 100).toFixed(2)),
    kumoScoreUpdated: new Date().toISOString()
  };
}

export function scoreLeads(leads) {
  return leads.map((lead) => scoreLeadRecord(normalizeLead(lead)));
}
