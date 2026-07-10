// ---------------------------------------------------------------------------
// Legacy demo tenant data — public API for the "./data" subpath export.
//
// NOT exported from the lib's main index ("."): this is ~80KB of narrative
// demo copy that the frontend bundle should never pull in. Only server-side
// consumers (cs-rescue's one-time scripts, api-server's legacy-tenant seed
// endpoint) should import from "@workspace/portfolio-engine/data".
// ---------------------------------------------------------------------------
export { LEGACY_FIRMS_META } from "./firmsMeta";

export { default as STG_COMPANIES } from "./stg";
export { default as PAMLICO_COMPANIES } from "./pamlico";
export { default as RAVIGA_COMPANIES } from "./raviga";
export { default as LONGARC_COMPANIES } from "./longarc";
export { default as SOLEN_COMPANIES } from "./solen";
