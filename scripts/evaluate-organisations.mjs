import { readFileSync, writeFileSync } from 'node:fs';
import { analyzeCase } from '../src/analyzer.mjs';
import { analyzeCase as baseline } from '../data/evaluation/analyzer-baseline.mjs';
import { getIndiaContext } from '../src/india-context.mjs';

const root = new URL('../', import.meta.url);
const corpus = JSON.parse(readFileSync(new URL('data/evaluation/organisations-100.json', root)));
if (corpus.length !== 100 || new Set(corpus.map(c => c.company)).size !== 100) {
  throw new Error(`Need 100 distinct successfully collected organisations; have ${corpus.length}.`);
}

function run(engine, organisation, mode) {
  const input = { company: organisation.company, claims: organisation.excerpt, marketContext: organisation.marketContext };
  // These are controlled evidence-handling probes, not additional company facts.
  if (mode === 'labelled-source') input.evidenceNotes = `Claim source | ${organisation.sourceUrl} | ${organisation.excerpt}`;
  if (mode === 'unlabelled-echo') input.evidenceNotes = `Website excerpt | ${organisation.sourceUrl} | ${organisation.excerpt}`;
  if (mode === 'gap') input.evidenceNotes = `Evidence gap | ${organisation.sourceUrl} | No independent evidence was reviewed.`;
  return engine({ ...input, indiaContext: getIndiaContext(input) });
}

const modes = ['gap', 'labelled-source', 'unlabelled-echo'];
const records = corpus.map((organisation, index) => {
  const before = Object.fromEntries(modes.map(mode => [mode, run(baseline, organisation, mode)]));
  const after = Object.fromEntries(modes.map(mode => [mode, run(analyzeCase, organisation, mode)]));
  const notes = [];
  for (const mode of modes.slice(1)) {
    const unsupportedBefore = before[mode].findings.filter(f => ['supported', 'partially-supported'].includes(f.status)).length;
    const unsupportedAfter = after[mode].findings.filter(f => ['supported', 'partially-supported'].includes(f.status)).length;
    if (unsupportedBefore) notes.push(`${mode}: ${unsupportedBefore} finding(s) received a support label from repeated marketing text; ${unsupportedAfter} after correction.`);
  }
  const originalCategories = new Set(before.gap.findings.flatMap(f => f.categories.map(c => c.id)));
  const finalCategories = new Set(after.gap.findings.flatMap(f => f.categories.map(c => c.id)));
  for (const category of originalCategories) if (!finalCategories.has(category)) notes.push(`Removed the ${category} trigger after applying contextual rules; analyst review still required.`);
  for (const category of finalCategories) if (!originalCategories.has(category)) notes.push(`Added the ${category} review category to cover a previously missed phrase.`);
  if (!notes.length) notes.push('No new rule defect demonstrated by this excerpt; retain source provenance and require supporting evidence.');
  if (organisation.excerptTruncated) notes.push('Excerpt is a 25-word prefix; inspect the full source before interpreting qualifications.');
  return { number: index + 1, ...organisation, before, after, reviewNotes: notes };
});

const supported = (version, mode) => records.reduce((n, r) => n + r[version][mode].findings.filter(f => ['supported', 'partially-supported'].includes(f.status)).length, 0);
const failedProbeCases = version => records.reduce((n, r) => n + modes.slice(1).filter(mode => r[version][mode].findings.some(f => ['supported', 'partially-supported'].includes(f.status))).length, 0);
const summary = {
  runAt: new Date().toISOString(), organisations: records.length,
  claims: records.reduce((n, r) => n + r.after.gap.findings.length, 0),
  evaluationsPerVersion: records.length * modes.length,
  evidenceProbeFailuresBefore: supported('before', 'labelled-source') + supported('before', 'unlabelled-echo'),
  evidenceProbeFailuresAfter: supported('after', 'labelled-source') + supported('after', 'unlabelled-echo'),
  evidenceProbeCasesBefore: failedProbeCases('before'),
  evidenceProbeCasesAfter: failedProbeCases('after'),
  categoryChangedOrganisations: records.filter(r => JSON.stringify(r.before.gap.findings.map(f => f.categories)) !== JSON.stringify(r.after.gap.findings.map(f => f.categories))).length,
  scope: 'Public marketing excerpts and controlled evidence-handling probes. No independent verification or labelled compliance ground truth. Brands and legal entities are not necessarily equivalent.',
  notes: 'This is a development corpus, not a held-out accuracy benchmark. Quantitative scores are review priorities for excerpts, not organisation ratings.'
};
writeFileSync(new URL('data/evaluation/batch-results.json', root), JSON.stringify({ summary, records }, null, 2));
const escape = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const categories = result => [...new Set(result.findings.flatMap(f => f.categories.map(c => c.label)))].join(', ') || 'General substantiation';
const lessons = [
  'Repeated marketing text is now identified as a claim source and cannot substantiate itself, whether or not the evidence title declares its role.',
  'One claim per line preserves No. 1 rankings and decimal numbers. No. 1 and #1 are now recognised as superlatives.',
  'GST/tax returns, registered mobile numbers, suitability questions and brand names are handled in context to reduce incorrect categories.',
  'Added coverage for pricing, adoption figures, absolute security claims and qualified instant-loan language.',
  'Mismatched figures and Indian units cannot provide lexical support. This is conservative matching, not financial reconciliation.',
  'Customer identity and financial-information wording now trigger data-use review; ordinary support channels do not trigger investment-tip rules.'
];
const rows = records.map(r => `<tr id="organisation-${r.number}"><td class="number">${String(r.number).padStart(2, '0')}</td><td><strong>${escape(r.company)}</strong><small>${escape(r.marketContext)}</small><a href="${escape(r.sourceUrl)}" target="_blank" rel="noreferrer">Original source ↗</a><small>Retrieved ${escape(r.retrievedAt.slice(0, 10))}</small></td><td><q>${escape(r.excerpt)}</q>${r.excerptTruncated ? '<small>Excerpt ends at 25 words; inspect source for full context.</small>' : ''}<small>Source location: ${escape(r.extractionTag)}</small></td><td><strong>${escape(categories(r.after.gap))}</strong><small>Before: ${escape(categories(r.before.gap))}</small><details><summary>Case learning &amp; next step</summary><ul>${r.reviewNotes.map(n=>`<li>${escape(n)}</li>`).join('')}</ul><p>${escape(r.after.gap.findings[0].revisions.join(' '))}</p></details></td></tr>`).join('');
const report = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>100 organisations — ClaimCheck evaluation</title><link rel="stylesheet" href="/evaluation.css"></head><body><main><nav><a href="/#workspace">← ClaimCheck workspace</a><span>RESEARCH / 08 SEP 2026</span></nav><p class="eyebrow">PUBLIC-SOURCE EVALUATION</p><h1>100 organisations.<br>Every case has a source.</h1><p class="intro">A development review of 100 public website excerpts across Indian financial services and fintech. Each excerpt was run in three conditions before and after the rule changes: an evidence gap, a labelled claim source, and an unlabelled copy of the same claim.</p><section class="metrics" aria-label="Evaluation summary"><div><b>100</b><span>Distinct organisations</span></div><div><b>600</b><span>Total case executions</span></div><div><b>${summary.evidenceProbeCasesBefore} → ${summary.evidenceProbeCasesAfter}</b><span>Self-evidence probe failures</span></div><div><b>${summary.categoryChangedOrganisations}</b><span>Cases with category changes</span></div></section><section><h2>What changed</h2><ul>${lessons.map(l=>`<li>${escape(l)}</li>`).join('')}</ul><p class="notice">These are development checks, not a measured accuracy score or company ratings. Public pages include marketing, navigation, help and educational text. All cases lack independently verified evidence; “not substantiated” describes this evidence pack. The 200 self-evidence probes test a specific failure mode and do not establish general accuracy.</p></section><section><h2>Case-by-case review</h2><p>Every organisation has a short attributed excerpt, before/after categories, and an expandable review note. Use your browser’s Find command to locate a company.</p><div class="table-wrap"><table><thead><tr><th>#</th><th>Organisation &amp; source</th><th>Retrieved excerpt</th><th>Result &amp; learning</th></tr></thead><tbody>${rows}</tbody></table></div></section><footer>Sources collected ${escape(summary.runAt.slice(0,10))}. No legal-entity registry verification was performed. Homepage brand matching is a retrieval sanity check, not proof of ownership. The source manifest retains final URLs, retrieval times and page hashes. Limited to English rule coverage; multilingual content needs human review.</footer></main></body></html>`;
writeFileSync(new URL('public/batch-review.html', root), report);
const markdown = `# ClaimCheck: 100-organisation development review\n\nRun: ${summary.runAt}\n\n100 organisations, 300 executions per version, 600 total. Self-evidence probe failures: ${summary.evidenceProbeCasesBefore} before, ${summary.evidenceProbeCasesAfter} after. Category changes: ${summary.categoryChangedOrganisations} organisations.\n\n${summary.scope}\n\n${summary.notes}\n\n## Improvements\n\n${lessons.map(l=>`- ${l}`).join('\n')}\n\n## Per-organisation record\n\n${records.map(r=>`### ${r.number}. ${r.company}\n\nSource: [${r.title.replace(/[\[\]]/g,'')} ](${r.sourceUrl}), retrieved ${r.retrievedAt}.\n\n> ${r.excerpt}\n\nBefore: ${categories(r.before.gap)}. After: ${categories(r.after.gap)}.\n\n${r.reviewNotes.map(n=>`- ${n}`).join('\n')}\n\nNext step: ${r.after.gap.findings[0].revisions.join(' ')}\n`).join('\n')}`;
writeFileSync(new URL('docs/100-organisation-review.md', root), markdown);
console.log(JSON.stringify(summary, null, 2));
if (process.argv.includes('--verbose')) for (const r of records) console.log(JSON.stringify({ n: r.number, company: r.company, claim: r.excerpt, baseline: r.before.gap.findings.flatMap(f => f.categories.map(c => c.id)), after: r.after.gap.findings.flatMap(f => f.categories.map(c => c.id)) }));
