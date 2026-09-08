# ClaimCheck Finance India — System Card

## Intended use

ClaimCheck is a research and triage prototype for reviewing public-facing AI, investment, securities and digital-lending claims in India. It helps an analyst identify language that needs company evidence and human regulatory review.

## Out-of-scope uses

- Determining whether a person or organisation committed fraud
- Providing legal, SEBI, RBI or investment advice
- Automatically approving or publishing marketing copy
- Treating an identifier's valid format as proof of registration
- Scoring people, borrowers, investors or employees
- Processing Aadhaar, PAN, bank statements or personal financial information

## Current approach

Version 0.3 is deliberately deterministic. It uses:

1. Transparent India-oriented phrase rules
2. Token-overlap matching against analyst-supplied company evidence
3. A versioned map of official SEBI, RBI and MCA review references
4. Human-readable rationales and revision prompts

No LLM is required. This creates a measurable baseline before adding model complexity.

## Evaluation

The automated suite checks that the system:

- Escalates assured-return and zero-loss language
- Distinguishes “not substantiated” from “false”
- Preserves risk flags even when company evidence overlaps
- Selects the correct Indian source pack by market context
- Validates SEBI-style and CIN formats without claiming registry verification
- Limits case size and rejects incomplete input

Before production use, build a labelled Indian evaluation set with compliance professionals. Report precision, recall, error analysis and inter-annotator agreement, including Hindi and Hinglish examples.

## Known limitations

### September 8 public-source development run

The repository includes 100 distinct organisations selected from 161 retrievable public sites (201 candidates attempted). Each has one attributed excerpt of at most 25 words, a final source URL, retrieval timestamp and page hash. The corpus includes marketing, educational and interface text; it is not a set of adjudicated factual claims.

`npm run evaluate:100` runs each excerpt with an evidence gap, a labelled marketing source and an unlabelled repetition, before and after changes (600 case executions). The labelled and unlabelled repetition checks isolate self-substantiation. They are development regression checks, not an accuracy benchmark or independent verification of the organisations. See `docs/100-organisation-review.md` for the full per-case analysis.

The resulting rules preserve one intake line per claim, recognise explicit claim-source notes, reject exact repetition as support, check numerical compatibility, and add pricing, scale and security-certainty categories. Tax-return, registered-phone, question and company-name contexts reduce specific false flags. Regulatory guidance is still limited to the existing source pack: insurance and banking references are incomplete.

- Phrase rules miss nuanced, implied and multilingual claims.
- Token overlap does not establish truth, quality or sufficiency of evidence.
- Exact-copy detection does not reliably detect paraphrased self-citations or contradictions. A declared source type is not authenticated provenance.
- Numeric matching is conservative: equivalent unit conversions and rounding may fail to match. Dates and non-claim numbers can also need manual handling.
- Collected excerpts may omit footnotes or qualifications; the original page must be read before interpreting a finding.
- The local source pack can become stale as Indian rules and regulator websites change.
- Identifier checks validate format only; they do not verify live registry status.
- Requirements vary by entity type, product, audience, medium and date.
- A low score does not mean a claim is compliant.
- A high score does not mean a claim is illegal or fraudulent.

## Human oversight

Every result requires human review of the original communication, company evidence, exact legal entity, live official register, applicable rule version and publication context.
