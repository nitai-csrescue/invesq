// The OpenAPI-generated `DiagnosticReportDataScores` type is `number | string`
// per pillar (a loose oneOf), but the actual runtime value produced by
// `reportExport.ts` (via `textToScore`/`scoreToText`) is always either a
// literal `number` (0/1/2) or the literal string `"NA"` — never any other
// string. This parses that raw value into the narrow type the PDF templates
// actually need, throwing on anything else rather than silently coercing
// (e.g. `Number("Insufficient Data")` would silently become `NaN`).
export function parseRawScore(raw: number | string): number | "NA" {
  if (raw === "NA") return "NA";

  const n = typeof raw === "number" ? raw : Number(raw);
  if (n !== 0 && n !== 1 && n !== 2) {
    throw new Error(`Unexpected raw pillar score value: ${JSON.stringify(raw)}`);
  }
  return n;
}
