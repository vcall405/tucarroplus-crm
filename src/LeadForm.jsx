import { useEffect, useState } from 'react';
import { STATUS_OPTIONS } from './utils/leadScoring.js';

const statusLabels = {
  nuevo: 'Nuevo',
  contactado: 'Contactado',
  cita: 'Cita',
  negociando: 'Negociando',
  vendido: 'Vendido',
  perdido: 'Perdido'
};

export default function LeadForm({ lead, onSave, saving }) {
  const [form, setForm] = useState(lead);

  useEffect(() => {
    setForm(lead);
  }, [lead]);

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <form className="lead-form" onSubmit={(event) => {
      event.preventDefault();
      onSave(form);
    }}>
      <label>
        Status
        <select value={form.status} onChange={(event) => setField('status', event.target.value)}>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>{statusLabels[status]}</option>
          ))}
        </select>
      </label>

      <label>
        Fecha cita
        <input type="date" value={form.apptDate || ''} onChange={(event) => setField('apptDate', event.target.value)} />
      </label>

      <label>
        Hora cita
        <input type="time" value={form.apptTime || ''} onChange={(event) => setField('apptTime', event.target.value)} />
      </label>

      <label>
        Razon perdido
        <select value={form.lossReason || ''} onChange={(event) => setField('lossReason', event.target.value)}>
          <option value="">No aplica</option>
          <option value="precio">Precio</option>
          <option value="otro_dealer">Otro dealer</option>
          <option value="financiamiento">Financiamiento</option>
          <option value="no_contesta">No contesta</option>
          <option value="otro">Otro</option>
        </select>
      </label>

      <label className="wide">
        Notas
        <textarea value={form.notes || ''} onChange={(event) => setField('notes', event.target.value)} rows="5" />
      </label>

      <button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Actualizar lead'}</button>
    </form>
  );
}
