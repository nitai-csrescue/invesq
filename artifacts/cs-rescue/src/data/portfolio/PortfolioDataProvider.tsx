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
import { firmRequiresLogin, registerDynamicFirms } from "./firms";
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
  return FIRM_SCOPED_RE.test(location);
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

  // requireLogin enforcement — only for firm-scoped tenant routes, and only
  // when the bootstrap-derived access map flags this firm. Defaults to false
  // for every firm today, so RequireLoginGate never mounts and anonymous
  // tenant pages make ZERO auth calls (no admin footprint in the anon path).
  const firmSlug = location.split("/")[1] ?? "";
  if (FIRM_SCOPED_RE.test(location) && firmRequiresLogin(firmSlug)) {
    return <TenantLoginGate firmSlug={firmSlug}>{children}</TenantLoginGate>;
  }

  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// TenantLoginGate — magic-link (email OTP) gate for login-required tenant
// portals (STG-only rollout). No passwords anywhere. Entirely separate from
// the admin OIDC auth: it talks only to /api/tenant-auth/*, and the session
// lives in an httpOnly signed cookie — nothing is stored client-side.
//
// Flow: (1) if the URL carries ?login_token= (from the emailed link), POST
// /verify, then strip the token from the URL and hard-reload so the
// bootstrap is refetched WITH the session cookie (gated firms' data is
// redacted server-side for anonymous requests). (2) Otherwise check
// /session; authenticated renders the portal, anonymous gets the
// request-a-link screen.
// ---------------------------------------------------------------------------
function TenantLoginGate({ firmSlug, children }: { firmSlug: string; children: ReactNode }) {
  const [phase, setPhase] = useState<"checking" | "anonymous" | "authenticated">("checking");
  const [verifyError, setVerifyError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const loginToken = params.get("login_token");
      if (loginToken) {
        try {
          const res = await fetch("/api/tenant-auth/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ token: loginToken }),
          });
          if (res.ok) {
            // Strip the one-time token from the URL, then hard-reload so the
            // bootstrap refetches with the new session cookie attached.
            params.delete("login_token");
            const clean =
              window.location.pathname + (params.size ? `?${params.toString()}` : "");
            window.history.replaceState(null, "", clean);
            window.location.reload();
            return;
          }
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          if (!cancelled) {
            setVerifyError(body?.error ?? "This sign-in link is invalid or has expired.");
            setPhase("anonymous");
          }
          return;
        } catch {
          if (!cancelled) {
            setVerifyError("Could not verify the sign-in link. Please request a new one.");
            setPhase("anonymous");
          }
          return;
        }
      }

      try {
        const res = await fetch("/api/tenant-auth/session", { credentials: "include" });
        const body = (await res.json()) as { authenticated?: boolean; firmSlug?: string };
        if (!cancelled) {
          setPhase(body.authenticated && body.firmSlug === firmSlug ? "authenticated" : "anonymous");
        }
      } catch {
        if (!cancelled) setPhase("anonymous");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [firmSlug]);

  if (phase === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Checking access…
      </div>
    );
  }

  if (phase === "anonymous") {
    return <TenantLoginScreen firmSlug={firmSlug} initialError={verifyError} />;
  }

  return <>{children}</>;
}

function TenantLoginScreen({ firmSlug, initialError }: { firmSlug: string; initialError: string | null }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(initialError);

  async function requestLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || state === "sending") return;
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/tenant-auth/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), firmSlug }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Could not send the sign-in link. Please try again.");
        setState("idle");
        return;
      }
      setState("sent");
    } catch {
      setError("Could not send the sign-in link. Please try again.");
      setState("idle");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-xl font-semibold tracking-tight">INVESQ</div>
          <div className="mt-1 text-sm text-muted-foreground">Portfolio portal sign-in</div>
        </div>

        {state === "sent" ? (
          <div className="rounded-lg border border-border bg-card p-6 text-center">
            <div className="text-sm font-medium">Check your email</div>
            <p className="mt-2 text-sm text-muted-foreground">
              If that address has access, a one-time sign-in link is on its way. The link
              expires in 15 minutes.
            </p>
            <button
              type="button"
              onClick={() => setState("idle")}
              className="mt-4 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={requestLink} className="rounded-lg border border-border bg-card p-6">
            <label htmlFor="tenant-login-email" className="block text-sm font-medium">
              Work email
            </label>
            <input
              id="tenant-login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourfirm.com"
              className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            />
            {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
            <button
              type="submit"
              disabled={state === "sending"}
              className="mt-4 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {state === "sending" ? "Sending…" : "Email me a sign-in link"}
            </button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              No password needed — we email you a one-time link.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
