# ClaimCheck Finance — India Edition

**Evidence-first review of AI and financial marketing claims in an Indian regulatory context.**

ClaimCheck is a research prototype that identifies risky language, checks whether analyst-supplied evidence overlaps with a claim and connects each issue to relevant SEBI, RBI or MCA review guidance. It never declares fraud, compliance or investment suitability.

Built by Vishesh Gupta. The engine uses transparent rules and lexical matching; it does not use or train an LLM.

## Tested with 100 real organisations

A September 2026 development exercise collected short public website excerpts from **100 distinct organisations** across financial services and fintech. Each excerpt was evaluated under three evidence conditions against the original and revised engines: **600 case executions** in total.

- Fixed repeated marketing being treated as supporting evidence: **200 failing probe cases before the changes, zero after**.
- Revised category detection in **18 cases**, including tax-return versus investment-return language, registered mobile numbers, pricing, scale and security claims.
- Added regression coverage; **29 automated tests pass**, including checks across all 100 saved excerpts.

Read the [case-by-case report](docs/100-organisation-review.md), inspect the [source manifest](data/evaluation/organisations-100.json), or reproduce the evaluation with `npm run evaluate:100`.

This is a development corpus, not a held-out accuracy benchmark or an independent audit of the organisations. Some excerpts are educational or interface text. Sources may change, and short passages may omit important context. Full limitations are documented in the [system card](docs/MODEL_CARD.md).

## What the MVP does

- Reviews investment-advice, securities, digital-lending and general-fintech copy
- Flags assured returns, performance claims, AI claims, regulatory status, tips channels, testimonials, lending-cost language and financial-data use
- Matches claims only against analyst-supplied company evidence
- Keeps Indian regulatory guidance separate from company-specific proof
- Records optional SEBI-style identifiers and CINs, with format checks—not registry verification
- Generates risk scores, rationales, safer revision prompts and official review links
- Includes a transparent Indian regulatory source dataset, system card, risk register and automated tests
- Includes public Privacy and Terms pages, security headers and configurable API rate limiting
- Runs with Node.js only—no package installation or API key required

## Run locally

```bash
npm start
```

Open [http://localhost:4173](http://localhost:4173). The interface loads a fictional Indian investment-advisory case automatically and makes no external network request.

## Test

The saved 100-organisation public-source evaluation can be rerun offline with `npm run evaluate:100`. Its source manifest is `data/evaluation/organisations-100.json`; detailed before/after results are in `data/evaluation/batch-results.json`. View the report at `/batch-review.html` or read `docs/100-organisation-review.md`. This is a development corpus and controlled evidence-handling experiment, not a measured accuracy benchmark. Intake accepts one claim per line and preserves sentence punctuation within that line.

```bash
npm test
```

For the browser smoke test, start the app in one terminal and run this in another (requires Python Playwright and Chromium):

```bash
npm run test:e2e
```

The check covers desktop rendering, India sample switching, expandable guidance, mobile overflow and browser errors. Reference captures are saved in [`docs/screenshots`](docs/screenshots).

## Production safeguards

- API routes other than health checks are limited to 30 requests per minute per visitor and route by default.
- JSON requests are capped at 200 KB; invalid JSON and unsupported content types are rejected.
- Security headers restrict scripts, frames, browser permissions and referrer leakage.
- The server shuts down gracefully when the hosting platform sends `SIGTERM`.
- [Privacy](public/privacy.html) and [Terms & Disclaimer](public/terms.html) are visible from the application.

Configure the limit with `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW_MS`. Set `TRUST_PROXY=1` only behind a trusted hosting proxy. The included limiter is appropriate for a single-instance portfolio demo; a scaled service should use a shared store such as Redis.

## Deploy on Render

The included [`render.yaml`](render.yaml) is a production blueprint with a health check, proxy handling and the required start command.

1. Put the contents of this project directory in a Git repository and push it to GitHub.
2. In Render, create a new Blueprint and connect that repository.
3. Review the service name and environment values, then create the service.
4. After deployment, test `/api/health`, `/privacy.html` and `/terms.html` on the provided URL.
5. Optionally attach a custom domain in Render and update its DNS records.

Render provides and renews TLS certificates and redirects HTTP traffic to HTTPS. A portable [`Dockerfile`](Dockerfile) is also included for another container host.

## Indian regulatory dataset

The versioned source pack lives at [`data/india-regulatory-sources.json`](data/india-regulatory-sources.json). It contains official review links, scope tags and rule mappings for:

- SEBI recognised intermediaries
- SEBI's advertisement code for Investment Advisers and Research Analysts
- SEBI's public warning about unregistered advice and unrealistic returns
- RBI's Digital Lending Directions, 2025
- RBI's public Digital Lending App repository notice
- MCA Company / LLP master data

These references tell a reviewer **what to check**. They are never counted as proof that a company is registered or that its marketing claim is true.

## Evidence-note format

Add one company-specific evidence item per line:

```text
Model card | https://example.com/model-card | Walk-forward testing used Nifty 50 data from 2022–2025 and reports fees and prediction intervals.
SEBI record | https://www.sebi.gov.in/... | The legal name and registration number match the official register entry reviewed on 5 September 2026.
```

URLs are optional. Term overlap is a discovery aid—not proof that the evidence is sufficient.

## API

### `POST /api/analyze`

```json
{
  "company": "Example organisation",
  "marketContext": "investment-advice",
  "regulatoryIdentifier": "INA000000000",
  "cin": "",
  "claims": "Our AI provides assured monthly returns.",
  "evidenceNotes": "Model review | No independently reproducible result was supplied."
}
```

### `GET /api/india/reference-pack?context=digital-lending`

Returns the selected Indian market context, identifier checks and applicable official review references.

### `GET /api/india/dataset`

Returns the complete, versioned India regulatory source pack.

### `GET /api/health`

Returns service and version metadata.

## Responsible-AI position

The system uses four deliberately conservative output states:

- **Evidence aligned** — lexical overlap exists with supplied company evidence; human review is still required.
- **Partial support** — some relevant evidence exists, but gaps remain.
- **Not substantiated** — no matching company evidence was supplied.
- **Escalate** — the claim contains especially high-risk certainty language.

“Not substantiated” is not equivalent to “false.” A low score is not a compliance approval. See [the system card](docs/MODEL_CARD.md) and [risk register](docs/RISK_REGISTER.md).

## Portfolio roadmap

1. Build a labelled Indian corpus using fictional examples and regulator-published enforcement cases.
2. Add reviewed snapshots of SEBI intermediary, RBI DLA and MCA entity records with dates and provenance.
3. Add Hindi and Hinglish claim variants, including messaging-channel promotions.
4. Compare the deterministic baseline with an LLM constrained to cite supplied evidence.
5. Add jurisdiction and entity-specific checklists reviewed by Indian compliance professionals.
6. Export a signed case report containing source snapshots and reviewer decisions.

## Primary references

- [SEBI recognised intermediaries](https://www.sebi.gov.in/sebiweb/other/OtherAction.do?doRecognised=yes)
- [SEBI advertisement code for Investment Advisers and Research Analysts](https://www.sebi.gov.in/legal/circulars/apr-2023/advertisement-code-for-investment-advisers-ia-and-research-analysts-ra-_69798.html)
- [SEBI public caution on investment advisers and research analysts](https://www.sebi.gov.in/media/press-releases/jun-2016/sebi-cautions-public-to-deal-with-only-sebi-registered-investment-advisers-and-research-analysts_32627.html)
- [RBI Digital Lending Directions, 2025](https://website.rbi.org.in/documents/d/rbi/directionsondigitallending)
- [RBI announcement of the public Digital Lending App repository](https://rbi.org.in/scripts/BS_PressReleaseDisplay.aspx?prid=58449)
- [Ministry of Corporate Affairs](https://www.mca.gov.in/)

## Important disclaimer

ClaimCheck India is a research and triage tool, not SEBI, RBI, MCA or a legal adviser. It does not determine fraud, regulatory compliance, legal liability or investment suitability. Human review of current official records is required.
