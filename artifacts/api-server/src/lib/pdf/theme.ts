// Design tokens for the branded "CS Rescue" Diagnostic Report PDF.
// These are the exact values supplied by the user (2026-07-10 correction) —
// do NOT approximate or substitute nearby Tailwind/shadcn colors.

export const COLORS = {
  navy500: "#1E3A5F",
  navy600: "#1A3354",
  navy700: "#142943",
  navy800: "#0F1E30",

  orange500: "#E8681A",
  orange600: "#CF5910",

  slate200: "#E1E7EF",
  slate500: "#647488",
  slate700: "#344256",
  slate900: "#111C28",

  success500: "#16A34A",
  success700: "#15803D",
  success50: "#ECFDF3",

  warning500: "#F59E0B",
  warning700: "#B4730B",
  warning50: "#FEF6E7",

  danger500: "#DC2626",
  danger700: "#B01B1B",
  danger50: "#FDECEC",

  info500: "#2563EB",

  // Not part of the supplied token list — no exact hex was given for the
  // "NA / Insufficient Data" status. Modeled as a neutral gray family to sit
  // alongside success/warning/danger without implying it's a 4th "real"
  // brand color. Flagged to the user as an assumption.
  neutral500: "#647488", // reuses slate-500
  neutral700: "#475569",
  neutral50: "#F1F5F9",

  white: "#FFFFFF",
} as const;

export const RADII = {
  lg: "14px",
  md: "10px",
  pill: "999px",
} as const;

export const FONTS = {
  serif: "'Source Serif 4', Georgia, serif",
  sans: "'Public Sans', system-ui, -apple-system, sans-serif",
  mono: "'IBM Plex Mono', ui-monospace, 'SFMono-Regular', monospace",
} as const;

// Rubric-v2 band status treatment (CQ-20 hard gate, 2026-07-21): the report
// renders 4-pillar Low/Medium/High ratings, colored per Jay's sign-off —
// Low = red (danger), Medium = amber (warning), High = green (success),
// Insufficient Data = neutral gray (same assumption note as before: no exact
// hex was supplied for the neutral family).
export interface BandStatus {
  key: "low" | "medium" | "high" | "id";
  label: string;
  text: string;
  bg: string;
  border: string;
}

export const BAND_STATUS: Record<"Low" | "Medium" | "High" | "Insufficient Data", BandStatus> = {
  High: { key: "high", label: "High", text: COLORS.success700, bg: COLORS.success50, border: COLORS.success500 },
  Medium: { key: "medium", label: "Medium", text: COLORS.warning700, bg: COLORS.warning50, border: COLORS.warning500 },
  Low: { key: "low", label: "Low", text: COLORS.danger700, bg: COLORS.danger50, border: COLORS.danger500 },
  "Insufficient Data": {
    key: "id",
    label: "Insufficient Data",
    text: COLORS.neutral700,
    bg: COLORS.neutral50,
    border: COLORS.neutral500,
  },
};

export function bandStatusFor(value: "Low" | "Medium" | "High" | "Insufficient Data"): BandStatus {
  return BAND_STATUS[value];
}

// Orange four-point sparkle/star glyph used as the accent bullet mark
// throughout (spec: "a four-point sparkle/star character").
export const SPARKLE = "\u2726"; // ✦ BLACK FOUR POINTED STAR

// 7 pages: the "Methodology & Sources" page (page7Sources.ts) is rendered
// again (sources framed as methodology categories, not fabricated URLs).
// Consumed by pageFooter's "PAGE N OF T", so this single constant is the one
// place the total is declared.
export const TOTAL_PAGES = 7;
