import { lazy, Suspense } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { type Firm } from "@/data/portfolio";

// The slim admin bar (firm/company controls) is a separate chunk that is only
// ever downloaded for an authenticated admin. Anonymous visitors short-circuit
// before the lazy import is touched, so the tenant portal ships zero admin
// markup and zero admin JS to the public.
const TenantAdminBar = lazy(() => import("./TenantAdminBar"));

// ---------------------------------------------------------------------------
// AdminBarMount
// Auth gate for the tenant slim admin bar, rendered in the shell's authed
// header slot on every tenant portal page. Renders nothing (and loads nothing)
// unless the current viewer is an authenticated admin. The fallback reserves
// the 60px header height so the light canvas doesn't jump while the chunk
// loads.
// ---------------------------------------------------------------------------
export function AdminBarMount({ firm }: { firm: Firm }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return null;

  return (
    <Suspense
      fallback={
        <div className="h-[60px] shrink-0 border-b border-border bg-card/60" />
      }
    >
      <TenantAdminBar firm={firm} />
    </Suspense>
  );
}
