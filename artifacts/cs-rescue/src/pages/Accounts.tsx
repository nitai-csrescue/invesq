import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/cs/PageHeader";
import { HealthBadge, healthScoreColor } from "@/components/cs/HealthBadge";
import { Sparkline } from "@/components/cs/Sparkline";
import { SignalChip } from "@/components/cs/SignalChip";
import { SourceBadge } from "@/components/cs/SourceBadge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePersona, PERSONA_CURRENT_USER, type Persona } from "@/lib/persona";
import {
  accounts,
  type Account,
  type AccountStatus,
  type AccountSegment,
  signalEvents,
  getSignalDefinition,
  actions,
  getTeamMember,
  team,
} from "@/data";

const STATUSES: { value: AccountStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "healthy", label: "Healthy" },
  { value: "watch", label: "Watch" },
  { value: "at-risk", label: "At Risk" },
  { value: "churning", label: "Churning" },
];

const SEGMENTS: (AccountSegment | "all")[] = ["all", "Enterprise", "Mid-Market", "SMB"];

function personaDefaultOwner(persona: Persona): string {
  return PERSONA_CURRENT_USER[persona] ?? "all";
}

function personaDefaultStatus(persona: Persona): AccountStatus | "all" {
  if (persona === "support") return "at-risk";
  return "all";
}

function personaSubtitle(persona: Persona): string {
  switch (persona) {
    case "cs": return "Filtered to your book of business — clear filters to see the whole portfolio.";
    case "sales": return "Sorted with expansion-ready accounts at the top.";
    case "support": return "Focused on at-risk accounts — clear filters to see all 18.";
    case "customer": return "A single-account, outside-in view (Stark Industries).";
    default: return "Searchable view of all 18 customers — click any row to open the deep account profile.";
  }
}

export default function Accounts() {
  const { persona } = usePersona();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<AccountStatus | "all">(() => personaDefaultStatus(persona));
  const [segment, setSegment] = useState<AccountSegment | "all">("all");
  const [owner, setOwner] = useState<string>(() => personaDefaultOwner(persona));
  const [open, setOpen] = useState<Account | null>(null);

  // When the global persona changes, reset the persona-driven filters to that
  // persona's defaults. This is the "switching personas re-shapes the page" UX.
  useEffect(() => {
    setOwner(personaDefaultOwner(persona));
    setStatus(personaDefaultStatus(persona));
  }, [persona]);

  // Deep-link: /accounts?accountId=... auto-opens the matching drawer.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = new URLSearchParams(window.location.search).get("accountId");
    if (!id) return;
    const found = accounts.find((a) => a.id === id);
    if (found) setOpen(found);
  }, []);

  // Customer persona is the outside-in lens: pin to a single account.
  if (persona === "customer") {
    const customerAcct = accounts.find((a) => a.id === "a_stark") ?? accounts[0];
    return (
      <div className="p-6 max-w-[1500px] mx-auto" data-testid="accounts-page" data-persona={persona}>
        <PageHeader
          eyebrow="Outside-in"
          title="Your account"
          subtitle={personaSubtitle(persona)}
        />
        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4 mb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-2xl font-bold text-white">{customerAcct.name}</p>
              <p className="text-sm text-slate-400">{customerAcct.industry} · {customerAcct.segment}</p>
            </div>
            <HealthBadge status={customerAcct.status} score={customerAcct.healthScore} />
          </div>
        </div>
        <AccountDrawer account={customerAcct} onClose={() => { /* customer view stays open */ }} forceOpen />
      </div>
    );
  }

  const filtered = useMemo(() => {
    const base = accounts.filter((a) =>
      (q ? a.name.toLowerCase().includes(q.toLowerCase()) : true) &&
      (status === "all" ? true : a.status === status) &&
      (segment === "all" ? true : a.segment === segment) &&
      (owner === "all" ? true : a.ownerId === owner)
    );
    if (persona === "sales") {
      // AE lens: surface expansion-ready accounts first.
      return [...base].sort((a, b) => b.expansionPotential - a.expansionPotential);
    }
    if (persona === "vp" || persona === "support") {
      // Risk-weighted: lowest health first.
      return [...base].sort((a, b) => a.healthScore - b.healthScore);
    }
    return base;
  }, [q, status, segment, owner, persona]);

  return (
    <div className="p-6 max-w-[1500px] mx-auto" data-testid="accounts-page" data-persona={persona}>
      <PageHeader
        eyebrow="Book of business"
        title="Accounts"
        subtitle={personaSubtitle(persona)}
      />

      <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4 mb-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input
            placeholder="Search accounts…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 bg-slate-900/60 border-white/10"
            data-testid="accounts-search"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as AccountStatus | "all")}>
          <SelectTrigger className="w-full md:w-44 bg-slate-900/60 border-white/10" data-testid="filter-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={segment} onValueChange={(v) => setSegment(v as AccountSegment | "all")}>
          <SelectTrigger className="w-full md:w-44 bg-slate-900/60 border-white/10" data-testid="filter-segment">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SEGMENTS.map((s) => <SelectItem key={s} value={s}>{s === "all" ? "All segments" : s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={owner} onValueChange={setOwner}>
          <SelectTrigger className="w-full md:w-44 bg-slate-900/60 border-white/10" data-testid="filter-owner">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All owners</SelectItem>
            {team.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-950/40 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-white/10">
              <TableHead className="text-slate-400">Account</TableHead>
              <TableHead className="text-slate-400">Segment</TableHead>
              <TableHead className="text-slate-400">Health</TableHead>
              <TableHead className="text-slate-400 hidden md:table-cell">Trend</TableHead>
              <TableHead className="text-slate-400">ARR</TableHead>
              <TableHead className="text-slate-400">Renewal</TableHead>
              <TableHead className="text-slate-400">Owner</TableHead>
              <TableHead className="text-slate-400 text-right">Expansion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((a) => {
              const ownerMember = getTeamMember(a.ownerId);
              return (
                <TableRow
                  key={a.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open account ${a.name}`}
                  onClick={() => setOpen(a)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setOpen(a);
                    }
                  }}
                  className="cursor-pointer border-white/5 hover:bg-white/[0.03] focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
                  data-testid={`account-row-${a.id}`}
                >
                  <TableCell className="font-medium text-white">
                    <div>{a.name}</div>
                    <div className="text-[11px] text-slate-500">{a.industry}</div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{a.segment}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={`text-base font-bold ${healthScoreColor(a.healthScore)}`}>{a.healthScore}</span>
                      <HealthBadge status={a.status} size="sm" />
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className={`w-24 ${healthScoreColor(a.healthScore)}`}>
                      <Sparkline values={a.healthTrend} height={20} />
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-300">${(a.arr / 1000).toFixed(0)}k</TableCell>
                  <TableCell className="text-slate-300">{a.daysToRenewal}d</TableCell>
                  <TableCell className="text-slate-400 text-xs">{ownerMember?.initials ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    {a.expansionPotential > 0
                      ? <span className="text-emerald-300 font-semibold">+${(a.expansionPotential / 1000).toFixed(0)}k</span>
                      : <span className="text-slate-600">—</span>}
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-slate-500">No accounts match your filters.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AccountDrawer account={open} onClose={() => setOpen(null)} />
    </div>
  );
}

function AccountDrawer({ account, onClose, forceOpen = false }: { account: Account | null; onClose: () => void; forceOpen?: boolean }) {
  if (!account) return null;
  const isOpen = forceOpen || !!account;
  const ownerMember = getTeamMember(account.ownerId);
  const accountSignals = signalEvents.filter((e) => e.accountId === account.id);
  const recommended = actions.filter((a) => account.recommendedActionIds.includes(a.id));

  return (
    <Sheet open={isOpen} onOpenChange={(v) => { if (!forceOpen && !v) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-2xl bg-slate-950 border-l border-white/10 overflow-y-auto" data-testid="account-drawer">
        <SheetHeader className="text-left">
          <div className="flex items-center justify-between mb-2">
            <Badge variant="outline" className="text-[10px]">{account.segment}</Badge>
            <HealthBadge status={account.status} score={account.healthScore} />
          </div>
          <SheetTitle className="text-2xl text-white">{account.name}</SheetTitle>
          <SheetDescription>
            {account.industry} · ${(account.arr / 1000).toFixed(0)}k ARR · Owned by {ownerMember?.name ?? "—"}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="summary" className="mt-6">
          <TabsList className="bg-slate-900/60">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="usage">Usage</TabsTrigger>
            <TabsTrigger value="risk">Risk</TabsTrigger>
            <TabsTrigger value="expansion">Expansion</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4 mt-4">
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Renewal" value={`${account.daysToRenewal}d`} />
              <Stat label="Active users" value={`${account.weeklyActiveUsers}`} />
              <Stat label="Seat usage" value={`${Math.round((account.seatsActive / account.seatsLicensed) * 100)}%`} />
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Health trend (12 wk)</p>
              <div className={healthScoreColor(account.healthScore)}><Sparkline values={account.healthTrend} height={48} /></div>
            </div>
          </TabsContent>

          <TabsContent value="usage" className="mt-4">
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Weekly active users</p>
              <p className="text-3xl font-bold text-white">{account.weeklyActiveUsers}
                <span className={`text-sm font-medium ml-2 ${account.weeklyActiveUsersDelta >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                  {account.weeklyActiveUsersDelta >= 0 ? "+" : ""}{account.weeklyActiveUsersDelta}%
                </span>
              </p>
              <div className="mt-3 text-cyan-300"><Sparkline values={account.usageTrend} height={48} /></div>
            </div>
          </TabsContent>

          <TabsContent value="risk" className="space-y-2 mt-4">
            {account.riskFactors.length === 0 ? (
              <p className="text-sm text-slate-500 italic">No active risk factors. ✓</p>
            ) : account.riskFactors.map((r, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg border border-rose-400/20 bg-rose-500/5 p-3">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-2" />
                <p className="text-sm text-rose-200">{r}</p>
              </div>
            ))}
            <div className="mt-4">
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Live signals</p>
              <div className="space-y-1.5">
                {accountSignals.map((e) => {
                  const def = getSignalDefinition(e.defId);
                  if (!def) return null;
                  return (
                    <div key={e.id} className="flex items-center gap-2">
                      <SignalChip category={def.category} label={def.name} severity={e.severity} />
                      <span className="text-[11px] text-slate-500">{e.detail}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="expansion" className="space-y-2 mt-4">
            {account.expansionPotential > 0 ? (
              <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/5 p-4">
                <p className="text-xs uppercase tracking-wider text-emerald-300 mb-1">Potential</p>
                <p className="text-2xl font-bold text-emerald-200">+${(account.expansionPotential / 1000).toFixed(0)}k ARR</p>
              </div>
            ) : <p className="text-sm text-slate-500 italic">No active expansion thesis.</p>}
            {account.expansionIndicators.map((r, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2" />
                <p className="text-sm text-slate-200">{r}</p>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="activity" className="space-y-2 mt-4">
            {account.recentActivity.map((ev) => (
              <div key={ev.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="text-[10px] uppercase">{ev.type}</Badge>
                  <span className="text-[11px] text-slate-500">{ev.at}</span>
                </div>
                <p className="text-sm text-slate-200">{ev.summary}</p>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="actions" className="space-y-2 mt-4">
            {recommended.length === 0
              ? <p className="text-sm text-slate-500 italic">No recommended actions for this account right now.</p>
              : recommended.map((a) => (
                <Link
                  key={a.id}
                  href={`/actions?actionId=${a.id}`}
                  className="block rounded-lg border border-white/5 bg-white/[0.02] p-3 hover:border-cyan-400/30 hover:bg-cyan-500/5 transition-colors"
                  data-testid={`drawer-action-${a.id}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <SourceBadge source={a.source} />
                    <span className="text-[11px] text-slate-500">due {a.dueDate.slice(5)}</span>
                  </div>
                  <p className="text-sm text-white">{a.title}</p>
                  {a.context && <p className="text-[11px] text-slate-400 mt-1">{a.context}</p>}
                </Link>
              ))}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-xl font-bold text-white mt-1">{value}</p>
    </div>
  );
}
