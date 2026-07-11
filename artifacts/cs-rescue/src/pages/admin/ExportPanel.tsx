import { useMemo, useState } from "react";
import { FileDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { Company } from "@workspace/api-client-react";
import { ReportWorkflowPanel } from "./ReportWorkflowPanel";

interface ExportPanelProps {
  companies: Company[];
}

export default function ExportPanel({ companies }: ExportPanelProps) {
  const exportable = useMemo(() => companies.filter((c) => c.hasAssessment), [companies]);
  const [companyId, setCompanyId] = useState<string>("");

  const selectedId = companyId ? Number(companyId) : NaN;
  const hasSelectedId = Number.isInteger(selectedId) && selectedId > 0;

  return (
    <Card data-testid="card-export">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-1.5">
          <FileDown className="h-4 w-4 text-primary" /> Report editor & delivery
        </CardTitle>
        <CardDescription>
          Edit the narrative, collect validator sign-offs, and ship the client PDF to Google Drive. Only companies
          with at least one assessment are eligible.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {exportable.length === 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="text-no-exportable-companies">
            No companies with assessment data yet — the report workflow becomes available once at least one company
            here has an assessment on file.
          </p>
        ) : (
          <>
            <div className="space-y-1.5 sm:max-w-sm">
              <Label htmlFor="export-company">Company</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger id="export-company" data-testid="select-export-company">
                  <SelectValue placeholder="Choose a company…" />
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

            {hasSelectedId && <ReportWorkflowPanel companyId={selectedId} />}
          </>
        )}
      </CardContent>
    </Card>
  );
}
