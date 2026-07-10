import { Link } from "wouter";
import { Building2, Loader2, PlusCircle } from "lucide-react";
import { PageHeader } from "@/components/cs/PageHeader";
import { Button } from "@/components/ui/button";
import { useListAdminFirms } from "@workspace/api-client-react";

const STATUS_STYLES: Record<string, string> = {
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  reviewed: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  ready: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
};

function statusPillClass(status: string) {
  return STATUS_STYLES[status] ?? "border-slate-500/30 bg-slate-500/10 text-slate-300";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function FirmsList() {
  const { data: firms, isLoading, isError } = useListAdminFirms();

  return (
    <div className="p-6 max-w-[1200px] mx-auto" data-testid="admin-firms-list-page">
      <PageHeader
        eyebrow="Internal"
        title="Firms"
        subtitle="Every firm onboarded through /admin, with its current review status."
        actions={
          <Link href="/admin">
            <Button size="sm" data-testid="button-new-firm">
              <PlusCircle className="h-4 w-4" />
              New firm
            </Button>
          </Link>
        }
      />

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="text-firms-loading">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading firms…
        </div>
      )}

      {isError && (
        <p className="text-sm text-destructive" data-testid="text-firms-error">
          Failed to load firms.
        </p>
      )}

      {firms && (
        <div className="overflow-hidden rounded-xl border border-border" data-testid="table-firms">
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
                <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Created
                </th>
                <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Review
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {firms.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">
                    No firms yet. Create one from the admin home screen.
                  </td>
                </tr>
              )}
              {firms.map((firm) => (
                <tr
                  key={firm.id}
                  className="bg-card/40 hover:bg-card transition-colors"
                  data-testid={`row-firm-${firm.id}`}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        {firm.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-medium text-foreground">{firm.name}</span>
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
                      <span className="font-mono text-foreground">{firm.companyCount}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${statusPillClass(firm.status)}`}
                    >
                      {firm.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{formatDate(firm.createdAt)}</td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/admin/firms/${firm.id}`}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-foreground hover:border-primary/40 hover:text-primary transition-colors"
                      data-testid={`link-review-firm-${firm.id}`}
                    >
                      Review →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
