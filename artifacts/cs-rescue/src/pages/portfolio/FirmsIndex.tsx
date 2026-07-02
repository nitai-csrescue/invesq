import { Link } from "wouter";
import { ShieldCheck, Building2, Lock } from "lucide-react";
import { FIRMS, getFirmCompanies, AS_OF_DATE, formatDate } from "@/data/portfolio";

export default function FirmsIndex() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b border-border">
        <div className="max-w-screen-lg mx-auto px-6 py-3.5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/30">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-foreground tracking-tight">
              INVESQ <span className="text-muted-foreground font-normal">· Tenant Index</span>
            </div>
            <div className="text-[11px] uppercase tracking-wider text-primary/80">Internal</div>
          </div>
        </div>
      </header>

      <main className="max-w-screen-lg mx-auto px-6 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Tenant index</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              All registered PE-firm tenants · as of {formatDate(AS_OF_DATE)}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-[11px] text-rose-300">
            <Lock className="h-3 w-3" /> Internal — tenant index
          </span>
        </div>

        <div className="mt-8 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card">
                <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Firm
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Slug
                </th>
                <th className="px-5 py-3 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Companies
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Portal
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {FIRMS.map((firm) => {
                const companies = getFirmCompanies(firm.slug);
                return (
                  <tr key={firm.slug} className="bg-card/40 hover:bg-card transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                          {firm.displayName.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-foreground">{firm.displayName}</span>
                        {firm.internalOnly && (
                          <span title="Internal only">
                            <Lock className="h-3 w-3 text-muted-foreground" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                        {firm.slug}
                      </code>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-mono text-foreground">{companies.length}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                          firm.internalOnly
                            ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        }`}
                      >
                        {firm.statusLabel}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/${firm.slug}/portfolio`}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-foreground hover:border-primary/40 hover:text-primary transition-colors"
                      >
                        Open portal →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-[11px] text-muted-foreground">
          To add a new tenant, see <code className="font-mono">FIRM-ONBOARDING.md</code> at the project root.
          Adding a firm is a pure data operation — no UI changes required.
        </p>
      </main>
    </div>
  );
}
