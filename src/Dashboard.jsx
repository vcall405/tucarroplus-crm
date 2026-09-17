import { useEffect, useMemo, useState } from 'react';
import { createLead, deleteLead, fetchLeads, updateLead } from './api.js';
import LeadBoard from './LeadBoard.jsx';
import LeadDetail from './LeadDetail.jsx';
import LeadForm from './LeadForm.jsx';
import LeadList from './LeadList.jsx';
import { getNextAction, isFollowUpPending } from './utils/leadScoring.js';

const statusOrder = ['todos', 'nuevo', 'contactado', 'cita', 'negociando', 'vendido', 'perdido'];
const emptyLead = { status: 'nuevo', source: 'facebook', vendor: 'Miguel' };
const sourceLabels = {
  anuncio: 'Anuncio pagado',
  facebook: 'Facebook organico',
  whatsapp: 'WhatsApp',
  llamada: 'Llamada',
  prospeccion: 'Prospeccion telefonica',
  referido: 'Referido',
  showroom: 'Showroom'
};

function getSourceLabel(source) {
  return sourceLabels[source] || source || 'Sin fuente';
}

function escapeCsv(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

export default function Dashboard() {
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({ total: 0, scored: 0, averageScore: 0, hotLeads: 0, byStatus: {} });
  const [selectedId, setSelectedId] = useState('');
  const [detailMinimized, setDetailMinimized] = useState(false);
  const [filter, setFilter] = useState('todos');
  const [sourceFilter, setSourceFilter] = useState('');
  const [query, setQuery] = useState('');
  const [theme, setTheme] = useState(() => window.localStorage.getItem('tucarroplus-theme') || 'dark');
  const [vendorFilter, setVendorFilter] = useState('');
  const [viewMode, setViewMode] = useState(() => window.localStorage.getItem('tucarroplus-view') || 'board');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    try {
      const data = await fetchLeads();
      setLeads(data.leads);
      setStats(data.stats);
      setSelectedId((current) => data.leads.some((lead) => lead.id === current) ? current : '');
      setError('');
    } catch (err) {
      setError('No pude conectar con el servidor del CRM.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('tucarroplus-theme', theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem('tucarroplus-view', viewMode);
  }, [viewMode]);

  const sourceOptions = useMemo(() => (
    [...new Set(leads.map((lead) => lead.source).filter(Boolean))]
      .sort((a, b) => getSourceLabel(a).localeCompare(getSourceLabel(b), 'es'))
  ), [leads]);

  const vendorOptions = useMemo(() => (
    [...new Set(leads.map((lead) => lead.vendor).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'))
  ), [leads]);

  const filtered = useMemo(() => {
    return leads.filter((lead) => {
      const matchesStatus = filter === 'todos'
        || (filter === 'pendientes' ? isFollowUpPending(lead) : lead.status === filter);
      const matchesSource = !sourceFilter || lead.source === sourceFilter;
      const matchesVendor = !vendorFilter || lead.vendor === vendorFilter;
      const text = `${lead.name} ${lead.phone} ${lead.vehicle} ${lead.campaign}`.toLowerCase();
      return matchesStatus && matchesSource && matchesVendor && text.includes(query.toLowerCase());
    });
  }, [leads, filter, query, sourceFilter, vendorFilter]);

  const pendingCount = leads.filter(isFollowUpPending).length;
  const selected = filtered.find((lead) => lead.id === selectedId) || filtered[0] || null;

  function exportCsv() {
    const headers = ['Nombre', 'Telefono', 'Email', 'Vehiculo', 'Fuente', 'Status', 'Proxima accion', 'Score', 'Notas'];
    const rows = filtered.map((lead) => [
      lead.name, lead.phone, lead.email, lead.vehicle, getSourceLabel(lead.source), lead.status,
      getNextAction(lead),
      lead.score, lead.notes
    ]);
    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tucarroplus-leads.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleSave(payload) {
    setSaving(true);
    try {
      const data = await updateLead(payload.id, payload);
      setLeads((current) => current.map((lead) => lead.id === data.lead.id ? data.lead : lead));
      setSelectedId(data.lead.id);
      setDetailMinimized(false);
      await load();
      setError('');
    } catch {
      setError('No se pudo guardar el lead.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate(payload) {
    setSaving(true);
    try {
      const data = await createLead(payload);
      setShowCreate(false);
      setSelectedId(data.lead.id);
      setDetailMinimized(false);
      await load();
      setError('');
    } catch {
      setError('No se pudo crear el lead.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(lead) {
    if (!window.confirm(`¿Eliminar a ${lead.name}? Esta acción no se puede deshacer.`)) return;
    setDeleting(true);
    try {
      await deleteLead(lead.id);
      setSelectedId('');
      setDetailMinimized(false);
      await load();
      setError('');
    } catch {
      setError('No se pudo eliminar el lead.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main>
      <header className="topbar">
        <div>
          <span className="eyebrow">Tucarroplus</span>
          <h1>CRM de leads</h1>
        </div>
        <div className="actions">
          <select
            aria-label="Filtrar por fuente"
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.target.value)}
          >
            <option value="">Toda fuente</option>
            {sourceOptions.map((source) => <option key={source} value={source}>{getSourceLabel(source)}</option>)}
          </select>
          <select aria-label="Filtrar por vendedor" value={vendorFilter} onChange={(event) => setVendorFilter(event.target.value)}>
            <option value="">Todo vendedor</option>
            {vendorOptions.map((vendor) => <option key={vendor} value={vendor}>{vendor}</option>)}
          </select>
          <input
            aria-label="Buscar leads"
            placeholder="Buscar por nombre, telefono o vehiculo"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button onClick={exportCsv}>Exportar CSV</button>
          <button onClick={() => setShowCreate(true)}>+ Nuevo lead</button>
          <button onClick={load}>Refrescar</button>
          <button className="theme-toggle" onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          </button>
        </div>
      </header>

      <section className="metrics">
        <article><span>Total leads</span><strong>{stats.total}</strong></article>
        <article><span>Pendientes</span><strong>{pendingCount}</strong></article>
        <article><span>Scored</span><strong>{stats.scored}</strong></article>
        <article><span>Score promedio</span><strong>{stats.averageScore}</strong></article>
        <article><span>Alta prioridad</span><strong>{stats.hotLeads}</strong></article>
      </section>

      <nav className="filters" aria-label="Filtros de status">
        <button
          className={`followup-filter ${filter === 'pendientes' ? 'active' : ''}`}
          onClick={() => setFilter('pendientes')}
        >
          Pendientes por seguimiento
          <span>{pendingCount}</span>
        </button>
        {statusOrder.map((status) => (
          <button
            key={status}
            className={filter === status ? 'active' : ''}
            onClick={() => setFilter(status)}
          >
            {status === 'todos' ? 'Todos' : status}
            <span>{status === 'todos' ? stats.total : stats.byStatus?.[status] || 0}</span>
          </button>
        ))}
      </nav>

      {error && <p className="error">{error}</p>}
      {loading ? <p className="loading">Cargando leads...</p> : (
        <section className="workspace">
          <div className="lead-area">
            <div className="view-toolbar" aria-label="Vista de leads">
              <button className={viewMode === 'board' ? 'active' : ''} onClick={() => setViewMode('board')}>Tablero</button>
              <button className={viewMode === 'table' ? 'active' : ''} onClick={() => setViewMode('table')}>Tabla</button>
            </div>
            {viewMode === 'board' ? (
              <LeadBoard leads={filtered} selectedId={selected?.id} onSelect={(lead) => { setSelectedId(lead.id); setDetailMinimized(false); }} />
            ) : (
              <LeadList leads={filtered} selectedId={selected?.id} onSelect={(lead) => { setSelectedId(lead.id); setDetailMinimized(false); }} />
            )}
          </div>
          {showCreate ? (
            <aside className={`detail detail-panel${detailMinimized ? ' minimized' : ''}`}>
              <div className="detail-panel-bar">
                <strong>Nuevo lead</strong>
                <button type="button" aria-label={detailMinimized ? 'Expandir panel' : 'Minimizar panel'} onClick={() => setDetailMinimized((value) => !value)}>
                  {detailMinimized ? 'Expandir' : 'Minimizar'}
                </button>
              </div>
              {!detailMinimized && <LeadForm
                isNew
                lead={emptyLead}
                onSave={handleCreate}
                onCancel={() => setShowCreate(false)}
                saving={saving}
              />}
            </aside>
          ) : selected ? (
            <LeadDetail
              lead={selected}
              onSave={handleSave}
              onDelete={handleDelete}
              saving={saving}
              deleting={deleting}
              minimized={detailMinimized}
              onToggleMinimized={() => setDetailMinimized((value) => !value)}
            />
          ) : null}
        </section>
      )}
    </main>
  );
}
