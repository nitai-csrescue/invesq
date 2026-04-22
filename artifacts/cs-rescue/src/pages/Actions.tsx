import { useMemo, useState } from "react";
import { PageHeader } from "@/components/cs/PageHeader";
import { SourceBadge } from "@/components/cs/SourceBadge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Play } from "lucide-react";
import { actions as seedActions, getAccount, getTeamMember, type ActionItem, type ActionStatus } from "@/data";

export default function Actions() {
  const [list, setList] = useState<ActionItem[]>(seedActions);
  const [tab, setTab] = useState<ActionStatus>("queued");
  const { toast } = useToast();

  const counts = useMemo(() => ({
    queued: list.filter((a) => a.status === "queued").length,
    "in-progress": list.filter((a) => a.status === "in-progress").length,
    completed: list.filter((a) => a.status === "completed").length,
  }), [list]);

  const filtered = list.filter((a) => a.status === tab);

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
        subtitle="Every recommended next step — sourced from AI, playbooks, or manual triage."
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as ActionStatus)}>
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
                      <TableRow key={a.id} className="border-white/5" data-testid={`action-row-${a.id}`}>
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
