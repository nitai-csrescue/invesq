import { isAllowedAdminEmail } from "./auth.js";

export interface Validator {
  email: string;
  name: string;
}

// Parses the VALIDATOR_EMAILS env var into the set of admins whose sign-off is
// required before a report's client PDF unlocks. Format: a comma-separated list
// of either "Name <email>" or a bare "email" (the local part becomes the
// display name). Fail-closed by design:
//   - Unset/empty => [] (dual validation is impossible; the client PDF stays
//     locked and the validate route 503s), never a throw at boot.
//   - Each entry must ALSO pass the admin allowlist (isAllowedAdminEmail), so a
//     misconfigured non-admin address can never become a valid signer.
// Emails are lower-cased and de-duplicated so comparisons elsewhere are exact.
export function getConfiguredValidators(): Validator[] {
  const raw = process.env.VALIDATOR_EMAILS;
  if (!raw || !raw.trim()) return [];

  const seen = new Set<string>();
  const validators: Validator[] = [];
  for (const part of raw.split(",")) {
    const entry = part.trim();
    if (!entry) continue;

    let name: string;
    let email: string;
    const angle = entry.match(/^(.*?)<([^>]+)>$/);
    if (angle) {
      name = angle[1].trim();
      email = angle[2].trim().toLowerCase();
    } else {
      email = entry.toLowerCase();
      name = "";
    }

    if (!isAllowedAdminEmail(email)) continue;
    if (seen.has(email)) continue;
    seen.add(email);
    validators.push({ email, name: name || email.split("@")[0] });
  }
  return validators;
}

// Returns the configured Validator matching this email, or null. Used by the
// validate route to (a) reject non-validators (403) and (b) capture the
// canonical display name at sign-off time.
export function findValidator(email: string | null | undefined): Validator | null {
  if (!email) return null;
  const target = email.toLowerCase();
  return getConfiguredValidators().find((v) => v.email === target) ?? null;
}
