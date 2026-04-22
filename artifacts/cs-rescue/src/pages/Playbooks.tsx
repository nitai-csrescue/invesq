import { useState } from "react";
import { PageHeader } from "@/components/cs/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Play, CheckCircle2, Circle } from "lucide-react";
import { playbooks, PLAYBOOK_CATEGORIES, getAccount, getTeamMember, type Playbook } from "@/data";

export default function Playbooks() {
  const [open, setOpen] = useState<Playbook | null>(null);
  const { toast } = useToast();

  return (
    <div className="p-6 max-w-[1500px] mx-auto" data-testid="playbooks-page">
      <PageHeader
        eyebrow="Lifecycle library"
        title="Playbooks"
        subtitle={`${playbooks.length} playbooks across ${PLAYBOOK_CATEGORIES.length} categories — from onboarding to renewal.`}
      />

      <Tabs defaultValue="all">
        <TabsList className="bg-slate-900/60 mb-4 flex-wrap h-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          {PLAYBOOK_CATEGORIES.map((c) => <TabsTrigger key={c} value={c}>{c}</TabsTrigger>)}
        </TabsList>

        <TabsContent value="all">
          <Grid items={playbooks} onOpen={setOpen} />
        </TabsContent>
        {PLAYBOOK_CATEGORIES.map((cat) => (
          <TabsContent key={cat} value={cat}>
            <Grid items={playbooks.filter((p) => p.category === cat)} onOpen={setOpen} />
          </TabsContent>
        ))}
      </Tabs>

      <Sheet open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl bg-slate-950 border-l border-white/10 overflow-y-auto" data-testid="playbook-drawer">
          {open && (
            <>
              <SheetHeader className="text-left">
                <Badge variant="outline" className="w-fit text-[10px] uppercase">{open.category}</Badge>
                <SheetTitle className="text-2xl text-white">{open.name}</SheetTitle>
                <SheetDescription>{open.objective}</SheetDescription>
              </SheetHeader>

              <div className="mt-4 grid grid-cols-2 gap-3">
                {open.outcomes.map((o, i) => (
                  <div key={i} className="rounded-lg border border-emerald-400/20 bg-emerald-500/5 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-emerald-300">{o.metric}</p>
                    <p className="text-sm font-bold text-emerald-200 mt-0.5">{o.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Trigger</p>
                <p className="text-sm text-slate-200">{open.triggerCondition}</p>
                <p className="text-[11px] text-slate-500 mt-1">Stage: {open.stage} · Owner: {getTeamMember(open.ownerId)?.name}</p>
              </div>

              <div className="mt-6">
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-3">Steps</p>
                <ol className="space-y-2">
                  {open.steps.map((s, i) => (
                    <li key={i} className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3">
                      {s.done
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                        : <Circle className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" />}
                      <div>
                        <p className="text-sm font-semibold text-white">{i + 1}. {s.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{s.description}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="mt-6">
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Active accounts ({open.activeAccounts.length})</p>
                <div className="flex flex-wrap gap-2">
                  {open.activeAccounts.map((id) => {
                    const a = getAccount(id);
                    return a ? <Badge key={id} variant="outline">{a.name}</Badge> : null;
                  })}
                </div>
              </div>

              <div className="mt-6 sticky bottom-0 bg-slate-950 pt-4 border-t border-white/10">
                <Button
                  className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 gap-2"
                  data-testid="run-playbook-btn"
                  onClick={() => {
                    toast({ title: `${open.name} queued`, description: "Playbook will run for selected accounts." });
                    setOpen(null);
                  }}
                >
                  <Play className="w-4 h-4" /> Run playbook
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Grid({ items, onOpen }: { items: Playbook[]; onOpen: (p: Playbook) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map((pb) => {
        const completion = pb.steps.filter((s) => s.done).length / Math.max(pb.steps.length, 1);
        return (
          <button
            key={pb.id}
            onClick={() => onOpen(pb)}
            className="text-left rounded-xl border border-white/10 bg-slate-950/40 p-4 hover:border-cyan-400/30 hover:bg-cyan-500/5 transition-colors"
            data-testid={`playbook-${pb.id}`}
          >
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline" className="text-[10px] uppercase">{pb.category}</Badge>
              <Badge
                variant="outline"
                className={`text-[10px] ${pb.status === "active" ? "border-emerald-400/30 text-emerald-300" : pb.status === "draft" ? "border-amber-400/30 text-amber-300" : "border-slate-500/40 text-slate-400"}`}
              >
                {pb.status}
              </Badge>
            </div>
            <p className="text-sm font-semibold text-white">{pb.name}</p>
            <p className="text-[12px] text-slate-400 mt-1 line-clamp-2 min-h-[2.4em]">{pb.objective}</p>
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                <span>{pb.steps.length} steps</span>
                <span>{Math.round(completion * 100)}%</span>
              </div>
              <Progress value={completion * 100} className="h-1" />
            </div>
            <div className="flex items-center justify-between mt-3 text-[10px] text-slate-500">
              <span>{pb.activeAccounts.length} active</span>
              <span>{pb.runsLast30Days} runs · 30d</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
