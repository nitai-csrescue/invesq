import { useEffect, useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { Loader2, PlusCircle, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/cs/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  useGetAdminFirm,
  useAddAdminFirmCompany,
  useConfirmAdminFirm,
  getGetAdminFirmQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import ExportPanel from "./ExportPanel";

export default function FirmReview() {
  const [, params] = useRoute("/admin/firms/:id");
  const id = Number(params?.id);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useGetAdminFirm(id, {
    query: { queryKey: getGetAdminFirmQueryKey(id), enabled: Number.isInteger(id) && id > 0 },
  });

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [initialized, setInitialized] = useState(false);
  const [newName, setNewName] = useState("");
  const [newWebsite, setNewWebsite] = useState("");

  useEffect(() => {
    if (data && !initialized) {
      setSelected(new Set(data.companies.filter((c) => c.status !== "excluded").map((c) => c.id)));
      setInitialized(true);
    }
  }, [data, initialized]);

  const addCompany = useAddAdminFirmCompany({
    mutation: {
      onSuccess: (company) => {
        setSelected((prev) => new Set(prev).add(company.id));
        setNewName("");
        setNewWebsite("");
        queryClient.invalidateQueries({ queryKey: getGetAdminFirmQueryKey(id) });
        toast({ title: "Company added", description: `"${company.name}" added and pre-checked.` });
      },
      onError: (err) => {
        toast({
          title: "Failed to add company",
          description: err instanceof Error ? err.message : "Unexpected error",
          variant: "destructive",
        });
      },
    },
  });

  const confirmFirm = useConfirmAdminFirm({
    mutation: {
      onSuccess: (result) => {
        toast({
          title: "Firm reviewed",
          description: `"${result.firm.name}" marked reviewed. Build job #${result.job.id} queued.`,
        });
        navigate(`/admin/jobs/${result.job.id}`);
      },
      onError: (err) => {
        toast({
          title: "Failed to confirm firm",
          description: err instanceof Error ? err.message : "Unexpected error",
          variant: "destructive",
        });
      },
    },
  });

  const toggleCompany = (companyId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(companyId)) next.delete(companyId);
      else next.add(companyId);
      return next;
    });
  };

  const canAddCompany = newName.trim().length > 0 && newWebsite.trim().length > 0 && !addCompany.isPending;

  const handleAddCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAddCompany) return;
    addCompany.mutate({ id, data: { name: newName.trim(), website: newWebsite.trim() } });
  };

  const handleConfirm = () => {
    confirmFirm.mutate({ id, data: { companyIds: Array.from(selected) } });
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-[900px] mx-auto flex items-center gap-2 text-sm text-muted-foreground" data-testid="text-firm-review-loading">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading firm…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6 max-w-[900px] mx-auto" data-testid="text-firm-review-error">
        <p className="text-sm text-destructive">Firm not found.</p>
        <Link href="/admin/firms" className="text-sm text-primary hover:underline mt-2 inline-block">
          ← Back to firms
        </Link>
      </div>
    );
  }

  const { firm, companies } = data;

  return (
    <div className="p-6 max-w-[900px] mx-auto" data-testid="admin-firm-review-page">
      <PageHeader
        eyebrow="Internal · Review"
        title={firm.name}
        subtitle={`${firm.website ?? "no website"} · slug ${firm.slug} · status ${firm.status}`}
        actions={
          <Link href="/admin/firms" className="text-xs text-muted-foreground hover:text-primary transition-colors">
            ← Back to firms
          </Link>
        }
      />

      <Card data-testid="card-companies">
        <CardHeader>
          <CardTitle className="text-base">Companies</CardTitle>
          <CardDescription>
            Pre-checked companies will be marked "active"; unchecked companies will be marked "excluded" when you
            confirm.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {companies.length === 0 && (
            <p className="text-sm text-muted-foreground" data-testid="text-no-companies">
              No companies yet. Add one below.
            </p>
          )}
          {companies.map((company) => (
            <label
              key={company.id}
              className="flex items-center gap-3 rounded-md border border-border bg-card/40 px-4 py-3 cursor-pointer hover:bg-card transition-colors"
              data-testid={`row-company-${company.id}`}
            >
              <Checkbox
                checked={selected.has(company.id)}
                onCheckedChange={() => toggleCompany(company.id)}
                data-testid={`checkbox-company-${company.id}`}
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{company.name}</p>
                <p className="text-xs text-muted-foreground">{company.website ?? "no website"}</p>
              </div>
              <span className="text-[11px] text-muted-foreground">{company.status}</span>
            </label>
          ))}

          <form onSubmit={handleAddCompany} className="rounded-md border border-dashed border-border p-4 space-y-3" data-testid="form-add-company">
            <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <PlusCircle className="h-3.5 w-3.5 text-primary" /> Add a company
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="company-name">Company name</Label>
                <Input
                  id="company-name"
                  data-testid="input-company-name"
                  placeholder="e.g. Renaissance Systems"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="company-website">Website</Label>
                <Input
                  id="company-website"
                  data-testid="input-company-website"
                  type="url"
                  placeholder="https://example.com"
                  value={newWebsite}
                  onChange={(e) => setNewWebsite(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button type="submit" size="sm" variant="outline" disabled={!canAddCompany} data-testid="button-add-company">
              {addCompany.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Add company
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6 flex items-center justify-between rounded-md border border-border bg-muted/30 px-4 py-3">
        <p className="text-sm text-muted-foreground">
          {selected.size} of {companies.length} compan{companies.length === 1 ? "y" : "ies"} selected
        </p>
        <Button onClick={handleConfirm} disabled={confirmFirm.isPending} data-testid="button-confirm-firm">
          {confirmFirm.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Confirm & queue build
        </Button>
      </div>

      <div className="mt-6">
        <ExportPanel companies={companies} />
      </div>
    </div>
  );
}
