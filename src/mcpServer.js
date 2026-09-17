import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createLead, deleteLead, getLeadStats, readLeads, updateLead } from './utils/leadStore.js';
import { getNextAction, isFollowUpPending, scoreLeadRecord } from './utils/leadScoring.js';

const responseFormat = z.enum(['json', 'markdown']).default('markdown');

function result(value, format = 'json') {
  const text = format === 'markdown' ? `\n${JSON.stringify(value, null, 2)}\n` : JSON.stringify(value);
  return { content: [{ type: 'text', text }], structuredContent: value };
}

function registerLeadTools(server) {
  server.registerTool('tucarroplus_list_leads', {
    title: 'Listar leads de Tucarroplus',
    description: 'Lista leads con filtros opcionales de status, fuente, vendedor y seguimiento pendiente. Solo lectura.',
    inputSchema: {
      status: z.enum(['todos', 'nuevo', 'contactado', 'cita', 'negociando', 'vendido', 'perdido']).default('todos'),
      source: z.string().max(80).optional(),
      vendor: z.string().max(120).optional(),
      pending_only: z.boolean().default(false),
      query: z.string().max(200).optional(),
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).default(0),
      response_format: responseFormat
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  }, async ({ status, source, vendor, pending_only, query, limit, offset, response_format }) => {
    const all = await readLeads();
    const normalizedQuery = query?.toLowerCase();
    const filtered = all.filter((lead) => {
      const matchesStatus = status === 'todos' || lead.status === status;
      const matchesPending = !pending_only || isFollowUpPending(lead);
      const matchesSource = !source || lead.source === source;
      const matchesVendor = !vendor || lead.vendor === vendor;
      const searchable = `${lead.name} ${lead.phone} ${lead.vehicle} ${lead.campaign}`.toLowerCase();
      return matchesStatus && matchesPending && matchesSource && matchesVendor && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
    const leads = filtered.slice(offset, offset + limit).map((lead) => ({ ...lead, nextAction: getNextAction(lead) }));
    const output = { total: filtered.length, count: leads.length, offset, leads, has_more: offset + leads.length < filtered.length };
    return result(output, response_format);
  });

  server.registerTool('tucarroplus_get_stats', {
    title: 'Ver estadísticas del CRM',
    description: 'Devuelve totales, estados, score promedio, leads prioritarios y pendientes de seguimiento. Solo lectura.',
    inputSchema: { response_format: responseFormat },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  }, async ({ response_format }) => {
    const leads = await readLeads();
    const stats = getLeadStats(leads);
    return result({ ...stats, pendingFollowUp: leads.filter(isFollowUpPending).length }, response_format);
  });

  server.registerTool('tucarroplus_get_lead', {
    title: 'Consultar un lead',
    description: 'Busca un lead por su ID exacto y devuelve sus datos actuales. Solo lectura.',
    inputSchema: { id: z.string().min(1).max(120).describe('ID exacto del lead'), response_format: responseFormat },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  }, async ({ id, response_format }) => {
    const lead = (await readLeads()).find((item) => item.id === id);
    if (!lead) return { isError: true, content: [{ type: 'text', text: `Lead no encontrado: ${id}` }] };
    return result({ lead, nextAction: getNextAction(lead) }, response_format);
  });

  const leadFields = {
    name: z.string().min(1).max(160).optional(), phone: z.string().max(60).optional(), email: z.string().email().or(z.literal('')).optional(),
    vendor: z.string().max(120).optional(), vehicle: z.string().max(160).optional(), source: z.string().max(80).optional(),
    campaign: z.string().max(160).optional(), notes: z.string().max(5000).optional(),
    status: z.enum(['nuevo', 'contactado', 'cita', 'negociando', 'vendido', 'perdido']).optional(),
    apptDate: z.string().max(30).optional(), apptTime: z.string().max(30).optional(), lossReason: z.string().max(160).optional()
  };

  server.registerTool('tucarroplus_create_lead', {
    title: 'Crear lead',
    description: 'Crea un lead en Tucarroplus y calcula automáticamente su score.',
    inputSchema: { ...leadFields, name: z.string().min(1).max(160), phone: z.string().max(60).optional(), response_format: responseFormat },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
  }, async ({ response_format, ...payload }) => result({ lead: await createLead(payload) }, response_format));

  server.registerTool('tucarroplus_update_lead', {
    title: 'Actualizar lead',
    description: 'Actualiza campos de un lead, recalcula su score y devuelve la próxima acción recomendada.',
    inputSchema: { id: z.string().min(1).max(120), ...leadFields, response_format: responseFormat },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
  }, async ({ id, response_format, ...patch }) => {
    const updated = await updateLead(id, patch);
    if (!updated) return { isError: true, content: [{ type: 'text', text: `Lead no encontrado: ${id}` }] };
    return result({ lead: updated.lead, previousStatus: updated.previous.status, nextAction: getNextAction(updated.lead) }, response_format);
  });

  server.registerTool('tucarroplus_delete_lead', {
    title: 'Eliminar lead',
    description: 'Elimina un lead. Requiere confirmar el nombre exacto para evitar borrados accidentales.',
    inputSchema: { id: z.string().min(1).max(120), confirm_name: z.string().min(1).max(160) },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false }
  }, async ({ id, confirm_name }) => {
    const lead = (await readLeads()).find((item) => item.id === id);
    if (!lead) return { isError: true, content: [{ type: 'text', text: `Lead no encontrado: ${id}` }] };
    if (lead.name !== confirm_name) return { isError: true, content: [{ type: 'text', text: 'Confirmación rechazada: confirm_name debe coincidir exactamente con el nombre del lead.' }] };
    return result({ ok: true, lead: await deleteLead(id) }, 'json');
  });

  server.registerTool('tucarroplus_score_lead', {
    title: 'Calcular score de lead',
    description: 'Calcula score y probabilidad de conversión sin guardar cambios.',
    inputSchema: { ...leadFields },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  }, async (payload) => result(scoreLeadRecord(payload), 'json'));
}

export function createMcpServer() {
  const server = new McpServer({ name: 'tucarroplus-mcp-server', version: '1.0.0' });
  registerLeadTools(server);
  return server;
}
