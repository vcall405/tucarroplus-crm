import ScoreCard from './ScoreCard.jsx';
import { getNextAction } from './utils/leadScoring.js';

const statusLabels = {
  nuevo: 'Nuevo',
  contactado: 'Contactado',
  cita: 'Cita',
  negociando: 'Negociando',
  vendido: 'Vendido',
  perdido: 'Perdido'
};

export default function LeadList({ leads, selectedId, onSelect }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Lead</th>
            <th>Vehiculo</th>
            <th>Fuente</th>
            <th>Status</th>
            <th>Proxima accion</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr
              key={lead.id}
              className={lead.id === selectedId ? 'selected' : ''}
              onClick={() => onSelect(lead)}
            >
              <td>
                <strong>{lead.name}</strong>
                <small>{lead.phone || 'Sin telefono'}</small>
              </td>
              <td>{lead.vehicle || 'Por definir'}</td>
              <td>{lead.source}</td>
              <td>
                <span className={`pill ${lead.status}`}>{statusLabels[lead.status] || lead.status}</span>
              </td>
              <td><span className="next-action">{getNextAction(lead)}</span></td>
              <td><ScoreCard score={lead.score || 0} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
