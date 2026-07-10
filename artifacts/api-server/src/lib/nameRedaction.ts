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

// A blind "replace the name with a fixed string" pass produces ungrammatical
// output when the name is immediately preceded by a leading role/title
// phrase describing a DIFFERENT person than "the current CS leader" — e.g.
// evidence like "New CEO Jane Doe brings Zelis and Cotiviti experience..."
// (a new CEO mentioned in passing within CS-Leadership evidence) became
// "New CEO the current CS leader brings..." once the name was swapped in
// place. This pass runs FIRST and consumes the whole "[modifier] RoleTitle
// Name Name" span, collapsing it into a natural "The [modifier] RoleTitle"
// (e.g. "The new CEO") instead of leaving the role phrase dangling next to
// the generic replacement string. It intentionally does NOT touch bare
// "CS Leader"/"CS leadership" phrasing — those already read correctly once
// the name alone is swapped by the generic pass below.
const LEADING_ROLE_MODIFIERS = ["New", "Incoming", "Former", "Outgoing", "Current", "Interim", "Newly-appointed"];
const LEADING_ROLE_TITLES = [
  "CEO",
  "CFO",
  "CTO",
  "COO",
  "CMO",
  "CRO",
  "President",
  "Founder",
  "Co-Founder",
  "Chairman",
  "Chair",
  "VP",
  "Vice President",
];
const LEADING_ROLE_NAME_RE = new RegExp(
  `\\b(?:(${LEADING_ROLE_MODIFIERS.join("|")})\\s+)?(${LEADING_ROLE_TITLES.join("|")})\\s+${TITLE_CASE_WORD}\\s+${TITLE_CASE_WORD}\\b`,
  "g",
);

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

  // "[modifier] RoleTitle Name Name" spans first, restructured into "The
  // [modifier] RoleTitle" rather than a blind name swap (see comment above).
  redacted = redacted.replace(LEADING_ROLE_NAME_RE, (_fullMatch, modifier: string | undefined, roleTitle: string) => {
    return modifier ? `The ${modifier.toLowerCase()} ${roleTitle}` : `The ${roleTitle}`;
  });

  // Full "First Last" occurrences next, so we don't leave a dangling
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
