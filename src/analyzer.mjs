const STOPWORDS = new Set([
  "about", "after", "again", "also", "been", "before", "being", "between", "could", "from", "have",
  "into", "more", "most", "only", "other", "over", "such", "than", "that", "their", "there", "these",
  "they", "this", "through", "using", "very", "what", "when", "where", "which", "while", "with", "would",
  "your", "ours", "will", "system", "company", "clients", "financial", "india", "indian"
]);

const RULES = [
  {
    id: "guarantee",
    label: "Certainty or guaranteed outcome",
    pattern: /\b(guarantee(?:d|s)?|risk[- ]?free|assured returns?|minimum returns?|target returns?|fixed returns?|zero loss|capital protection|cannot lose|no downside|will outperform|certain profit|double your money)\b/i,
    weight: 46,
    note: "Absolute or assured-return language can conceal market uncertainty and loss.",
    revision: "Remove assurance language; state that securities-market investments carry risk and describe the assumptions and limits of any forecast."
  },
  {
    id: "performance",
    label: "Performance or forecasting claim",
    pattern: /\b(outperform|alpha|returns?|forecast(?:s|ing)?|predict(?:s|ive|ion)?|beat(?:s)? the market|win rate|accuracy|nifty|bank nifty|multibagger|stock tips?|buy calls?|sell calls?|backtest(?:ed|ing)?)\b/i,
    weight: 24,
    note: "Performance claims need a defined period, benchmark, methodology, fees and limitations.",
    revision: "Add the period, Indian-market benchmark, methodology, fees and taxes, sample size, limitations and independently reproducible evidence."
  },
  {
    id: "ai-capability",
    label: "AI capability claim",
    pattern: /\b(AI|artificial intelligence|machine learning|agentic|algorithm(?:ic)?|proprietary model|neural network)\b/i,
    weight: 17,
    note: "AI terminology should correspond to a real, documented capability rather than branding alone.",
    revision: "Describe the actual model, input data, validation process, human oversight and operational use."
  },
  {
    id: "regulatory-status",
    label: "Regulatory or credential claim",
    pattern: /\b(SEBI|RBI|IRDAI|PFRDA|AMFI|NBFC|fiduciary|approved by|(?:registered|regulated|licensed|authori[sz]ed)\s+(?:investment|stock|securities|broker|advis[eo]r|lender|entity|financial|intermediary)|(?:we|our (?:firm|company|platform))\s+(?:are|is)\s+(?:registered|regulated|licensed))\b/i,
    weight: 31,
    note: "Indian regulatory-status claims should map to the correct authority, legal entity and verifiable record.",
    revision: "Name the Indian regulator, legal entity and registration number, then link to the official SEBI, RBI or other applicable register."
  },
  {
    id: "superlative",
    label: "Unqualified superlative",
    pattern: /(?:\b(first|best|leading|largest|biggest|cheapest|lowest|only|most accurate|most trusted|number one|unmatched|revolutionary)\b|\bno\.?\s*1\b|#1\b)/i,
    weight: 14,
    note: "Comparative claims need a defined comparison set and evidence.",
    revision: "Replace the superlative with a specific, measurable and time-bounded statement."
  },
  {
    id: "data-use",
    label: "Customer-data or privacy claim",
    pattern: /\b(customer data|client data|personal data|customer identity|financial information|transaction histor(?:y|ies)|bank data|account data|aadhaar|PAN(?![- ]India)|bank statements?|SMS data|phone contacts?|UPI data|credit score)\b/i,
    weight: 18,
    note: "Indian financial-data claims should explain consent, necessity, minimisation, storage and access controls.",
    revision: "State what data is collected, why it is necessary, how consent is obtained or withdrawn, retention, storage location and grievance controls."
  },
  {
    id: "lending-cost",
    label: "Digital-lending cost or access claim",
    pattern: /\b(interest[- ]?free|zero[- ]?cost EMI|instant(?:\s+(?:personal|business|cash|gold|home)(?:\s*(?:&|and)\s*(?:personal|business|cash|gold|home))?)?\s+(?:loans?|approval)|(?:loan|approval)\s+in\s+\d+\s+(?:minutes?|hours?)|no processing fee|lowest interest|APR|key fact statement|KFS)\b/i,
    weight: 23,
    note: "Digital-lending promotions need transparent total-cost, lender and borrower-protection information.",
    revision: "Identify the regulated lender and disclose APR, Key Fact Statement, fees, tenor, cooling-off period and grievance route where applicable."
  },
  {
    id: "tips-channel",
    label: "Tips or signals channel",
    pattern: /\b(telegram|whatsapp|signals?|intraday calls?|options? calls?|premium group|VIP group)\b/i,
    weight: 25,
    note: "Investment tips distributed through messaging or social channels require registration and communication review.",
    revision: "Identify the registered adviser or research analyst, preserve the exact communication and verify the registration on SEBI's official register."
  },
  {
    id: "testimonial",
    label: "Testimonial or profit display",
    pattern: /\b(testimonial|client profit|profit screenshot|P&L screenshot|celebrity endorsement|success story)\b/i,
    weight: 20,
    note: "Testimonials and profit displays can create a misleading impression of likely outcomes.",
    revision: "Remove selective outcome displays or document the applicable advertisement rule, full context, consent and prominent risk limitations."
  },
  {
    id: "pricing",
    label: "Pricing or fee claim",
    pattern: /(?:\b(?:zero|free|flat|no|low)[- ](?:brokerage|fees?|charges?|commission|processing)|\bflat\s+₹?\s*\d+|\bno hidden charges|\blow[- ]interest)/i,
    weight: 14,
    note: "Pricing claims need the relevant tariff, exclusions, taxes and effective date.",
    revision: "Attach the current pricing schedule and specify applicable products, per-order limits, taxes and other charges."
  },
  {
    id: "scale",
    label: "Customer or adoption scale claim",
    pattern: /\b\d[\d.,]*\+?\s*(?:(?:crore|lakh|million|billion|thousand)s?\s*)?\+?\s*(?:global\s+)?(?:customers?|investors?|users?|brands?|businesses?)/i,
    weight: 14,
    note: "Adoption figures require a dated source and definitions such as registered versus active customers.",
    revision: "Provide the measurement date, counting method, scope and an independently checkable source for the figure."
  },
  {
    id: "security-certainty",
    label: "Absolute security claim",
    pattern: /\b(fraud[- ]free|hack[- ]proof|100%\s+secure|completely secure|zero fraud)\b/i,
    weight: 25,
    note: "Absolute security claims require qualified scope and documented testing; no keyword check establishes security.",
    revision: "Describe the specific security controls, test scope, residual risks and incident-handling process."
  }
];

function clamp(value, minimum = 0, maximum = 100) {
  return Math.min(maximum, Math.max(minimum, value));
}

function tokens(value) {
  return [...new Set(String(value || "")
    .toLowerCase()
    .match(/[a-z0-9][a-z0-9-]{2,}/g) || [])]
    .filter((token) => !STOPWORDS.has(token));
}

function splitClaims(value) {
  return String(value || "")
    .split(/\n+/)
    .map((claim) => claim.trim().replace(/^(?:[•*-]\s+|\d+[.)]\s+)/, ""))
    .filter((claim) => claim.length >= 12)
    .slice(0, 12);
}

function parseEvidence(value) {
  return String(value || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12)
    .map((line, index) => {
      const parts = line.split("|").map((part) => part.trim());
      const excerpt = parts.length > 2 ? parts.slice(2).join(" | ") : parts.at(-1);
      const isGap = /\b(no (?:independent(?:ly)?|official|supporting|verifiable|reproducible|registry|evidence|record|backtest)|not (?:supplied|provided|attached|available|verified)|missing|unavailable|could not verify)\b/i.test(excerpt);
      const isClaimSource = /\b(claim source|marketing source|company homepage|self[- ]published)\b/i.test(parts[0]);
      return {
        id: `note-${index + 1}`,
        title: parts.length > 1 ? parts[0] : `Evidence note ${index + 1}`,
        url: parts.length > 2 && /^https?:\/\//.test(parts[1]) ? parts[1] : null,
        excerpt,
        stance: isGap ? "gap" : isClaimSource ? "claim-source" : "support-candidate",
        type: isGap ? "Analyst-supplied gap note" : isClaimSource ? "Original marketing source" : "Analyst-supplied evidence"
      };
    });
}

function evidenceMatch(claim, evidence) {
  const claimTokens = tokens(claim);
  if (!claimTokens.length || !evidence.length) return { score: 0, matches: [] };
  const normalise = (text) => String(text).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const amounts = (text) => [...String(text).matchAll(/\d+(?:[.,]\d+)*(?:\+?\s*(?:crores?|lakhs?|millions?|billions?|thousands?)\b|\+|%)?/gi)].map(m => m[0].toLowerCase().replace(/[,+\s]/g, '').replace(/(crore|lakh|million|billion|thousand)s$/, '$1'));
  const claimAmounts = amounts(claim);
  const claimNormal = normalise(claim);
  const matches = evidence.map((source) => {
    let item = { ...source };
    const repeated = normalise(item.excerpt) === claimNormal;
    if (repeated && item.stance === 'support-candidate') {
      item = { ...item, stance: 'claim-source', type: 'Repeated claim; no additional substantiation' };
    }
    const evidenceAmounts = new Set(amounts(item.excerpt));
    const quantityMismatch = claimAmounts.some(amount => !evidenceAmounts.has(amount));
    const evidenceTokens = new Set(tokens(`${item.title} ${item.excerpt}`));
    const overlap = claimTokens.filter((token) => evidenceTokens.has(token));
    return { item, score: overlap.length / claimTokens.length, overlap, quantityMismatch };
  }).sort((a, b) => b.score - a.score);
  const supportiveMatches = matches.filter((match) => match.item.stance === "support-candidate" && !match.quantityMismatch);
  return {
    score: supportiveMatches[0]?.score || 0,
    matches: matches.filter((match) => match.score > 0).slice(0, 3)
  };
}

function severity(score) {
  if (score >= 70) return "critical";
  if (score >= 48) return "high";
  if (score >= 26) return "medium";
  return "low";
}

export function analyzeCase(input = {}) {
  const claims = splitClaims(input.claims);
  if (!claims.length) throw new Error("Add at least one complete marketing claim.");

  const evidence = parseEvidence(input.evidenceNotes);
  const indiaContext = input.indiaContext || { jurisdiction: "India", sources: [], identifierChecks: {} };
  const findings = claims.map((claim, index) => {
    const companyPattern = String(input.company || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const withoutBrand = companyPattern ? claim.replace(new RegExp(`\\b${companyPattern}\\b`, 'gi'), 'the organisation') : claim;
    const hits = RULES.filter((rule) => {
      let candidate = rule.id === 'superlative' ? withoutBrand : claim;
      if (rule.id === 'performance') candidate = candidate.replace(/\b(?:GST|income[- ]tax|tax)\s+returns?\b/gi, 'tax filing');
      if (rule.id === 'superlative') candidate = candidate.replace(/\b(?:what|which) best describes\b|\bfirst (?:name|step|payment|time|login)\b|\bonly (?:if|when|after)\b/gi, '');
      if (rule.id === 'tips-channel' && !/\b(tips?|signals?|calls?|recommendations?|trading|invest(?:ing|ment))\b/i.test(candidate)) return false;
      return rule.pattern.test(candidate);
    });
    const match = evidenceMatch(claim, evidence);
    const hasGuarantee = hits.some((hit) => hit.id === "guarantee");
    const evidencePenalty = (1 - match.score) * 18;
    const rawRisk = hits.reduce((sum, hit) => sum + hit.weight, 0) + evidencePenalty - match.score * 22;
    const riskScore = Math.round(clamp(hits.length ? Math.max(rawRisk, 10) : rawRisk));

    let status = "not-substantiated";
    if (hasGuarantee) status = "high-risk-language";
    else if (match.score >= 0.42 && hits.length <= 1) status = "supported";
    else if (match.score >= 0.3) status = "partially-supported";

    const hitIds = new Set(hits.map((hit) => hit.id));
    const guidance = (indiaContext.sources || [])
      .filter((source) => source.ruleIds.some((ruleId) => hitIds.has(ruleId)))
      .map(({ id, authority, title, url, reviewPrompt }) => ({ id, authority, title, url, reviewPrompt }));

    return {
      id: `claim-${index + 1}`,
      claim,
      status,
      severity: severity(riskScore),
      riskScore,
      categories: hits.map(({ id, label }) => ({ id, label })),
      rationale: hits.length
        ? hits.map((hit) => hit.note)
        : ["No configured language category matched; the statement still requires traceable support."],
      revisions: hits.length
        ? [...new Set(hits.map((hit) => hit.revision))]
        : ["Attach a dated primary source and define the scope of the statement."],
      evidence: match.matches.map(({ item, score, overlap, quantityMismatch }) => ({
        ...item,
        matchScore: Math.round(score * 100),
        matchedTerms: overlap,
        quantityMismatch
      })),
      guidance
    };
  });

  const average = findings.reduce((sum, finding) => sum + finding.riskScore, 0) / findings.length;
  const criticalAdjustment = findings.some((finding) => finding.severity === "critical") ? 8 : 0;
  const overallRisk = Math.round(clamp(average + criticalAdjustment));

  return {
    caseId: `CC-${Date.now().toString(36).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    company: input.company || "Unnamed organisation",
    jurisdiction: indiaContext.jurisdiction || "India",
    marketContext: indiaContext.marketContext || "general-fintech",
    marketContextLabel: indiaContext.marketContextLabel || "General fintech / AI product",
    identifierChecks: indiaContext.identifierChecks || {},
    overallRisk,
    overallSeverity: severity(overallRisk),
    summary: {
      claimsReviewed: findings.length,
      evidenceItems: evidence.length,
      regulatorySources: (indiaContext.sources || []).length,
      escalations: findings.filter((finding) => ["critical", "high"].includes(finding.severity)).length,
      substantiated: findings.filter((finding) => finding.status === "supported").length
    },
    findings,
    sources: evidence,
    regulatorySources: indiaContext.sources || [],
    regulatoryDatasetVersion: indiaContext.datasetVersion || null,
    guidanceNotice: indiaContext.notice || "Regulatory references are guidance, not entity-specific proof.",
    warnings: evidence.length ? [] : ["No evidence pack was supplied. Findings measure language risk, not truth or falsity."],
    disclaimer: "ClaimCheck India is a research and triage tool, not SEBI, RBI, MCA or a legal adviser. It does not determine fraud, compliance, liability or investment suitability. Human review of current official records is required."
  };
}
