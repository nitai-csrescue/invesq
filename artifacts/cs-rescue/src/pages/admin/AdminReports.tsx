import { useLocation } from "wouter";
import { FileText, ChevronRight, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useListAdminFirms,
  getListAdminFirmsQueryKey,
  useGetAdminFirm,
  getGetAdminFirmQueryKey,
  useGetAdminCompanyReportData,
  getGetAdminCompanyReportDataQueryKey,
  type AdminFirmSummary,
  type Company,
} from "@workspace/api-client-react";
import { deriveReportStatus } from "@/lib/reportStatus";

// ---------------------------------------------------------------------------
// AdminReports — a read-only index of every assessed company's diagnostic
// report status. There is no editor here anymore: each row deep-links to that
// company's tenant portal, jumping straight to its Diagnostic Report section
// (#diagnostic-report), where the full edit / sign-off / delivery workflow
// lives. Status is derived from the same cache-only report-data workflow the
// portal reads, so both surfaces agree.
// ---------------------------------------------------------------------------
function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function CompanyReportRow({
  firm,
  company,
}: {
  firm: AdminFirmSummary;
  company: Company;
}) {
  const [, navigate] = useLocation();

  const { data, isError } = useGetAdminCompanyReportData(company.id, {
    query: {
      queryKey: getGetAdminCompanyReportDataQueryKey(company.id),
      retry: false,
    },
  });

  const status = deriveReportStatus(isError ? null : data);
  const href = company.slug
    ? `/${firm.slug}/portfolio/${company.slug}#diagnostic-report`
    : null;

  const go = () => {
    if (href) navigate(href);
  };

  return (
    <TableRow
      className={href ? "cursor-pointer" : "opacity-70"}
      onClick={go}
      onKeyDown={(e) => {
        if (href && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          go();
        }
      }}
      tabIndex={href ? 0 : undefined}
      role={href ? "link" : undefined}
      data-testid={`report-row-${company.slug ?? company.id}`}
    >
      <TableCell className="font-medium text-foreground">{company.name}</TableCell>
      <TableCell className="text-muted-foreground">{firm.name}</TableCell>
      <TableCell>
        <span
          className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${status.className}`}
        >
          {status.label}
        </span>
      </TableCell>
      <TableCell className="text-muted-foreground tabular-nums">
        {formatDate(status.lastUpdated)}
      </TableCell>
      <TableCell className="w-8 text-right">
        {href ? (
          <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
        ) : (
          <span className="text-[10px] text-muted-foreground">no portal</span>
        )}
      </TableCell>
    </TableRow>
  );
}

function FirmReportRows({ firm }: { firm: AdminFirmSummary }) {
  const { data } = useGetAdminFirm(firm.id, {
    query: { queryKey: getGetAdminFirmQueryKey(firm.id) },
  });

  const assessed = (data?.companies ?? []).filter(
    (c) => c.hasAssessment && c.status !== "excluded",
  );
  if (assessed.length === 0) return null;

  return (
    <>
      {assessed.map((company) => (
        <CompanyReportRow key={company.id} firm={firm} company={company} />
      ))}
    </>
  );
}

export default function AdminReports() {
  const { data: firms, isLoading, isError } = useListAdminFirms({
    query: { queryKey: getListAdminFirmsQueryKey() },
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-primary">
          <FileText className="h-3.5 w-3.5" /> Reports
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          Report status
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every assessed company and where its diagnostic report stands. Open a
          row to jump to that company's report in its portal, where you edit the
          narrative, collect sign-offs, and deliver the client PDF.
        </p>
      </div>

      {isLoading && (
        <div
          className="flex items-center gap-2 text-sm text-muted-foreground"
          data-testid="text-reports-loading"
        >
          <Loader2 className="h-4 w-4 animate-spin" /> Loading reports…
        </div>
      )}

      {isError && (
        <p className="text-sm text-destructive" data-testid="text-reports-error">
          Failed to load reports.
        </p>
      )}

      {firms && firms.length === 0 && (
        <p className="text-sm text-muted-foreground">No firms yet.</p>
      )}

      {firms && firms.length > 0 && (
        <div className="rounded-xl border border-border">
          <Table data-testid="table-admin-reports">
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Firm</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last updated</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {firms.map((firm) => (
                <FirmReportRows key={firm.id} firm={firm} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
