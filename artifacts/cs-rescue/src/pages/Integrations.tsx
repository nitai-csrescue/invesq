import { useState } from "react";
import { PageHeader } from "@/components/cs/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Check } from "lucide-react";
import { integrations, type Integration, type IntegrationStatus } from "@/data";

const STATUS_META: Record<IntegrationStatus, { label: string; classes: string }> = {
  connected: { label: "Connected", classes: "border-emerald-400/30 text-emerald-300 bg-emerald-500/10" },
  mock: { label: "Mock data", classes: "border-amber-400/30 text-amber-300 bg-amber-500/10" },
  planned: { label: "Planned", classes: "border-slate-500/30 text-slate-400 bg-slate-700/10" },
};

const CATEGORIES = ["All", "CRM", "Support", "Product Analytics", "Comms", "Data Warehouse", "Customer Success"];

export default function Integrations() {
  const [tab, setTab] = useState("All");
  const filtered = tab === "All" ? integrations : integrations.filter((i) => i.category === tab);

  return (
    <div className="p-6 max-w-[1500px] mx-auto" data-testid="integrations-page">
      <PageHeader
        eyebrow="Connected systems"
        title="Integrations"
        subtitle="Every integration that powers signals, playbooks, and actions in INVESQ."
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-slate-900/60 mb-4 flex-wrap h-auto">
          {CATEGORIES.map((c) => <TabsTrigger key={c} value={c}>{c}</TabsTrigger>)}
        </TabsList>
        <TabsContent value={tab}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((i) => <IntegrationCard key={i.id} integration={i} />)}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function IntegrationCard({ integration }: { integration: Integration }) {
  const { toast } = useToast();
  const meta = STATUS_META[integration.status];
  const isConnected = integration.status === "connected";

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4 flex flex-col" data-testid={`integration-${integration.id}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br border flex items-center justify-center text-xl font-bold ${integration.iconColor}`}>
          {integration.iconLetter}
        </div>
        <Badge variant="outline" className={`text-[10px] uppercase ${meta.classes}`}>
          {isConnected && <Check className="w-3 h-3 mr-1" />}
          {meta.label}
        </Badge>
      </div>
      <p className="text-sm font-semibold text-white">{integration.name}</p>
      <p className="text-[11px] text-slate-500 mt-0.5">{integration.category}</p>
      <p className="text-xs text-slate-300 mt-3 leading-relaxed">{integration.whyItMatters}</p>

      <div className="mt-3">
        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">Contributes</p>
        <ul className="space-y-0.5">
          {integration.contributesData.map((d) => (
            <li key={d} className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-slate-500" /> {d}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto pt-4">
        {integration.status === "planned" ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>
                <Button variant="outline" size="sm" className="w-full" disabled>Coming soon</Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>On the roadmap — talk to your CS team.</TooltipContent>
          </Tooltip>
        ) : (
          <Button
            variant={isConnected ? "outline" : "default"}
            size="sm"
            className={`w-full ${!isConnected && "bg-cyan-500 hover:bg-cyan-400 text-slate-950"}`}
            onClick={() => toast({ title: isConnected ? `${integration.name} settings` : `${integration.name} connecting…`, description: "Demo mode — no changes were made." })}
            data-testid={`integration-action-${integration.id}`}
          >
            {isConnected ? "Manage" : "Connect"}
          </Button>
        )}
      </div>
    </div>
  );
}
