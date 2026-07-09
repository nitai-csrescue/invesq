// ---------------------------------------------------------------------------
// PortfolioDataProvider — fetches the raw portfolio bootstrap payload
// (/api/portfolio/bootstrap) once, then hydrates engine.ts's cache via
// hydratePortfolioData(). After hydration, engine.ts's query API
// (getFirmCompanies/getFirmSummary/etc.) stays fully synchronous, so the
// tenant-portal pages that consume it need no changes beyond being wrapped
// in <PortfolioGate> at the shell/router level (see App.tsx).
// ---------------------------------------------------------------------------
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useGetPortfolioBootstrap } from "@workspace/api-client-react";
import { hydratePortfolioData } from "./engine";
import type { RawCompany } from "./types";

interface PortfolioDataContextValue {
  status: "loading" | "error" | "ready";
  error: string | undefined;
}

const PortfolioDataContext = createContext<PortfolioDataContextValue | null>(null);

export function PortfolioDataProvider({ children }: { children: ReactNode }) {
  const { data, isError, error } = useGetPortfolioBootstrap();
  const [hydratedOnce, setHydratedOnce] = useState(false);

  useEffect(() => {
    if (data && !hydratedOnce) {
      // The OpenAPI-generated type widens arrForRollup's tuple to number[]
      // (OpenAPI/Zod can't express fixed-length tuples). The server already
      // validates + writes this as a [number, number] pair (see
      // portfolioData.ts / buildFirmPortfolio), so this cast is safe.
      hydratePortfolioData(data.firms as unknown as { slug: string; companies: RawCompany[] }[]);
      setHydratedOnce(true);
    }
  }, [data, hydratedOnce]);

  const value: PortfolioDataContextValue = isError
    ? {
        status: "error",
        error: error instanceof Error ? error.message : "Failed to load portfolio data",
      }
    : hydratedOnce
      ? { status: "ready", error: undefined }
      : { status: "loading", error: undefined };

  return (
    <PortfolioDataContext.Provider value={value}>{children}</PortfolioDataContext.Provider>
  );
}

export function usePortfolioData(): PortfolioDataContextValue {
  const ctx = useContext(PortfolioDataContext);
  if (!ctx) {
    throw new Error("usePortfolioData must be used within a PortfolioDataProvider");
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// PortfolioGate — the "loading gate at the shell/router level" mentioned in
// task-26. Only blocks rendering for routes that actually read portfolio
// data (tenant portals); every other route passes through immediately
// regardless of bootstrap status. Keep FIRM_SCOPED_RE in sync with the
// identically-named pattern in App.tsx's Shell().
// ---------------------------------------------------------------------------
const FIRM_SCOPED_RE = /^\/[^/]+\/(portfolio|findings|benchmarks|risk)(\/|$)/;

function needsPortfolioData(location: string): boolean {
  return location === "/firms" || FIRM_SCOPED_RE.test(location);
}

export function PortfolioGate({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { status, error } = usePortfolioData();

  if (!needsPortfolioData(location)) {
    return <>{children}</>;
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading portfolio data…
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center text-sm text-destructive">
        Failed to load portfolio data{error ? `: ${error}` : "."}
      </div>
    );
  }

  return <>{children}</>;
}
