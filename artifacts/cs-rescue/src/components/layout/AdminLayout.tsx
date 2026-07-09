import { ReactNode } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";

/**
 * Minimal chrome for the internal /admin/* tooling. Deliberately does not
 * reuse the client-facing demo Shell (Sidebar + Header) — this is an
 * internal tool, not part of the INVESQ product demo.
 */
export function AdminLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="h-14 border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between px-6">
        <span className="text-sm font-semibold tracking-tight text-foreground">INVESQ Admin</span>
        <div className="flex items-center gap-3">
          {user?.email && (
            <span className="text-xs text-muted-foreground" data-testid="admin-layout-user-email">
              {user.email}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={logout} data-testid="admin-layout-logout-btn">
            Log out
          </Button>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
