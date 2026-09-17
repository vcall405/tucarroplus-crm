import { readLeads } from '../src/utils/leadStore.js';
import { scoreLeadRecord } from '../src/utils/leadScoring.js';

const leadIdArg = process.argv.find((arg) => arg.startsWith('--lead-id='));
const leadId = leadIdArg?.split('=')[1];
const leads = await readLeads();

if (leadId) {
  const lead = leads.find((item) => item.id === leadId);
  if (!lead) {
    console.error(`Lead no encontrado: ${leadId}`);
    process.exit(1);
  }
  const scored = scoreLeadRecord(lead);
  console.log(JSON.stringify({
    prediction: scored.score >= 55 ? 'vendido' : 'no_convertido',
    probability: scored.conversionProbability,
    score: scored.score
  }, null, 2));
} else {
  console.log(JSON.stringify(leads.map(scoreLeadRecord), null, 2));
}
