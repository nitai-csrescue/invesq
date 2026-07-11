import { useRoute, Redirect } from "wouter";
import { Loader2 } from "lucide-react";
import {
  useListAdminFirms,
  getListAdminFirmsQueryKey,
} from "@workspace/api-client-react";

// ---------------------------------------------------------------------------
// FirmReviewRedirect
// The old /admin/firms/:id review screen has moved onto the tenant portal
// itself (the Admin Lens overlay). This redirector maps the numeric firm id
// to its tenant portal (/:slug/portfolio), where the lens now lives. Firms
// without a portal slug fall back to the /admin index.
// ---------------------------------------------------------------------------
export default function FirmReviewRedirect() {
  const [, params] = useRoute("/admin/firms/:id");
  const id = Number(params?.id);

  const { data, isLoading } = useListAdminFirms({
    query: { queryKey: getListAdminFirmsQueryKey() },
  });

  if (isLoading) {
    return (
      <div
        className="flex items-center gap-2 p-6 text-sm text-muted-foreground"
        data-testid="text-firm-redirect-loading"
      >
        <Loader2 className="h-4 w-4 animate-spin" /> Opening firm…
      </div>
    );
  }

  const firm = data?.find((f) => f.id === id);
  if (firm?.slug) {
    return <Redirect to={`/${firm.slug}/portfolio`} />;
  }
  return <Redirect to="/admin" />;
}
