import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { MessageSquare, X, Send, Copy, Check, Sparkles } from "lucide-react";
import { getFirmCompany, type Company, type Firm } from "@/data/portfolio";

// ---------------------------------------------------------------------------
// Prompt starters per audience mode
// ---------------------------------------------------------------------------
const STARTERS_PE = [
  "Summarize top 3 risks for my IC memo",
  "Turn this company's top gap into a gameplan",
  "Draft a board-ready one-pager",
  "Compare this company to portfolio benchmarks",
];

const STARTERS_PORTCO = [
  "Draft a 100-day improvement roadmap for my team",
  "Frame our top CS gap as an internal initiative",
  "Summarize our operational status for leadership",
  "What should we prioritize to move up a tier?",
];

// ---------------------------------------------------------------------------
// Serialize company data for API payload (no circular refs)
// ---------------------------------------------------------------------------
function buildCompanyPayload(company: Company | null | undefined) {
  if (!company) return null;
  return {
    name: company.name,
    tier: company.tier.id,
    tierLabel: company.tier.label,
    composite: company.composite,
    displayMax: company.displayMax,
    arrDisplay: company.arrDisplay,
    summary: company.summary.slice(0, 400),
    engagement: company.engagement,
    gaps: company.gaps.slice(0, 5).map((g) => ({
      pillarName: g.pillar.name,
      score: g.score,
      note: g.note,
    })),
  };
}

// ---------------------------------------------------------------------------
// Main component — slide-over + floating trigger
// ---------------------------------------------------------------------------
interface AskInvesqProps {
  firm: Firm;
}

export function AskInvesq({ firm }: AskInvesqProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"pe-ops" | "portco">("pe-ops");
  const [prompt, setPrompt] = useState("");
  const [draft, setDraft] = useState<string | null>(null);
  const [source, setSource] = useState<"ai" | "canned" | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [location] = useLocation();

  // Parse current company from URL if on a company page
  const companySegMatch = location.match(/\/portfolio\/([^/]+?)(?:\/|$)/);
  const companyId = companySegMatch?.[1];
  const company =
    companyId && companyId !== "gameplan"
      ? getFirmCompany(firm.slug, companyId)
      : null;

  const companyPayload = buildCompanyPayload(company);
  const starters = mode === "pe-ops" ? STARTERS_PE : STARTERS_PORTCO;

  const handleSubmit = async (p: string) => {
    const text = p.trim();
    if (!text || loading) return;
    setLoading(true);
    setDraft(null);
    setSource(null);

    try {
      const res = await fetch("/api/invesq/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          prompt: text,
          company: companyPayload,
          firmSlug: firm.slug,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { draft: string; source: "ai" | "canned" };
      setDraft(data.draft);
      setSource(data.source);
    } catch {
      setDraft(
        "Unable to reach the draft service. Please check your connection and try again.",
      );
      setSource("canned");
    } finally {
      setLoading(false);
    }
  };

  const handleStarter = (s: string) => {
    setPrompt(s);
    handleSubmit(s);
  };

  const handleCopy = () => {
    if (!draft) return;
    navigator.clipboard.writeText(draft).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 hover:shadow-primary/30 hover:shadow-xl transition-all"
        aria-label="Open Ask INVESQ"
      >
        <Sparkles className="h-4 w-4" />
        Ask INVESQ
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-over panel */}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-[420px] flex-col border-l border-border bg-background shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex flex-none items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Ask INVESQ</span>
            <span className="rounded border border-rose-500/20 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-medium text-rose-300">
              Demo Sandbox
            </span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Audience toggle */}
        <div className="flex-none border-b border-border px-4 py-3">
          <div className="flex overflow-hidden rounded-lg border border-border bg-card text-xs">
            {(["pe-ops", "portco"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setDraft(null);
                }}
                className={`flex-1 py-1.5 font-medium transition-colors ${
                  mode === m
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "pe-ops" ? "PE Ops Draft" : "PortCo-Facing"}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground/60">
            {mode === "pe-ops"
              ? "Direct, cross-portfolio framing — for internal IC and ops use."
              : "Collaborative, forward-looking framing — for portfolio company teams."}
          </p>
        </div>

        {/* Company context pill */}
        {company && (
          <div className="flex flex-none items-center gap-2 border-b border-border bg-card/30 px-4 py-2 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Grounded on:
            <span className="font-medium text-foreground">{company.name}</span>
            <span className={`rounded border px-1.5 py-0.5 text-[10px] ${company.tier.badgeClass}`}>
              T{company.tier.id}
            </span>
          </div>
        )}

        {/* Scrollable body */}
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {/* Prompt starters */}
          {!draft && !loading && (
            <div>
              <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                Quick starts
              </div>
              <div className="grid grid-cols-1 gap-2">
                {starters.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStarter(s)}
                    className="rounded-lg border border-border bg-card px-3 py-2.5 text-left text-xs leading-snug text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center gap-3 px-1 py-8">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-2 w-2 animate-bounce rounded-full bg-primary/60"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">Drafting…</span>
            </div>
          )}

          {/* Draft output */}
          {draft && !loading && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-primary" />
                  {source === "ai" ? "AI draft" : "Templated draft"}
                  {source === "canned" && (
                    <span className="ml-1 text-amber-400/80">
                      · Add ANTHROPIC_API_KEY for live AI
                    </span>
                  )}
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 rounded border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-border/80 hover:text-foreground"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="whitespace-pre-wrap rounded-lg border border-border bg-card p-4 font-mono text-xs leading-relaxed text-foreground/90">
                {draft}
              </div>
              <button
                onClick={() => {
                  setDraft(null);
                  setPrompt("");
                }}
                className="mt-2 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              >
                ← New draft
              </button>
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="flex-none border-t border-border p-4">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(prompt);
                }
              }}
              placeholder={company ? `Ask about ${company.name}…` : "Ask about the portfolio…"}
              rows={2}
              className="flex-1 resize-none rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            <button
              onClick={() => handleSubmit(prompt)}
              disabled={loading || !prompt.trim()}
              className="flex-none rounded-md bg-primary p-2.5 text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground/50">
            Draft only · review before sharing · not for external distribution
          </p>
        </div>
      </div>
    </>
  );
}
