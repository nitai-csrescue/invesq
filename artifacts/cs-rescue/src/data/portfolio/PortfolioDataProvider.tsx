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
import { registerDynamicFirms } from "./firms";
import type { RawCompany } from "./types";

interface PortfolioDataContextValue {
  status: "loading" | "error" | "ready";
  error: string | undefined;
}

const PortfolioDataContext = createContext<PortfolioDataContextValue | null>(null);

export function PortfolioDataProvider({ children }: { children: ReactNode }) {
  const { data, isError, error } = useGetPortfolioBootstrap();
  const [hydratedOnce, setHydratedOnce] = useState(false);
  const [hydrationError, setHydrationError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!data || hydratedOnce || hydrationError) return;

    // A 200 response is not a guarantee of a well-formed payload — the generated
    // client does no runtime body validation. Guard the shape before handing it
    // to the engine so a malformed or partial bootstrap surfaces as a visible
    // error state instead of white-screening or infinite-spinning the whole SPA.
    if (typeof data !== "object" || !Array.isArray((data as { firms?: unknown }).firms)) {
      setHydrationError("Portfolio bootstrap payload was malformed (missing firms array).");
      return;
    }

    try {
      // The OpenAPI-generated type widens arrForRollup's tuple to number[]
      // (OpenAPI/Zod can't express fixed-length tuples). The server already
      // validates + writes this as a [number, number] pair (see
      // portfolioData.ts / buildFirmPortfolio), so this cast is safe.
      hydratePortfolioData(data.firms as unknown as { slug: string; companies: RawCompany[] }[]);
      // Register any pipeline-onboarded firms carried on the same payload so
      // getFirm()/getAllFirms() surface them alongside the static tenants
      // (legacy slugs are ignored inside registerDynamicFirms).
      registerDynamicFirms(data.firms);
      setHydratedOnce(true);
    } catch (err) {
      setHydrationError(err instanceof Error ? err.message : "Failed to hydrate portfolio data.");
    }
  }, [data, hydratedOnce, hydrationError]);

  const value: PortfolioDataContextValue =
    isError || hydrationError
      ? {
          status: "error",
          error:
            hydrationError ?? (error instanceof Error ? error.message : "Failed to load portfolio data"),
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
const FIRM_SCOPED_RE = /^\/[^/]+\/(portfolio|findings|benchmarks|risk|data-sources)(\/|$)/;

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
