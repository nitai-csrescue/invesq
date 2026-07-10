// Heuristic, render-time redaction of named individuals from free-text
// evidence. This is deliberately NOT a full NLP/NER solution — it is a
// narrow, targeted mitigation for one known leakage path (see reportExport.ts
// "CS Leadership" gap description) where analyst-written evidence text can
// name a real person. It never touches stored data; callers apply it only to
// the specific output field(s) that need it, at read/serve time.
//
// Heuristic: a "candidate name" is two consecutive Title-Case words (each
// matching /^[A-Z][a-z]+$/, so ALL-CAPS acronyms like "CEO"/"CRO" and
// internally-capitalized product/brand names like "SaaS"/"LinkedIn" never
// match) where neither word is a known role/title/org stopword (e.g. "Global
// Director", "Customer Success", "Channel Chief" are role phrases, not
// names). Once a full name is found, standalone occurrences of its first or
// last name elsewhere in the same text are also redacted, so a text that
// later refers back to just "Kendra" is still covered.
//
// This is intentionally conservative in scope (only applied to one field by
// its caller) since it can occasionally misfire on two-word proper nouns it
// has never seen (e.g. an unfamiliar product or place name) — an admin
// reviews generated reports before they leave the tool, so this is a
// best-effort layer, not a guarantee.

const ROLE_STOPWORDS = new Set(
  [
    "Global",
    "Director",
    "Head",
    "Customer",
    "Success",
    "Member",
    "Support",
    "Chief",
    "Officer",
    "President",
    "Manager",
    "Level",
    "Executive",
    "Senior",
    "Vice",
    "Board",
    "Team",
    "Function",
    "Public",
    "Insufficient",
    "Operations",
    "National",
    "Regional",
    "Channel",
    "Company",
    "Portfolio",
    "Diagnostic",
    "Signal",
    "Leadership",
    "Group",
    "Division",
    "Department",
    "Program",
    "Product",
    "Platform",
    "Service",
    "Services",
    "Business",
    "Organization",
    "Segment",
    "Market",
    "Sales",
    "Marketing",
    "Finance",
    "Technology",
    "Engineering",
    "Strategy",
    "Growth",
    "Development",
    "Partner",
    "Partners",
    "Founder",
    "Founders",
    "Owner",
    "Fund",
    "Firm",
    "Committee",
    "Advisory",
    "Council",
    "Data",
    "Evidence",
    "Role",
    "Title",
    "Mandate",
    "Scope",
    "Strategic",
    "Authority",
    "Visibility",
    "Ceiling",
    "Recommendation",
    "Score",
    "Pillar",
    "Rubric",
    "Assessment",
    "Capital",
    "Holdings",
    "Ventures",
    "Technologies",
    "Solutions",
    "Systems",
    "Software",
    "Labs",
    "Media",
    "Networks",
  ].map((w) => w.toLowerCase()),
);

const TITLE_CASE_WORD = "[A-Z][a-z]+";
const NAME_BIGRAM_RE = new RegExp(`\\b(${TITLE_CASE_WORD})\\s+(${TITLE_CASE_WORD})\\b`, "g");

const DEFAULT_REPLACEMENT = "the current CS leader";

function isRoleWord(word: string): boolean {
  return ROLE_STOPWORDS.has(word.toLowerCase());
}

// Redacts likely person names from `text`, replacing them with
// `replacement` (default: a neutral role reference). Returns the text
// unchanged if no candidate name is found.
export function redactNamedIndividuals(text: string, replacement: string = DEFAULT_REPLACEMENT): string {
  if (!text) return text;

  const candidateTokens = new Set<string>();
  const matches = [...text.matchAll(NAME_BIGRAM_RE)];
  for (const match of matches) {
    const [, first, last] = match;
    if (isRoleWord(first) || isRoleWord(last)) continue;
    candidateTokens.add(first);
    candidateTokens.add(last);
  }

  if (candidateTokens.size === 0) return text;

  let redacted = text;

  // Full "First Last" occurrences first, so we don't leave a dangling
  // first/last-name-only replacement immediately followed by another one.
  redacted = redacted.replace(NAME_BIGRAM_RE, (fullMatch, first: string, last: string) => {
    if (isRoleWord(first) || isRoleWord(last)) return fullMatch;
    return replacement;
  });

  // Then any standalone leftover mentions of the identified name tokens
  // (e.g. a later sentence referring back to just the first name).
  for (const token of candidateTokens) {
    const tokenRe = new RegExp(`\\b${token}\\b`, "g");
    redacted = redacted.replace(tokenRe, replacement);
  }

  return redacted;
}
