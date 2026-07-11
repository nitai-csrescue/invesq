import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface TenantExportButtonProps {
  firmSlug: string;
  companySlug: string;
  /** Firm distribution posture. The button only renders when the firm is
   * cleared for distribution (NOT internal-only) and NOT login-gated, mirroring
   * the server's public tenant PDF route (which 403s otherwise). */
  internalOnly: boolean;
  requireLogin?: boolean;
  className?: string;
}

// Client-facing "Download diagnostic PDF" button shown on tenant company-detail
// and report pages. Fetches the branded INVESQ PDF from the public tenant route
// and triggers a browser download (mirrors the admin ExportPanel flow). Only
// sendable firms get this button; internal-only firms never surface it.
export function TenantExportButton({
  firmSlug,
  companySlug,
  internalOnly,
  requireLogin,
  className,
}: TenantExportButtonProps) {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  if (internalOnly || requireLogin) return null;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(
        `/api/portfolio/${firmSlug}/companies/${companySlug}/report-pdf`,
        { credentials: "include" },
      );

      if (!response.ok) {
        if (response.status === 409) {
          toast({
            title: "Report not ready yet",
            description: "This diagnostic report is still being prepared. Please check back shortly.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Download failed",
            description: "Could not download the diagnostic report PDF. Please try again.",
            variant: "destructive",
          });
        }
        return;
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") ?? "";
      const filenameMatch = /filename="([^"]+)"/.exec(disposition);
      const filename = filenameMatch?.[1] ?? "diagnostic-report.pdf";

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast({
        title: "Download failed",
        description: "Could not download the diagnostic report PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Button onClick={handleDownload} disabled={isDownloading} className={className}>
      {isDownloading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {isDownloading ? "Preparing PDF…" : "Download diagnostic PDF"}
    </Button>
  );
}
