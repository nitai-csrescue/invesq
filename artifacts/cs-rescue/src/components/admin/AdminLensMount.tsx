import { lazy, Suspense } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { type Firm } from "@/data/portfolio";

// The heavy admin panel (firm review + export) is a separate chunk that is
// only ever downloaded for an authenticated admin. Anonymous visitors short-
// circuit before the lazy import is touched, so the tenant portal ships zero
// admin markup and zero admin JS to the public.
const AdminLensPanel = lazy(() => import("./AdminLensPanel"));

// ---------------------------------------------------------------------------
// AdminLensMount
// Auth gate for the admin lens, mounted on every tenant portal page. Renders
// nothing (and loads nothing) unless the current viewer is an authenticated
// admin — which, given admin auth is domain-restricted to csrescue.com Google
// accounts, is the enforceable proxy for "is an INVESQ operator".
// ---------------------------------------------------------------------------
export function AdminLensMount({ firm }: { firm: Firm }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return null;

  return (
    <Suspense fallback={null}>
      <AdminLensPanel firm={firm} />
    </Suspense>
  );
}
