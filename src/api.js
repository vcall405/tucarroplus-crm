import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || ''
});

export async function fetchLeads() {
  const { data } = await api.get('/api/leads');
  return data;
}

export async function updateLead(id, payload) {
  const { data } = await api.patch(`/api/leads/${id}`, payload);
  return data;
}
