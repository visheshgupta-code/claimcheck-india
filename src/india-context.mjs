import { readFileSync } from "node:fs";

const dataset = JSON.parse(readFileSync(new URL("../data/india-regulatory-sources.json", import.meta.url), "utf8"));
const defaultContext = "general-fintech";

export function validateCin(value) {
  const cin = String(value || "").trim().toUpperCase();
  if (!cin) return { value: null, status: "not-supplied", message: "No CIN supplied." };
  const valid = /^[LU][0-9]{5}[A-Z]{2}[0-9]{4}(?:PLC|PTC|OPC|NPL)[0-9]{6}$/.test(cin);
  return {
    value: cin,
    status: valid ? "format-valid" : "format-warning",
    message: valid
      ? "CIN format looks valid; verify the entity in MCA master data."
      : "CIN format is unusual; check the 21-character identifier against MCA master data."
  };
}

export function validateRegulatoryIdentifier(value) {
  const identifier = String(value || "").trim().toUpperCase();
  if (!identifier) return { value: null, status: "not-supplied", message: "No regulatory identifier supplied." };
  const looksLikeSebi = /^IN[A-Z][0-9]{9}$/.test(identifier);
  return {
    value: identifier,
    status: looksLikeSebi ? "format-valid" : "manual-check",
    message: looksLikeSebi
      ? "SEBI-style format detected; registry verification is still required."
      : "Identifier recorded for manual verification with the relevant Indian regulator."
  };
}

export function getIndiaContext(input = {}) {
  const requested = String(input.marketContext || defaultContext);
  const context = dataset.contexts.find((item) => item.id === requested)
    || dataset.contexts.find((item) => item.id === defaultContext);

  return {
    jurisdiction: dataset.jurisdiction,
    datasetVersion: dataset.version,
    notice: dataset.notice,
    marketContext: context.id,
    marketContextLabel: context.label,
    identifierChecks: {
      regulatoryIdentifier: validateRegulatoryIdentifier(input.regulatoryIdentifier),
      cin: validateCin(input.cin)
    },
    sources: dataset.sources.filter((source) => source.appliesTo.includes(context.id))
  };
}

export function getIndiaDataset() {
  return dataset;
}
