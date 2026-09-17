import LeadForm from './LeadForm.jsx';
import ScoreCard from './ScoreCard.jsx';

export default function LeadDetail({ lead, onSave, onDelete, saving, deleting, minimized, onToggleMinimized }) {
  if (!lead) {
    return null;
  }

  return (
    <aside className={`detail detail-panel${minimized ? ' minimized' : ''}`} aria-label={`Detalle de ${lead.name}`}>
      <div className="detail-panel-bar">
        <strong className="detail-panel-title">{minimized ? lead.name : 'Detalle del lead'}</strong>
        <button type="button" aria-label={minimized ? 'Expandir detalle' : 'Minimizar detalle'} onClick={onToggleMinimized}>
          {minimized ? 'Expandir' : 'Minimizar'}
        </button>
      </div>

      {!minimized && <>
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
      </>}
    </aside>
  );
}
