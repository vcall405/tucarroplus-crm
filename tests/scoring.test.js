import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLead, scoreLeadRecord } from '../src/utils/leadScoring.js';

test('scores leads between 0 and 100', () => {
  const lead = scoreLeadRecord(normalizeLead({
    name: 'Carlos Medina',
    phone: '787-555-0101',
    vehicle: '2025 Toyota RAV4',
    source: 'referido',
    status: 'negociando',
    apptDate: '2026-09-20'
  }));

  assert.equal(lead.name, 'Carlos Medina');
  assert.ok(lead.score >= 0);
  assert.ok(lead.score <= 100);
  assert.equal(lead.conversionProbability, lead.score / 100);
});
