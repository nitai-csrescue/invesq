import { useState } from "react";
import { Link } from "wouter";
import { PageHeader } from "@/components/cs/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@workspace/replit-auth-web";
import { useCreateAdminFirm } from "@workspace/api-client-react";
import type { CreateAdminFirmResponse } from "@workspace/api-client-react";
import { Loader2, PlusCircle } from "lucide-react";

export default function AdminHome() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [lastResult, setLastResult] = useState<CreateAdminFirmResponse | null>(null);

  const createFirm = useCreateAdminFirm({
    mutation: {
      onSuccess: (data) => {
        setLastResult(data);
        setName("");
        setWebsite("");
        toast({
          title: "Firm created",
          description: `"${data.firm.name}" is pending review. Discovery job #${data.job.id} queued.`,
        });
      },
      onError: (err) => {
        toast({
          title: "Failed to create firm",
          description: err instanceof Error ? err.message : "Unexpected error",
          variant: "destructive",
        });
      },
    },
  });

  const canSubmit = name.trim().length > 0 && website.trim().length > 0 && !createFirm.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    createFirm.mutate({ data: { name: name.trim(), website: website.trim() } });
  };

  return (
    <div className="p-6 max-w-[1200px] mx-auto" data-testid="admin-home-page">
      <PageHeader
        eyebrow="Internal"
        title="Admin"
        subtitle="Restricted to csrescue.com Google accounts."
        actions={
          <Link href="/admin/firms">
            <Button variant="outline" size="sm" data-testid="link-view-all-firms">
              View all firms
            </Button>
          </Link>
        }
      />

      <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <Card data-testid="card-new-firm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PlusCircle className="h-4 w-4 text-primary" />
              New firm assessment
            </CardTitle>
            <CardDescription>
              Creates a firm in "pending" status and queues a stub discovery job. Review and company
              selection happen on the next screen (coming soon).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-new-firm">
              <div className="space-y-1.5">
                <Label htmlFor="firm-name">Firm name</Label>
                <Input
                  id="firm-name"
                  data-testid="input-firm-name"
                  placeholder="e.g. Pamlico Capital"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="firm-website">Firm website</Label>
                <Input
                  id="firm-website"
                  data-testid="input-firm-website"
                  type="url"
                  placeholder="https://example.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={!canSubmit} data-testid="button-submit-firm">
                {createFirm.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Create firm
              </Button>
            </form>

            {lastResult && (
              <div
                className="mt-5 rounded-md border border-border bg-muted/40 p-4 text-sm"
                data-testid="text-last-created-firm"
              >
                <p className="font-medium text-foreground">Last created</p>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                  <dt>Firm</dt>
                  <dd className="text-foreground">
                    {lastResult.firm.name} <span className="text-xs">(#{lastResult.firm.id})</span>
                  </dd>
                  <dt>Slug</dt>
                  <dd>
                    <code className="text-xs">{lastResult.firm.slug}</code>
                  </dd>
                  <dt>Firm status</dt>
                  <dd className="text-foreground">{lastResult.firm.status}</dd>
                  <dt>Job</dt>
                  <dd className="text-foreground">
                    #{lastResult.job.id} · {lastResult.job.type}
                  </dd>
                  <dt>Job status</dt>
                  <dd className="text-foreground">{lastResult.job.status}</dd>
                </dl>
                <div className="mt-3 flex items-center gap-3">
                  <Link
                    href={`/admin/firms/${lastResult.firm.id}`}
                    className="text-xs text-primary hover:underline"
                    data-testid="link-review-created-firm"
                  >
                    Review firm →
                  </Link>
                  <Link
                    href={`/admin/jobs/${lastResult.job.id}`}
                    className="text-xs text-primary hover:underline"
                    data-testid="link-view-created-job"
                  >
                    View job →
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-session">
          <CardHeader>
            <CardTitle className="text-base">Session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Signed in as</p>
              <p className="text-foreground">{user?.email ?? "unknown"}</p>
            </div>
            <Button variant="outline" size="sm" onClick={logout} data-testid="admin-logout-btn">
              Log out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
