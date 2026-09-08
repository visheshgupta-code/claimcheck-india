import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyzeCase } from '../src/analyzer.mjs';

const corpus = JSON.parse(readFileSync(new URL('../data/evaluation/organisations-100.json', import.meta.url)));

test('the real-organisation corpus has 100 unique attributed and timestamped excerpts', () => {
  assert.equal(corpus.length, 100);
  assert.equal(new Set(corpus.map(c => c.company)).size, 100);
  for (const c of corpus) {
    assert.equal(c.status, 'collected');
    assert.ok(c.excerpt.split(/\s+/).length <= 25);
    assert.match(c.pageSha256, /^[a-f0-9]{64}$/);
    assert.ok(Number.isFinite(Date.parse(c.retrievedAt)));
    assert.match(c.sourceUrl, /^https?:\/\//);
  }
});

test('all 100 source excerpts remain intact and cannot act as their own evidence', () => {
  for (const c of corpus) {
    for (const label of ['Claim source', 'Website excerpt']) {
      const result = analyzeCase({ company: c.company, claims: c.excerpt, evidenceNotes: `${label} | ${c.sourceUrl} | ${c.excerpt}` });
      assert.equal(result.findings.length, 1, c.company);
      assert.equal(result.findings[0].claim, c.excerpt, c.company);
      assert.ok(!['supported', 'partially-supported'].includes(result.findings[0].status), c.company);
    }
  }
});
