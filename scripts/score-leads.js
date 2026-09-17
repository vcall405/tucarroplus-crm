import { getLeadStats, scoreStoredLeads } from '../src/utils/leadStore.js';

const leads = await scoreStoredLeads();
console.log(JSON.stringify({
  message: 'Scoring completado',
  stats: getLeadStats(leads)
}, null, 2));
