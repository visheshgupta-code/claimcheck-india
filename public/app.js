const form = document.querySelector("#claim-form");
const claimsInput = document.querySelector("#claims");
const results = document.querySelector("#results");
const charCount = document.querySelector("#char-count");
const analyzeButton = form.querySelector(".analyze-button");
const findingTemplate = document.querySelector("#finding-template");

const samples = {
  risk: {
    company: "Saarthi Quant Advisory (fictional)",
    marketContext: "investment-advice",
    regulatoryIdentifier: "INA000000000",
    cin: "",
    claims: [
      "Our proprietary AI gives 92% accurate Bank Nifty calls.",
      "Clients receive guaranteed monthly returns of 4% with zero loss.",
      "We are India's first SEBI-approved AI investment adviser."
    ].join("\n"),
    evidence: [
      "Model review | No independently reproducible Bank Nifty backtest, period or fee-adjusted result was supplied.",
      "Registration note | The advertisement printed INA000000000, but no official SEBI registry record was attached."
    ].join("\n")
  },
  responsible: {
    company: "Aarohan Cashflow Labs (fictional)",
    marketContext: "general-fintech",
    regulatoryIdentifier: "",
    cin: "U62099KA2025PTC123456",
    claims: [
      "Our forecasting model estimates a range of possible 30-day cash-flow outcomes from synthetic rupee-denominated transaction histories.",
      "Forecasts are uncertain, require human review and are not SEBI-registered investment advice."
    ].join("\n"),
    evidence: [
      "Model card | https://example.com/model-card | The evaluation uses six months of synthetic transactions, walk-forward validation and prediction intervals.",
      "Limitations note | https://example.com/limitations | The system is not evaluated for lending, trading, investment advice or automated money movement."
    ].join("\n")
  },
  blank: { company: "", marketContext: "general-fintech", regulatoryIdentifier: "", cin: "", claims: "", evidence: "" }
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;"
  })[character]);
}

function loadSample(name) {
  const sample = samples[name];
  document.querySelector("#company").value = sample.company;
  document.querySelector("#market-context").value = sample.marketContext;
  document.querySelector("#regulatory-identifier").value = sample.regulatoryIdentifier;
  document.querySelector("#cin").value = sample.cin;
  claimsInput.value = sample.claims;
  document.querySelector("#evidence").value = sample.evidence;
  document.querySelectorAll(".sample-chip").forEach((chip) => chip.classList.toggle("active", chip.dataset.sample === name));
  updateCount();
}

function updateCount() {
  charCount.textContent = `${claimsInput.value.length} characters`;
}

function statusLabel(status) {
  return ({
    "high-risk-language": "Escalate",
    "not-substantiated": "Not substantiated",
    "partially-supported": "Partial support",
    "supported": "Evidence aligned"
  })[status] || status;
}

function renderFinding(finding, index) {
  const card = findingTemplate.content.firstElementChild.cloneNode(true);
  const button = card.querySelector(".finding-summary");
  const details = card.querySelector(".finding-details");
  card.dataset.severity = finding.severity;
  card.querySelector(".finding-index").textContent = String(index + 1).padStart(2, "0");
  card.querySelector(".finding-status").textContent = statusLabel(finding.status);
  card.querySelector(".finding-claim").textContent = finding.claim;
  card.querySelector(".finding-score").textContent = finding.riskScore;

  const categories = finding.categories.length
    ? finding.categories.map((category) => `<span class="tag">${escapeHtml(category.label)}</span>`).join("")
    : '<span class="tag">General substantiation</span>';
  const rationale = finding.rationale.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const revisions = finding.revisions.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const evidence = finding.evidence.length
    ? finding.evidence.map((item) => {
      const evidenceType = item.stance === "gap" ? "gap note" : item.stance === "claim-source" ? "claim source; not additional evidence" : item.quantityMismatch ? "figures do not match" : "support candidate";
      const label = `${item.title} · ${item.matchScore}% term match · ${evidenceType}`;
      return item.url
        ? `<a class="evidence-link" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(label)} ↗</a>`
        : `<span class="evidence-link">${escapeHtml(label)}</span>`;
    }).join("")
    : '<p>No matching evidence item was found.</p>';
  const guidance = finding.guidance?.length
    ? finding.guidance.map((item) => `
      <div class="guidance-note">
        <a class="evidence-link" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.authority)} · ${escapeHtml(item.title)} ↗</a>
        <span>${escapeHtml(item.reviewPrompt)}</span>
      </div>
    `).join("")
    : '<p>No category-specific Indian regulatory reference was selected.</p>';

  details.innerHTML = `
    <h4>Risk categories</h4><div class="tag-row">${categories}</div>
    <h4>Why it was flagged</h4><ul>${rationale}</ul>
    <h4>Safer next step</h4><ul>${revisions}</ul>
    <h4>Company evidence trail</h4>${evidence}
    <h4>Indian regulatory guidance</h4>${guidance}
  `;

  button.addEventListener("click", () => {
    const expanded = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!expanded));
    details.hidden = expanded;
  });
  return card;
}

function renderResults(data) {
  const identifierNotes = Object.values(data.identifierChecks || {})
    .filter((check) => check.value)
    .map((check) => `${check.value}: ${check.message}`);
  const allWarnings = [...(data.warnings || []), ...identifierNotes];
  const warnings = allWarnings.length
    ? `<div class="warning-stack">${allWarnings.map((warning) => `<div class="warning">${escapeHtml(warning)}</div>`).join("")}</div>`
    : "";

  results.innerHTML = `
    <div class="results-header">
      <div class="risk-dial">
        <div class="risk-value">${data.overallRisk}<small>/100</small></div>
      </div>
      <div>
        <p class="results-kicker">${escapeHtml(data.overallSeverity)} review priority</p>
        <h3>${escapeHtml(data.company)}</h3>
        <div class="results-meta">
          <span>${escapeHtml(data.caseId)}</span>
          <span>${escapeHtml(data.marketContextLabel)}</span>
          <span>${data.summary.claimsReviewed} claims</span>
          <span>${data.summary.evidenceItems} evidence items</span>
          <span>${data.summary.regulatorySources} official references</span>
          <span>${data.summary.escalations} escalations</span>
        </div>
      </div>
    </div>
    ${warnings}
    <div class="findings-list"></div>
    <p class="results-disclaimer">${escapeHtml(data.guidanceNotice)}</p>
    <p class="results-disclaimer">${escapeHtml(data.disclaimer)}</p>
  `;
  results.querySelector(".risk-dial").style.setProperty("--score", data.overallRisk);
  const list = results.querySelector(".findings-list");
  data.findings.forEach((finding, index) => list.append(renderFinding(finding, index)));
}

function renderError(message) {
  results.innerHTML = `<div class="empty-state"><p>Review interrupted</p><h3>Case file incomplete.</h3><span>${escapeHtml(message)}</span></div>`;
}

async function analyze(event) {
  event?.preventDefault();
  analyzeButton.disabled = true;
  results.setAttribute("aria-busy", "true");
  analyzeButton.querySelector("span:first-child").textContent = "Reviewing evidence…";

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company: document.querySelector("#company").value.trim(),
        marketContext: document.querySelector("#market-context").value,
        regulatoryIdentifier: document.querySelector("#regulatory-identifier").value.trim(),
        cin: document.querySelector("#cin").value.trim(),
        claims: claimsInput.value.trim(),
        evidenceNotes: document.querySelector("#evidence").value.trim()
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Analysis failed.");
    renderResults(data);
  } catch (error) {
    renderError(error.message);
  } finally {
    analyzeButton.disabled = false;
    results.setAttribute("aria-busy", "false");
    analyzeButton.querySelector("span:first-child").textContent = "Analyze claims";
  }
}

document.querySelectorAll(".sample-chip").forEach((chip) => chip.addEventListener("click", () => loadSample(chip.dataset.sample)));
claimsInput.addEventListener("input", updateCount);
form.addEventListener("submit", analyze);
document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") analyze(event);
});

loadSample("risk");
analyze();
