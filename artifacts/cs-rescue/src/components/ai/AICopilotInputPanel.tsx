import { Sparkles, Loader2, Building2, User } from "lucide-react";
import type { Account, Deployment } from "@workspace/api-client-react";
import { PERSONAS, type Persona } from "@/lib/persona";
import { GOALS, type Goal, type Scope } from "@/services/ai/generateBriefing";
import { cn } from "@/lib/utils";

interface Props {
  persona: Persona;
  setPersona: (p: Persona) => void;
  scope: Scope;
  setScope: (s: Scope) => void;
  accountId: string | null;
  setAccountId: (id: string | null) => void;
  deploymentId: string | null;
  setDeploymentId: (id: string | null) => void;
  goal: Goal;
  setGoal: (g: Goal) => void;
  prompt: string;
  setPrompt: (s: string) => void;
  accounts: Account[];
  deployments: Deployment[];
  onGenerate: () => void;
  isGenerating: boolean;
  /** When true, generation is blocked (e.g. graph data still loading). */
  disabled?: boolean;
}

const FIELD_BASE =
  "w-full bg-slate-900/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/60 focus:border-cyan-400/40 transition-colors";

export function AICopilotInputPanel({
  persona,
  setPersona,
  scope,
  setScope,
  accountId,
  setAccountId,
  deploymentId,
  setDeploymentId,
  goal,
  setGoal,
  prompt,
  setPrompt,
  accounts,
  deployments,
  onGenerate,
  isGenerating,
  disabled = false,
}: Props) {
  const isCompany = scope === "company";
  // Company scope is meaningless for the outside-in customer persona — lock it.
  const companyDisabled = persona === "customer";
  // Filter deployments by selected account, if any
  const filteredDeployments = accountId
    ? deployments.filter((d) => d.accountId === accountId)
    : deployments;

  return (
    <aside
      className="w-full lg:w-[320px] shrink-0 border-r border-white/5 bg-slate-950/60 backdrop-blur-sm h-full overflow-y-auto"
      data-testid="copilot-input-panel"
    >
      <div className="p-5 space-y-5">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">AI Copilot</p>
          <h2 className="text-lg font-semibold text-white">Generate a briefing</h2>
          <p className="text-xs text-slate-400 mt-1">
            Pick a persona and goal — Copilot uses live architecture data to produce a demo-ready summary.
          </p>
        </div>

        {/* Scope */}
        <div>
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
            Scope
          </span>
          <div
            role="group"
            aria-label="Briefing scope"
            className="mt-1.5 grid grid-cols-2 gap-1 p-1 rounded-lg bg-slate-900/60 border border-white/10"
            data-testid="copilot-scope-toggle"
          >
            <button
              type="button"
              onClick={() => setScope("company")}
              disabled={companyDisabled}
              data-testid="copilot-scope-company"
              aria-pressed={isCompany}
              title={companyDisabled ? "Company scope isn't available for the Customer persona." : undefined}
              className={cn(
                "flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-semibold transition-colors",
                isCompany
                  ? "bg-cyan-500/20 border border-cyan-400/40 text-cyan-100"
                  : "text-slate-400 hover:text-white",
                companyDisabled && "opacity-40 cursor-not-allowed hover:text-slate-400",
              )}
            >
              <Building2 className="w-3.5 h-3.5" />
              Company
            </button>
            <button
              type="button"
              onClick={() => setScope("customer")}
              data-testid="copilot-scope-customer"
              aria-pressed={!isCompany}
              className={cn(
                "flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-semibold transition-colors",
                !isCompany
                  ? "bg-indigo-500/20 border border-indigo-400/40 text-indigo-100"
                  : "text-slate-400 hover:text-white",
              )}
            >
              <User className="w-3.5 h-3.5" />
              Customer
            </button>
          </div>
          <p className="mt-1.5 text-[10px] text-slate-500 leading-relaxed">
            {isCompany
              ? "Aggregating signals across every active deployment."
              : "Focusing on a single account and deployment."}
          </p>
        </div>

        {/* Persona */}
        <div>
          <label
            htmlFor="copilot-persona"
            className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold"
          >
            Persona
          </label>
          <select
            id="copilot-persona"
            value={persona}
            onChange={(e) => setPersona(e.target.value as Persona)}
            className={cn(FIELD_BASE, "mt-1.5")}
            data-testid="copilot-persona-select"
          >
            {PERSONAS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Account + Deployment — only when scope = customer */}
        {isCompany ? (
          <div className="text-[11px] text-slate-500 italic px-3 py-2 rounded-lg bg-slate-900/40 border border-white/5" data-testid="copilot-context-all">
            Context: <span className="text-slate-300 not-italic font-medium">All accounts · all deployments</span>
          </div>
        ) : (
          <>
        <div>
          <label
            htmlFor="copilot-account"
            className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold"
          >
            Account
          </label>
          <select
            id="copilot-account"
            value={accountId ?? ""}
            onChange={(e) => {
              const v = e.target.value || null;
              setAccountId(v);
              setDeploymentId(null); // reset deployment when account changes
            }}
            className={cn(FIELD_BASE, "mt-1.5")}
            data-testid="copilot-account-select"
          >
            <option value="">— Any account —</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        {/* Deployment */}
        <div>
          <label
            htmlFor="copilot-deployment"
            className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold"
          >
            Deployment
          </label>
          <select
            id="copilot-deployment"
            value={deploymentId ?? ""}
            onChange={(e) => setDeploymentId(e.target.value || null)}
            className={cn(FIELD_BASE, "mt-1.5")}
            data-testid="copilot-deployment-select"
          >
            <option value="">— Any deployment —</option>
            {filteredDeployments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} · {d.healthScore}%
              </option>
            ))}
          </select>
        </div>
          </>
        )}

        {/* Goal */}
        <div>
          <label
            htmlFor="copilot-goal"
            className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold"
          >
            Goal
          </label>
          <select
            id="copilot-goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value as Goal)}
            className={cn(FIELD_BASE, "mt-1.5")}
            data-testid="copilot-goal-select"
          >
            {GOALS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        {/* Optional freeform prompt */}
        <div>
          <label
            htmlFor="copilot-prompt-input"
            className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold"
          >
            Anything specific?
          </label>
          <textarea
            id="copilot-prompt-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Summarize top risks, generate a demo summary…"
            rows={3}
            className={cn(FIELD_BASE, "mt-1.5 resize-none")}
            data-testid="copilot-prompt"
          />
        </div>

        <button
          onClick={onGenerate}
          disabled={isGenerating || disabled}
          data-testid="copilot-generate"
          className={cn(
            "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all",
            "bg-gradient-to-br from-cyan-500 to-indigo-500 text-white shadow-lg shadow-cyan-900/40",
            "hover:from-cyan-400 hover:to-indigo-400 disabled:opacity-60 disabled:cursor-not-allowed",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300",
          )}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating…
            </>
          ) : disabled ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading data…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate Briefing
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
