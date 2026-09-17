import LeadForm from './LeadForm.jsx';
import ScoreCard from './ScoreCard.jsx';

export default function LeadDetail({ lead, onSave, onDelete, saving, deleting }) {
  if (!lead) {
    return (
      <aside className="detail empty">
        <p>Selecciona un lead para ver detalles.</p>
      </aside>
    );
  }

  return (
    <aside className="detail">
      <div className="detail-head">
        <div>
          <span className="eyebrow">Detalle del lead</span>
          <h2>{lead.name}</h2>
          <p>{lead.vehicle || 'Vehiculo por definir'}</p>
        </div>
        <ScoreCard score={lead.score || 0} />
      </div>

      <dl className="facts">
        <div><dt>Telefono</dt><dd>{lead.phone || 'Sin telefono'}</dd></div>
        <div><dt>Vendedor</dt><dd>{lead.vendor}</dd></div>
        <div><dt>Fuente</dt><dd>{lead.source}</dd></div>
        <div><dt>Campana</dt><dd>{lead.campaign || 'Sin campana'}</dd></div>
        <div><dt>Ultima actualizacion</dt><dd>{new Date(lead.updatedAt).toLocaleString('es-US')}</dd></div>
      </dl>

      <LeadForm lead={lead} onSave={onSave} saving={saving} />
      <button className="danger" type="button" onClick={() => onDelete(lead)} disabled={deleting}>
        {deleting ? 'Eliminando...' : 'Eliminar lead'}
      </button>
    </aside>
  );
}
