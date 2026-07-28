// ---------------------------------------------------------------------------
// THE single canonical rubric-version identifier for the whole system.
//
// Every store that stamps a rubric/methodology version (Postgres
// assessments.rubric_version, findings.rubric_version,
// report_exports.rubric_version, and the Notion "Rubric Version" select)
// derives from RUBRIC_VERSION below. Never re-declare a version literal in
// another module — that is exactly the drift this file exists to prevent
// (rubricV2.ts and reportExport.ts previously each kept their own).
//
// WHEN TO BUMP: any pillar/scoring/enum change — adding/removing/renaming a
// pillar, changing score bucketing or composite/band math, changing the
// score-label enum, or any change that makes previously stored
// scores/reports methodologically incomparable with new ones. Bump the
// number by one (v7, v8, ...); NEVER renumber history. The v1-v6 sequence
// (see the changelog in reportExport.ts) is canonical.
//
// History anchor: "v1" is the pre-migration 8-pillar generation; "v2"-"v6"
// are all 4-pillar-era revisions. Notion's "Rubric Version" select only has
// the two GENERATION options, so canonical versions map onto them via
// notionRubricVersionLabel().
// ---------------------------------------------------------------------------

/** Canonical current rubric version. Stamped on every new diagnostic write. */
export const RUBRIC_VERSION = "v6";

/** The pre-4-pillar-migration generation (8-pillar rows, no rubric columns). */
export const RUBRIC_VERSION_LEGACY = "v1";

/** Notion "Rubric Version" select option for the 8-pillar generation. */
export const NOTION_RUBRIC_LABEL_V1 = "v1 - 8 Pillar";
/** Notion "Rubric Version" select option for the 4-pillar (remapped) generation. */
export const NOTION_RUBRIC_LABEL_V2 = "v2 - 4 Pillar (remapped)";

/**
 * Map a canonical rubric version onto Notion's two fixed generation labels:
 * "v1" -> the 8-pillar option; everything later ("v2".."v6"+) -> the
 * 4-pillar (remapped) option.
 */
export function notionRubricVersionLabel(version: string): string {
  return version === RUBRIC_VERSION_LEGACY ? NOTION_RUBRIC_LABEL_V1 : NOTION_RUBRIC_LABEL_V2;
}
