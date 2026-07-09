import { PageHeader } from "@/components/cs/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@workspace/replit-auth-web";

export default function AdminHome() {
  const { user, logout } = useAuth();

  return (
    <div className="p-6 max-w-[1200px] mx-auto" data-testid="admin-home-page">
      <PageHeader
        eyebrow="Internal"
        title="Admin"
        subtitle="Restricted to csrescue.com Google accounts."
      />

      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div>
          <p className="text-sm text-slate-500">Signed in as</p>
          <p className="text-white">{user?.email ?? "unknown"}</p>
        </div>

        <div className="rounded-md border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-sm text-white">Database ready</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            The <code>firms</code>, <code>companies</code>, <code>assessments</code>, and{" "}
            <code>jobs</code> tables are provisioned. Admin CRUD tooling for these tables is not
            built yet — this page is a placeholder gate to confirm auth is working.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={logout} data-testid="admin-logout-btn">
          Log out
        </Button>
      </div>
    </div>
  );
}
