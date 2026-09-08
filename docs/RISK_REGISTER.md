# Risk Register

| Risk | Potential harm | Current control | Next control |
|---|---|---|---|
| False allegation | Reputational damage to a company or person | Never labels conduct “fraud”; uses evidence-status language | Legal review of output taxonomy |
| Automation bias | Reviewer accepts a score without reading sources | Evidence trail and mandatory disclaimer | Require acknowledgement before export |
| Stale regulatory references | A changed Indian rule or register is treated as current | Versioned source pack and direct official links | Scheduled source review and freshness alerts |
| Weak evidence match | Keyword overlap looks like proof | Match percentage is labelled as term overlap | Semantic entailment model plus human labels |
| Sensitive-data exposure | Private financial information is pasted | Warning beside input; local deterministic engine | Client-side redaction and retention controls |
| Endpoint abuse | Automated traffic degrades the public demo | Per-visitor, per-route request limiting and body-size cap | Shared rate-limit store and managed edge protection |
| Hosting logs | IP and request metadata may be retained by infrastructure | Privacy notice explains operational logging | Confirm provider retention and publish a contact route |
| Identifier overclaim | Valid-looking SEBI or CIN format is treated as verified | Interface explicitly says format-only and links to official registers | Reviewed registry snapshots with timestamps |
| Entity-scope error | A SEBI rule is applied to an RBI-regulated product, or vice versa | User selects an Indian market context | Entity-type decision tree reviewed by counsel |
| Adversarial language | Marketing text evades phrase rules | Multiple rule categories | Red-team corpus and paraphrase testing |
| Model drift | Future LLM version changes behaviour | v0.1 has no model dependency | Versioned prompts, eval gates and rollback |

## Governance principle

The tool is a decision-support system, not a decision-maker. Its purpose is to improve the quality of questions asked by a human reviewer.
