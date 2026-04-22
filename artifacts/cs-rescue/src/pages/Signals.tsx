import { PageHeader } from "@/components/cs/PageHeader";
import { SectionHeader } from "@/components/cs/SectionHeader";
import { SignalChip } from "@/components/cs/SignalChip";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  signalDefinitions,
  signalEvents,
  SIGNAL_CATEGORIES,
  getSignalDefinition,
  getAccount,
  type SignalCategory,
} from "@/data";

export default function Signals() {
  return (
    <div className="p-6 max-w-[1500px] mx-auto" data-testid="signals-page">
      <PageHeader
        eyebrow="Intelligence layer"
        title="Signals"
        subtitle="The patterns CS Rescue watches for across your customer data — and what each one triggers."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-8" data-tour="signal-categories">
        {SIGNAL_CATEGORIES.map((c) => {
          const count = signalDefinitions.filter((s) => s.category === c.id).length;
          const fired = signalEvents.filter((e) => getSignalDefinition(e.defId)?.category === c.id).length;
          return (
            <div key={c.id} className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{c.label}</p>
              <p className="text-2xl font-bold text-white mt-1">{count}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{fired} fired this week</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          {SIGNAL_CATEGORIES.map((cat) => {
            const defs = signalDefinitions.filter((s) => s.category === cat.id);
            return (
              <CategoryBlock key={cat.id} category={cat.id} label={cat.label} description={cat.description} defs={defs} />
            );
          })}
        </div>

        <div className="lg:col-span-2 rounded-xl border border-white/10 bg-slate-950/40 p-4 h-fit">
          <SectionHeader title="Live Signal Feed" subtitle="Last 14 days" />
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-white/10">
                <TableHead className="text-slate-400">Signal</TableHead>
                <TableHead className="text-slate-400">Account</TableHead>
                <TableHead className="text-slate-400">When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {signalEvents.map((e) => {
                const def = getSignalDefinition(e.defId);
                const acct = getAccount(e.accountId);
                if (!def) return null;
                return (
                  <TableRow key={e.id} className="border-white/5">
                    <TableCell>
                      <SignalChip category={def.category} label={def.name} severity={e.severity} />
                      <p className="text-[11px] text-slate-500 mt-1">{e.detail}</p>
                    </TableCell>
                    <TableCell className="text-slate-300 text-sm">{acct?.name ?? "—"}</TableCell>
                    <TableCell className="text-slate-500 text-xs">{e.firedAt.slice(5)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function CategoryBlock({
  category, label, description, defs,
}: {
  category: SignalCategory; label: string; description: string;
  defs: typeof signalDefinitions;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4" data-testid={`signal-cat-${category}`}>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-semibold text-white">{label}</h2>
        <Badge variant="outline" className="text-[10px]">{defs.length} signals</Badge>
      </div>
      <p className="text-xs text-slate-400 mb-3">{description}</p>
      <Accordion type="multiple" className="w-full">
        {defs.map((d) => (
          <AccordionItem key={d.id} value={d.id} className="border-white/5">
            <AccordionTrigger className="text-sm text-slate-200 hover:text-white">
              <div className="flex items-center gap-2">
                <SignalChip category={d.category} label={d.name} />
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-xs text-slate-300 space-y-2 pl-2">
              <p className="text-slate-300">{d.description}</p>
              <KV k="Data sources" v={d.dataSources.join(" · ")} />
              <KV k="Pattern" v={d.pattern} />
              <KV k="Triggers" v={d.triggersAction} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold w-28 shrink-0">{k}</p>
      <p className="text-xs text-slate-300">{v}</p>
    </div>
  );
}
