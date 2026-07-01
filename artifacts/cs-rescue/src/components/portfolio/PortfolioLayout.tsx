import { ReactNode } from "react";
import { Link } from "wouter";
import { ShieldCheck, ChevronDown } from "lucide-react";
import { FIRM_NAME } from "@/data/portfolioRollup";

export function PortfolioLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b border-border">
        <div className="max-w-screen-xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <Link href="/portfolio" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/30">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-foreground tracking-tight">
                INVESQ <span className="text-muted-foreground font-normal">· Portfolio Intelligence</span>
              </div>
              <div className="text-[11px] uppercase tracking-wider text-primary/80">
                Operational Due Diligence
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Design-partner preview
            </span>
            <div className="flex items-center gap-2.5 rounded-full border border-border bg-card pl-1.5 pr-3 py-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                {FIRM_NAME.slice(0, 2)}
              </div>
              <div className="leading-tight text-right">
                <div className="text-xs font-medium text-foreground">{FIRM_NAME}</div>
                <div className="text-[10px] text-muted-foreground">Signed in</div>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-screen-xl mx-auto px-6 py-8">{children}</main>

      <footer className="border-t border-border">
        <div className="max-w-screen-xl mx-auto px-6 py-4 text-center text-[11px] text-muted-foreground">
          INVESQ Portfolio Intelligence · Prepared for {FIRM_NAME} · Scores illustrative — Phase 1 external-signal
          diagnostic. Trend data is illustrative pending periodic re-runs.
        </div>
      </footer>
    </div>
  );
}
