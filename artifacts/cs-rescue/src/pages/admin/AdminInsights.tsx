import { Sparkles, LineChart, Layers, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// ---------------------------------------------------------------------------
// AdminInsights — placeholder for cross-firm portfolio analytics. Intentionally
// non-functional today; establishes the third pillar of the platform shell so
// the nav (Firms / Pipeline / Insights) is complete.
// ---------------------------------------------------------------------------
const PLANNED = [
  {
    icon: LineChart,
    title: "Composite trends",
    body: "Normalized diagnostic scores over time, benchmarked across every firm's portfolio.",
  },
  {
    icon: Layers,
    title: "Tier distribution",
    body: "Where operational risk concentrates — tier mix rolled up across all tenants.",
  },
  {
    icon: ShieldCheck,
    title: "Data authority coverage",
    body: "How much of the book is client-verified (strict) vs. web-discovered (best effort).",
  },
] as const;

export default function AdminInsights() {
  return (
    <div data-testid="admin-insights-page">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-primary/80">
        Internal
      </div>
      <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
        <Sparkles className="h-5 w-5 text-primary" />
        Insights
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Cross-firm portfolio analytics. Coming soon.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {PLANNED.map((item) => (
          <Card key={item.title} className="opacity-80" data-testid={`insight-card-${item.title}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <item.icon className="h-4 w-4 text-primary" />
                {item.title}
              </CardTitle>
              <CardDescription>{item.body}</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                Planned
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
