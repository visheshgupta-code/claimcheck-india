import test from "node:test";
import assert from "node:assert/strict";

import { analyzeCase } from "../src/analyzer.mjs";
import { getIndiaContext, validateCin, validateRegulatoryIdentifier } from "../src/india-context.mjs";

test("escalates assured-return and zero-loss language", () => {
  const result = analyzeCase({ claims: "Clients receive assured monthly returns with zero loss." });
  assert.equal(result.findings[0].status, "high-risk-language");
  assert.equal(result.findings[0].severity, "critical");
  assert.ok(result.findings[0].categories.some((category) => category.id === "guarantee"));
});

test("separates unsupported from false", () => {
  const result = analyzeCase({ claims: "Our proprietary AI forecasts market movements." });
  assert.equal(result.findings[0].status, "not-substantiated");
  assert.match(result.disclaimer, /does not determine fraud/i);
});

test("recognises evidence overlap without hiding risk categories", () => {
  const result = analyzeCase({
    claims: "Our forecasting model estimates 30-day cash-flow outcomes from transaction history.",
    evidenceNotes: "Model card | The forecasting model was evaluated on synthetic transaction history and reports 30-day prediction intervals."
  });
  assert.ok(result.findings[0].evidence.length > 0);
  assert.ok(["supported", "partially-supported"].includes(result.findings[0].status));
});

test("does not treat an explicit evidence-gap note as support", () => {
  const result = analyzeCase({
    claims: "Our AI provides 92% accurate Bank Nifty calls.",
    evidenceNotes: "Model review | No independently reproducible Bank Nifty backtest was supplied."
  });
  assert.equal(result.findings[0].status, "not-substantiated");
  assert.equal(result.findings[0].evidence[0].stance, "gap");
});

test("limits a case to twelve claims", () => {
  const claims = Array.from({ length: 20 }, (_, index) => `Claim number ${index + 1} describes a documented process.`).join("\n");
  const result = analyzeCase({ claims });
  assert.equal(result.findings.length, 12);
});

test("requires at least one complete claim", () => {
  assert.throws(() => analyzeCase({ claims: "short" }), /at least one complete marketing claim/i);
});

test("validates Indian identifiers without claiming registry verification", () => {
  assert.equal(validateRegulatoryIdentifier("ina000017523").status, "format-valid");
  assert.equal(validateCin("U62099KA2025PTC123456").status, "format-valid");
  assert.match(validateRegulatoryIdentifier("RBI-NBFC-REFERENCE").message, /manual verification/i);
});

test("selects RBI sources for digital lending", () => {
  const context = getIndiaContext({ marketContext: "digital-lending" });
  assert.ok(context.sources.some((source) => source.authority === "RBI"));
  assert.ok(!context.sources.some((source) => source.id === "sebi-advertisement-code"));
});

test("keeps regulatory guidance separate from company evidence", () => {
  const indiaContext = getIndiaContext({ marketContext: "investment-advice" });
  const result = analyzeCase({
    claims: "We are a SEBI registered investment adviser.",
    indiaContext
  });
  assert.equal(result.findings[0].evidence.length, 0);
  assert.ok(result.findings[0].guidance.length > 0);
  assert.equal(result.findings[0].status, "not-substantiated");
});

test("preserves a decimal quantity at the start of a claim", () => {
  const result = analyzeCase({
    claims: "1.6+ crore customers trust Zerodha with approximately ₹6 lakh crore of equity investments."
  });
  assert.match(result.findings[0].claim, /^1\.6\+ crore customers/);
});

test("flags largest as an unqualified superlative with a non-zero risk floor", () => {
  const result = analyzeCase({
    claims: "Zerodha is India’s largest broker, contributing to 15% of daily retail exchange volumes in India.",
    evidenceNotes: "Claim source | Zerodha's own homepage; no independent exchange dataset was reviewed."
  });
  assert.ok(result.findings[0].categories.some((category) => category.id === "superlative"));
  assert.ok(result.findings[0].riskScore >= 10);
  assert.equal(result.findings[0].status, "not-substantiated");
});

test("does not treat weak keyword overlap as partial substantiation", () => {
  const result = analyzeCase({
    claims: "1.6+ crore customers trust Zerodha with approximately ₹6 lakh crore of equity investments.",
    evidenceNotes: "Pricing schedule | Equity delivery is brokerage free."
  });
  assert.equal(result.findings[0].status, "not-substantiated");
  assert.ok(result.findings[0].riskScore > 0);
});

test("preserves numbered rankings and decimal figures as one intake line", () => {
  const result = analyzeCase({ claims: "India's No. 1 broker serves 1.6 crore customers." });
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].claim, "India's No. 1 broker serves 1.6 crore customers.");
  assert.ok(result.findings[0].categories.some(c => c.id === 'superlative'));
});

test("company marketing and repeated claims cannot substantiate themselves", () => {
  const claims = 'Our platform offers instant personal loans with online applications.';
  for (const title of ['Claim source', 'Website excerpt']) {
    const result = analyzeCase({ claims, evidenceNotes: `${title} | https://example.com/ | ${claims}` });
    assert.equal(result.findings[0].status, 'not-substantiated');
    assert.equal(result.findings[0].evidence[0].stance, 'claim-source');
  }
});

test("a price mismatch cannot substantiate a pricing claim", () => {
  const result = analyzeCase({ claims: 'Equity orders have flat ₹20 brokerage.', evidenceNotes: 'Tariff | Equity orders have flat ₹200 brokerage plus applicable taxes.' });
  assert.equal(result.findings[0].status, 'not-substantiated');
  assert.equal(result.findings[0].evidence[0].quantityMismatch, true);
  const matched = analyzeCase({ claims: 'Equity orders have flat ₹20 brokerage.', evidenceNotes: 'Tariff | Equity orders have flat ₹20 brokerage plus applicable taxes.' });
  assert.equal(matched.findings[0].status, 'supported');
});

test("Indian numerical units must match in scale evidence", () => {
  const result = analyzeCase({ claims: 'Our platform serves 1 crore customers.', evidenceNotes: 'Report | Our platform serves 1 lakh customers according to the latest count.' });
  assert.equal(result.findings[0].status, 'not-substantiated');
});

test("tax-return copy is distinct from investment-return claims", () => {
  const tax = analyzeCase({ claims: 'How GST Return Filing Affects Your Business Loan Eligibility' });
  assert.ok(!tax.findings[0].categories.some(c => c.id === 'performance'));
  const investment = analyzeCase({ claims: 'After filing your tax returns, invest for assured returns.' });
  assert.equal(investment.findings[0].status, 'high-risk-language');
  assert.ok(investment.findings[0].categories.some(c => c.id === 'performance'));
});

test("a registered phone number is distinct from a registered financial entity", () => {
  const phone = analyzeCase({ claims: 'Use the mobile number you have registered with your bank.' });
  assert.ok(!phone.findings[0].categories.some(c => c.id === 'regulatory-status'));
  const broker = analyzeCase({ claims: 'We are a SEBI registered stock broker.' });
  assert.ok(broker.findings[0].categories.some(c => c.id === 'regulatory-status'));
});

test("question wording and a brand name do not create a superlative", () => {
  for (const input of [
    { claims: 'What best describes your current capacity to invest?' },
    { company: 'Home First', claims: 'Home First offers home loans with online applications.' }
  ]) assert.ok(!analyzeCase(input).findings[0].categories.some(c => c.id === 'superlative'));
  assert.ok(analyzeCase({company:'Home First', claims:'Home First offers the best home loans.'}).findings[0].categories.some(c => c.id === 'superlative'));
});

test("qualified instant-loan variants are detected without flagging instant payments", () => {
  for (const claims of ['Get instant personal & business loans online.', 'Get instant cash loans online.', 'Get instant approval on loans.']) {
    assert.ok(analyzeCase({ claims }).findings[0].categories.some(c => c.id === 'lending-cost'));
  }
  assert.ok(!analyzeCase({claims:'Make instant UPI payments with our app.'}).findings[0].categories.some(c => c.id === 'lending-cost'));
});

test("support channels are distinct from investment tip channels", () => {
  assert.ok(!analyzeCase({claims:'Contact our support team on WhatsApp.'}).findings[0].categories.some(c => c.id === 'tips-channel'));
  assert.ok(analyzeCase({claims:'Receive our stock tips on WhatsApp.'}).findings[0].categories.some(c => c.id === 'tips-channel'));
});

test("security certainty and customer scale receive their own review categories", () => {
  const categories = analyzeCase({claims:'Our fraud-free platform is trusted by 200+ global brands.'}).findings[0].categories.map(c => c.id);
  assert.ok(categories.includes('security-certainty'));
  assert.ok(categories.includes('scale'));
});
