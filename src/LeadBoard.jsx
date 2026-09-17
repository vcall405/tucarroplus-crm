import { getNextAction } from './utils/leadScoring.js';

const boardColumns = [
  ['nuevo', 'Nuevo'],
  ['contactado', 'Contactado'],
  ['cita', 'Cita agendada'],
  ['negociando', 'Negociando'],
  ['vendido', 'Vendido'],
  ['perdido', 'Perdido']
];

const sourceLabels = {
  anuncio: 'Anuncio pagado',
  facebook: 'Facebook organico',
  whatsapp: 'WhatsApp',
  llamada: 'Llamada',
  prospeccion: 'Prospeccion telefonica',
  referido: 'Referido',
  showroom: 'Showroom'
};

export default function LeadBoard({ leads, selectedId, onSelect }) {
  return (
    <section className="lead-board" aria-label="Tablero de leads">
      {boardColumns.map(([status, label]) => {
        const columnLeads = leads.filter((lead) => lead.status === status);
        return (
          <div className="board-column" key={status}>
            <header className="board-column-head">
              <h3>{label}</h3>
              <span>{columnLeads.length}</span>
            </header>
            <div className="board-column-body">
              {columnLeads.length ? columnLeads.map((lead) => (
                <article
                  className={`lead-card ${lead.id === selectedId ? 'selected' : ''}`}
                  key={lead.id}
                  onClick={() => onSelect(lead)}
                >
                  <strong>{lead.name}</strong>
                  <p>{lead.vehicle || 'Vehiculo por definir'}</p>
                  <small>Vendedor: {lead.vendor || 'Miguel'}</small>
                  <div className="lead-card-meta">
                    <span className={`source-chip source-${lead.source}`}>{sourceLabels[lead.source] || lead.source}</span>
                    <span className="lead-score">{lead.score || 0}</span>
                  </div>
                  <span className="next-action">{getNextAction(lead)}</span>
                </article>
              )) : <p className="board-empty">Sin leads</p>}
            </div>
          </div>
        );
      })}
    </section>
  );
}
