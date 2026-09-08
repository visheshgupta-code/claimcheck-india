# Architecture

```text
Browser form
  ├── public prototype notice + privacy / terms
  ├── claims + company evidence ──> deterministic analyzer
  └── market context + identifiers ──> India context builder
                                        └── versioned SEBI / RBI / MCA source pack

Analyzer
  ├── phrase-risk rules
  ├── token-overlap evidence matching
  ├── category-to-regulatory-guidance mapping
  └── human-review case file
```

## Important separation

Company evidence and regulatory guidance are separate data classes. Only company-specific evidence can influence the substantiation status. SEBI, RBI and MCA references explain what the reviewer should verify; they never prove the reviewed entity's claim.

## Components

- `public/`: accessible editorial interface and India-specific fictional examples
- `src/analyzer.mjs`: deterministic claim rules, evidence matching and scoring
- `src/india-context.mjs`: market-context selection and identifier format checks
- `src/rate-limit.mjs`: single-instance visitor and route request limiting
- `data/india-regulatory-sources.json`: versioned, inspectable official-source map
- `server.mjs`: native Node HTTP and JSON API layer
- `tests/`: unit and browser-level checks
- `render.yaml` and `Dockerfile`: production deployment and health-check configuration

## Network and privacy

Analysis runs locally and does not automatically send claim text to an external service. Official regulatory links open only when a reviewer chooses them. The prototype does not persist case data.

Public deployments terminate HTTPS at the hosting proxy. The application adds production HSTS and restrictive content, framing, referrer and permissions headers. Proxy-derived visitor addresses are used only when `TRUST_PROXY=1`.
