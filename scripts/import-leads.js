import fs from 'node:fs/promises';
import path from 'node:path';
import { importLeads } from '../src/utils/leadStore.js';

const inputPath = process.argv[2];

if (!inputPath) {
  console.error('Uso: npm run import:leads -- leads.json');
  process.exit(1);
}

const file = path.resolve(process.cwd(), inputPath);
const raw = await fs.readFile(file, 'utf8');
const parsed = JSON.parse(raw);
const leads = Array.isArray(parsed) ? parsed : parsed.leads;

if (!Array.isArray(leads)) {
  console.error('El archivo debe ser un array JSON o un objeto con propiedad "leads".');
  process.exit(1);
}

const imported = await importLeads(leads);
console.log(`Importados ${imported.length} leads en ml/data/leads.json`);
