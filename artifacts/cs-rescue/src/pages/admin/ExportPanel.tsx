import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, ClipboardCopy, Check, FileDown, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  useGetAdminCompanyReportData,
  getGetAdminCompanyReportDataQueryKey,
  useGenerateAdminCompanyReportExport,
} from "@workspace/api-client-react";
import type { Company } from "@workspace/api-client-react";
import { AdminReportPreview } from "./AdminReportPreview";

type ExportFormat = "editable" | "client-pdf";

interface ExportPanelProps {
  companies: Company[];
}

export default function ExportPanel({ companies }: ExportPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const exportable = useMemo(() => companies.filter((c) => c.hasAssessment), [companies]);

  const [companyId, setCompanyId] = useState<string>("");
  const [format, setFormat] = useState<ExportFormat>("client-pdf");
  const [copied, setCopied] = useState(false);

  const selectedId = companyId ? Number(companyId) : NaN;
  const hasSelectedId = Number.isInteger(selectedId) && selectedId > 0;

  const { data, isFetching, isError } = useGetAdminCompanyReportData(selectedId, {
    query: {
      queryKey: getGetAdminCompanyReportDataQueryKey(selectedId),
      enabled: hasSelectedId,
    },
  });

  const generateMutation = useGenerateAdminCompanyReportExport({
    mutation: {
      onSuccess: (result) => {
        if (hasSelectedId) {
          queryClient.setQueryData(getGetAdminCompanyReportDataQueryKey(selectedId), result);
        }
        toast({ title: "Narrative generated", description: "AI-written report sections are ready." });
      },
      onError: () => {
        toast({
          title: "Generation failed",
          description: "Could not generate the AI narrative for this company.",
          variant: "destructive",
        });
      },
    },
  });

  const handleGenerate = () => {
    if (!hasSelectedId) return;
    generateMutation.mutate({ id: selectedId });
  };

  const json = data ? JSON.stringify(data.reportData, null, 2) : "";

  const prompt = data
    ? format === "client-pdf"
      ? `Fill report-data.json with this data and export the Diagnostic Report to PDF:\n\n${json}`
      : `Fill report-data.json with this data and export the Diagnostic Report to PPTX (editable):\n\n${json}`
    : "";

  const handleCopy = () => {
    if (!prompt) return;
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true);
      toast({ title: "Copied", description: "Prompt copied to clipboard." });
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Card data-testid="card-export">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-1.5">
          <FileDown className="h-4 w-4 text-primary" /> Export
        </CardTitle>
        <CardDescription>
          Assemble a report-data.json payload from a company's latest assessment, then hand it to Claude to
          produce the Diagnostic Report. Only companies with at least one assessment are eligible.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {exportable.length === 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="text-no-exportable-companies">
            No companies with assessment data yet — export becomes available once at least one company here has
            an assessment on file.
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
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

              <div className="space-y-1.5">
                <Label>Report type</Label>
                <RadioGroup
                  value={format}
                  onValueChange={(v) => setFormat(v as ExportFormat)}
                  className="flex items-center gap-4 h-9"
                >
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <RadioGroupItem value="client-pdf" data-testid="radio-format-client-pdf" />
                    Client PDF
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <RadioGroupItem value="editable" data-testid="radio-format-editable" />
                    Editable
                  </label>
                </RadioGroup>
              </div>
            </div>

            {isFetching && (
              <div
                className="flex items-center gap-2 text-sm text-muted-foreground"
                data-testid="text-export-loading"
              >
                <Loader2 className="h-4 w-4 animate-spin" /> Assembling report data…
              </div>
            )}

            {isError && (
              <p className="text-sm text-destructive" data-testid="text-export-error">
                Failed to assemble report data for this company.
              </p>
            )}

            {data && !isFetching && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-background/40 p-3">
                  <p className="text-xs text-muted-foreground">
                    {data.meta.generatedAt
                      ? "AI narrative sections are generated and included below and in the JSON."
                      : "Executive summary, gaps, and next steps are still blank — generate the AI narrative to fill them in before exporting."}
                  </p>
                  <Button
                    size="sm"
                    onClick={handleGenerate}
                    disabled={generateMutation.isPending}
                    data-testid="button-generate-narrative"
                  >
                    {generateMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {data.meta.generatedAt ? "Regenerate narrative" : "Generate narrative"}
                  </Button>
                </div>

                {generateMutation.isPending && (
                  <div
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                    data-testid="text-generate-loading"
                  >
                    <Loader2 className="h-4 w-4 animate-spin" /> Generating AI narrative — this can take up to 30
                    seconds…
                  </div>
                )}

                {generateMutation.isError && (
                  <p className="text-sm text-destructive" data-testid="text-generate-error">
                    Could not generate the AI narrative for this company. Try again.
                  </p>
                )}

                <AdminReportPreview data={data} />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      report-data.json · {data.meta.assessmentDate} assessment · {data.meta.tier}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopy}
                      data-testid="button-copy-export-prompt"
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
                      Copy prompt
                    </Button>
                  </div>
                  <pre
                    className="max-h-96 overflow-auto rounded-md border border-border bg-background/60 p-4 text-xs text-foreground"
                    data-testid="text-export-json"
                  >
                    {json}
                  </pre>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
