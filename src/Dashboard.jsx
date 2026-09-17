import { useEffect, useMemo, useState } from 'react';
import { fetchLeads, updateLead } from './api.js';
import LeadDetail from './LeadDetail.jsx';
import LeadList from './LeadList.jsx';

const statusOrder = ['todos', 'nuevo', 'contactado', 'cita', 'negociando', 'vendido', 'perdido'];

export default function Dashboard() {
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({ total: 0, scored: 0, averageScore: 0, hotLeads: 0, byStatus: {} });
  const [selectedId, setSelectedId] = useState('');
  const [filter, setFilter] = useState('todos');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    try {
      const data = await fetchLeads();
      setLeads(data.leads);
      setStats(data.stats);
      setSelectedId((current) => current || data.leads[0]?.id || '');
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

  const filtered = useMemo(() => {
    return leads.filter((lead) => {
      const matchesStatus = filter === 'todos' || lead.status === filter;
      const text = `${lead.name} ${lead.phone} ${lead.vehicle} ${lead.campaign}`.toLowerCase();
      return matchesStatus && text.includes(query.toLowerCase());
    });
  }, [leads, filter, query]);

  const selected = leads.find((lead) => lead.id === selectedId) || filtered[0] || null;

  async function handleSave(payload) {
    setSaving(true);
    try {
      const data = await updateLead(payload.id, payload);
      setLeads((current) => current.map((lead) => lead.id === data.lead.id ? data.lead : lead));
      setSelectedId(data.lead.id);
      await load();
    } finally {
      setSaving(false);
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
          <input
            aria-label="Buscar leads"
            placeholder="Buscar por nombre, telefono o vehiculo"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button onClick={load}>Refrescar</button>
        </div>
      </header>

      <section className="metrics">
        <article><span>Total leads</span><strong>{stats.total}</strong></article>
        <article><span>Scored</span><strong>{stats.scored}</strong></article>
        <article><span>Score promedio</span><strong>{stats.averageScore}</strong></article>
        <article><span>Alta prioridad</span><strong>{stats.hotLeads}</strong></article>
      </section>

      <nav className="filters" aria-label="Filtros de status">
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
          <LeadList leads={filtered} selectedId={selected?.id} onSelect={(lead) => setSelectedId(lead.id)} />
          <LeadDetail lead={selected} onSave={handleSave} saving={saving} />
        </section>
      )}
    </main>
  );
}
