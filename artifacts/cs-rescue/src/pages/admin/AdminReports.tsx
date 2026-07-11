import { useState } from "react";
import { Link, useLocation } from "wouter";
import { FileText, ArrowLeft, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useListAdminFirms, useGetAdminFirm, getGetAdminFirmQueryKey } from "@workspace/api-client-react";
import { ReportWorkflowPanel } from "./ReportWorkflowPanel";

// ---------------------------------------------------------------------------
// AdminReports — the deep-linkable per-company report workflow surface.
//   /admin/reports              → firm + company picker
//   /admin/reports/:companyId   → the full editor / validation / delivery panel
// The panel itself is shared with the firm-scoped Admin Lens export card.
// ---------------------------------------------------------------------------
function ReportsPicker() {
  const [, navigate] = useLocation();
  const [firmId, setFirmId] = useState<string>("");

  const { data: firms, isLoading: firmsLoading } = useListAdminFirms();

  const selectedFirmId = firmId ? Number(firmId) : NaN;
  const hasFirm = Number.isInteger(selectedFirmId) && selectedFirmId > 0;

  const { data: firmDetail, isFetching: companiesLoading } = useGetAdminFirm(selectedFirmId, {
    query: { queryKey: getGetAdminFirmQueryKey(selectedFirmId), enabled: hasFirm },
  });

  const exportable = (firmDetail?.companies ?? []).filter((c) => c.hasAssessment);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-1.5">
          <FileText className="h-4 w-4 text-primary" /> Pick a report
        </CardTitle>
        <CardDescription>
          Choose a firm, then one of its assessed companies, to open the report editor, validation, and Google Drive
          delivery workflow.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="reports-firm">Firm</Label>
            <Select value={firmId} onValueChange={setFirmId}>
              <SelectTrigger id="reports-firm" data-testid="select-reports-firm" disabled={firmsLoading}>
                <SelectValue placeholder={firmsLoading ? "Loading firms…" : "Choose a firm…"} />
              </SelectTrigger>
              <SelectContent>
                {(firms ?? []).map((firm) => (
                  <SelectItem key={firm.id} value={String(firm.id)}>
                    {firm.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reports-company">Company</Label>
            <Select
              value=""
              onValueChange={(v) => navigate(`/admin/reports/${v}`)}
              disabled={!hasFirm || companiesLoading}
            >
              <SelectTrigger id="reports-company" data-testid="select-reports-company">
                <SelectValue placeholder={!hasFirm ? "Pick a firm first" : companiesLoading ? "Loading…" : "Choose a company…"} />
              </SelectTrigger>
              <SelectContent>
                {exportable.map((company) => (
                  <SelectItem key={company.id} value={String(company.id)}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {hasFirm && !companiesLoading && exportable.length === 0 && (
          <p className="text-sm text-muted-foreground" data-testid="text-no-exportable-companies">
            This firm has no companies with assessment data yet.
          </p>
        )}
        {hasFirm && companiesLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading companies…
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminReports({ companyId }: { companyId?: number }) {
  const hasCompany = typeof companyId === "number" && Number.isInteger(companyId) && companyId > 0;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-primary">
          <FileText className="h-3.5 w-3.5" /> Reports
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Report workflow</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Edit the narrative, collect dual validator sign-offs, and deliver the client PDF to Google Drive.
        </p>
      </div>

      {hasCompany ? (
        <>
          <Link
            href="/admin/reports"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            data-testid="link-reports-back"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All reports
          </Link>
          <ReportWorkflowPanel companyId={companyId} />
        </>
      ) : (
        <ReportsPicker />
      )}
    </div>
  );
}
