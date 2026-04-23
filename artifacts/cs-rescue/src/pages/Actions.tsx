import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/cs/PageHeader";
import { SourceBadge } from "@/components/cs/SourceBadge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Play, X } from "lucide-react";
import {
  actions as seedActions,
  getAccount,
  getTeamMember,
  playbooks,
  type ActionItem,
  type ActionStatus,
} from "@/data";
import { usePersona, PERSONA_CURRENT_USER, type Persona } from "@/lib/persona";

const DEMO_CUSTOMER_ACCOUNT_ID = "a_stark";

interface PersonaScope {
  /** True if this persona filters the queue at all. */
  active: boolean;
  /** Filter applied to the action list. */
  filter: (a: ActionItem) => boolean;
  /** Short label shown in the "scoped to …" pill. */
  label: string;
  /** Subtitle override for the page header. */
  subtitle?: string;
}

function getPersonaScope(persona: Persona): PersonaScope {
  switch (persona) {
    case "cs": {
      const me = PERSONA_CURRENT_USER.cs;
      return {
        active: true,
        filter: (a) => a.ownerId === me,
        label: "Your queue",
        subtitle: "Actions assigned to you. Switch off the filter to see the full team queue.",
      };
    }
    case "post-sales":
      return {
        active: true,
        filter: (a) => {
          const pb = a.playbookId ? playbooks.find((p) => p.id === a.playbookId) : null;
          if (pb?.category === "Onboarding" || pb?.category === "Adoption") return true;
          return a.ownerId === PERSONA_CURRENT_USER["post-sales"];
        },
        label: "Onboarding & adoption",
        subtitle: "Actions tied to onboarding or adoption playbooks — driving accounts to first value.",
      };
    case "sales":
      return {
        active: true,
        filter: (a) => {
          const acct = a.accountId ? getAccount(a.accountId) : null;
          if (acct && acct.expansionPotential > 0) return true;
          const pb = a.playbookId ? playbooks.find((p) => p.id === a.playbookId) : null;
          return pb?.category === "Expansion" || pb?.category === "Renewal";
        },
        label: "Expansion & renewal",
        subtitle: "Actions tied to growth and renewal — where retention meets new ARR.",
      };
    case "support":
      return {
        active: true,
        filter: (a) => {
          const acct = a.accountId ? getAccount(a.accountId) : null;
          return acct ? acct.status === "at-risk" || acct.status === "churning" || acct.status === "watch" : false;
        },
        label: "Escalation queue",
        subtitle: "Actions tied to at-risk and churning accounts.",
      };
    case "customer":
      return {
        active: true,
        filter: (a) => a.accountId === DEMO_CUSTOMER_ACCOUNT_ID,
        label: "Stark Industries",
        subtitle: "Outside-in view: only the actions touching your account.",
      };
    case "vp":
    case "engineering":
    default:
      return {
        active: false,
        filter: () => true,
        label: "All actions",
      };
  }
}

export default function Actions() {
  const { persona } = usePersona();
  const [list, setList] = useState<ActionItem[]>(seedActions);
  const [tab, setTab] = useState<ActionStatus>("queued");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const { toast } = useToast();

  const scope = useMemo(() => getPersonaScope(persona), [persona]);

  // When switching personas, reset the manual override so the new scope takes effect.
  useEffect(() => {
    setShowAll(false);
  }, [persona]);

  // Customer persona is locked to its single account — no override.
  const filterActive = scope.active && (persona === "customer" || !showAll);

  // Deep-link: /actions?actionId=... switches to the action's tab + highlights row.
  // If the deep-linked action is hidden by the active persona filter, fall back
  // to the unfiltered view so the user always lands on something visible.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = new URLSearchParams(window.location.search).get("actionId");
    if (!id) return;
    const target = list.find((a) => a.id === id);
    if (!target) return;
    setTab(target.status);
    setHighlightId(id);
    if (scope.active && persona !== "customer" && !scope.filter(target)) {
      setShowAll(true);
    }
    requestAnimationFrame(() => {
      rowRefs.current[id]?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    const t = setTimeout(() => setHighlightId(null), 2400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useMemo(
    () => (filterActive ? list.filter(scope.filter) : list),
    [list, filterActive, scope],
  );

  const counts = useMemo(() => ({
    queued: visible.filter((a) => a.status === "queued").length,
    "in-progress": visible.filter((a) => a.status === "in-progress").length,
    completed: visible.filter((a) => a.status === "completed").length,
  }), [visible]);

  const filtered = visible.filter((a) => a.status === tab);

  function setStatus(id: string, status: ActionStatus) {
    setList((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    const action = list.find((a) => a.id === id);
    toast({
      title: status === "completed" ? "Action completed" : status === "in-progress" ? "Action started" : "Action requeued",
      description: action?.title,
    });
  }

  return (
    <div className="p-6 max-w-[1500px] mx-auto" data-testid="actions-page">
      <PageHeader
        eyebrow="Execution"
        title="Actions"
        subtitle={
          filterActive
            ? scope.subtitle ?? "Every recommended next step — sourced from AI, playbooks, or manual triage."
            : "Every recommended next step — sourced from AI, playbooks, or manual triage."
        }
      />

      {scope.active && (
        <div className="flex items-center gap-2 mb-4" data-testid="actions-persona-scope">
          {filterActive ? (
            <>
              <Badge variant="outline" className="border-cyan-400/30 text-cyan-200 bg-cyan-500/10">
                Scoped to: {scope.label}
              </Badge>
              {persona !== "customer" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-slate-400 hover:text-white"
                  onClick={() => setShowAll(true)}
                  data-testid="actions-show-all"
                >
                  <X className="w-3 h-3 mr-1" /> Show all actions
                </Button>
              )}
            </>
          ) : (
            <>
              <Badge variant="outline" className="border-slate-500/40 text-slate-300">
                Showing all actions
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-slate-400 hover:text-white"
                onClick={() => setShowAll(false)}
                data-testid="actions-rescope"
              >
                Re-apply {scope.label.toLowerCase()} filter
              </Button>
            </>
          )}
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as ActionStatus)} data-tour="actions-queue">
        <TabsList className="bg-slate-900/60 mb-4">
          <TabsTrigger value="queued">Queued <Badge variant="outline" className="ml-2 text-[10px]">{counts.queued}</Badge></TabsTrigger>
          <TabsTrigger value="in-progress">In Progress <Badge variant="outline" className="ml-2 text-[10px]">{counts["in-progress"]}</Badge></TabsTrigger>
          <TabsTrigger value="completed">Completed <Badge variant="outline" className="ml-2 text-[10px]">{counts.completed}</Badge></TabsTrigger>
        </TabsList>

        {(["queued", "in-progress", "completed"] as ActionStatus[]).map((s) => (
          <TabsContent key={s} value={s}>
            <div className="rounded-xl border border-white/10 bg-slate-950/40 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-white/10">
                    <TableHead className="text-slate-400">Action</TableHead>
                    <TableHead className="text-slate-400">Account</TableHead>
                    <TableHead className="text-slate-400">Source</TableHead>
                    <TableHead className="text-slate-400">Owner</TableHead>
                    <TableHead className="text-slate-400">Due</TableHead>
                    <TableHead className="text-slate-400 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(s === tab ? filtered : []).map((a) => {
                    const acct = a.accountId ? getAccount(a.accountId) : null;
                    const owner = getTeamMember(a.ownerId);
                    return (
                      <TableRow
                        key={a.id}
                        ref={(el) => { rowRefs.current[a.id] = el; }}
                        className={`border-white/5 transition-colors ${highlightId === a.id ? "bg-cyan-500/10 ring-1 ring-cyan-400/40" : ""}`}
                        data-testid={`action-row-${a.id}`}
                      >
                        <TableCell>
                          <div className="text-sm text-white font-medium">{a.title}</div>
                          {a.context && <div className="text-[11px] text-slate-500 mt-0.5">{a.context}</div>}
                        </TableCell>
                        <TableCell className="text-slate-300 text-sm">{acct?.name ?? "—"}</TableCell>
                        <TableCell><SourceBadge source={a.source} /></TableCell>
                        <TableCell className="text-slate-400 text-xs">{owner?.initials ?? "—"}</TableCell>
                        <TableCell className="text-slate-500 text-xs">{a.dueDate.slice(5)}</TableCell>
                        <TableCell className="text-right">
                          {a.status === "queued" && (
                            <Button size="sm" variant="outline" onClick={() => setStatus(a.id, "in-progress")} data-testid={`start-${a.id}`}>
                              <Play className="w-3 h-3 mr-1" /> Start
                            </Button>
                          )}
                          {a.status === "in-progress" && (
                            <Button size="sm" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950" onClick={() => setStatus(a.id, "completed")} data-testid={`complete-${a.id}`}>
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Complete
                            </Button>
                          )}
                          {a.status === "completed" && (
                            <span className="text-[11px] text-emerald-300 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Done
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(s === tab && filtered.length === 0) && (
                    <TableRow><TableCell colSpan={6} className="text-center py-12 text-slate-500">Nothing here. ✓</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
