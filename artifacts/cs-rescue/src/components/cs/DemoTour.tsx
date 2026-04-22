import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, X, CheckCircle2 } from "lucide-react";

const LS_COMPLETED = "cs-rescue.tour.completed";
const START_EVENT = "cs-rescue:start-tour";

type Step = {
  id: string;
  path: string;
  selector: string;
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    id: "insights",
    path: "/dashboard",
    selector: '[data-tour="insight-rail"]',
    title: "AI Insight rail",
    body:
      "Every morning the rail surfaces the few moves that matter — pre-briefed and ready to act on, so reps never start cold.",
  },
  {
    id: "atrisk",
    path: "/dashboard",
    selector: '[data-tour="atrisk-table"]',
    title: "At-risk accounts",
    body:
      "Accounts trending toward churn, ranked by health score. One click jumps straight into the deep profile.",
  },
  {
    id: "drawer",
    path: "/accounts?accountId=a_wayne",
    selector: '[data-testid="account-drawer"]',
    title: "Deep account profile",
    body:
      "A 360° drawer per account: usage, risks, expansion thesis, activity, and the next-best actions — all in one view.",
  },
  {
    id: "signals",
    path: "/signals",
    selector: '[data-tour="signal-categories"]',
    title: "Signal categories",
    body:
      "The taxonomy CS Rescue watches across product, support, finance, and CRM data. Each pattern triggers an action.",
  },
  {
    id: "playbook",
    path: "/playbooks?playbookId=pb_retention_save",
    selector: '[data-testid="playbook-drawer"]',
    title: "Playbook drawer",
    body:
      "Playbooks are runnable sequences with measurable outcomes. A signal fires, the matching playbook deploys.",
  },
  {
    id: "actions",
    path: "/actions",
    selector: '[data-tour="actions-queue"]',
    title: "Actions queue",
    body:
      "Every recommendation lands here. CSMs work it like an inbox — Start, Complete, ship the day.",
  },
  {
    id: "reports",
    path: "/reports",
    selector: '[data-tour="reports-grid"]',
    title: "Executive reports",
    body:
      "The quarterly story for the leadership team: net retention, expansion pipeline, time-to-value, and playbook impact.",
  },
];

export function isTourCompleted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(LS_COMPLETED) === "true";
}

export function startDemoTour() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(START_EVENT));
}

type Rect = { top: number; left: number; width: number; height: number };

export function DemoTour() {
  const [active, setActive] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [, setLocation] = useLocation();

  const total = STEPS.length;
  const step = STEPS[stepIdx];

  // Listen for external start trigger
  useEffect(() => {
    const onStart = () => {
      setStepIdx(0);
      setActive(true);
    };
    window.addEventListener(START_EVENT, onStart);
    return () => window.removeEventListener(START_EVENT, onStart);
  }, []);

  // Esc to close
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(false);
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, stepIdx]);

  // On step change: navigate, then poll for the target.
  useEffect(() => {
    if (!active) return;
    setTarget(null);
    setRect(null);
    setLocation(step.path);

    let cancelled = false;
    let attempts = 0;
    const find = () => {
      if (cancelled) return;
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        // Measure after the scroll has had a chance to settle.
        window.setTimeout(() => {
          if (cancelled) return;
          setTarget(el);
          setRect(toRect(el.getBoundingClientRect()));
        }, 250);
        return;
      }
      attempts++;
      if (attempts < 80) window.setTimeout(find, 75);
    };
    const t = window.setTimeout(find, 80);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, stepIdx]);

  // Reposition when target moves/resizes.
  useEffect(() => {
    if (!target) return;
    const update = () => setRect(toRect(target.getBoundingClientRect()));
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    const ro = new ResizeObserver(update);
    ro.observe(target);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      ro.disconnect();
    };
  }, [target]);

  const finish = useCallback(() => {
    try {
      window.localStorage.setItem(LS_COMPLETED, "true");
    } catch {
      /* ignore */
    }
    setActive(false);
  }, []);

  const skip = useCallback(() => {
    setActive(false);
  }, []);

  const next = useCallback(() => {
    setStepIdx((i) => {
      if (i >= total - 1) {
        finish();
        return i;
      }
      return i + 1;
    });
  }, [total, finish]);

  const back = useCallback(() => {
    setStepIdx((i) => Math.max(0, i - 1));
  }, []);

  if (!active) return null;

  const isLast = stepIdx === total - 1;
  const tooltipPos = computeTooltipPosition(rect);

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] pointer-events-none"
      data-testid="demo-tour"
      aria-live="polite"
    >
      {/* Backdrop with cut-out via box-shadow trick */}
      {rect ? (
        <div
          className="absolute rounded-lg ring-2 ring-cyan-400/90 transition-all duration-200 pointer-events-none"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: "0 0 0 9999px rgba(2, 6, 23, 0.72)",
          }}
          data-testid="demo-tour-highlight"
        />
      ) : (
        <div className="absolute inset-0 bg-slate-950/70 pointer-events-auto" />
      )}

      {/* Tooltip */}
      <div
        className="absolute pointer-events-auto w-[340px] max-w-[calc(100vw-32px)] rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-md shadow-2xl shadow-cyan-500/10 p-4"
        style={{ top: tooltipPos.top, left: tooltipPos.left }}
        role="dialog"
        aria-label={`Tour step ${stepIdx + 1} of ${total}`}
        data-testid="demo-tour-tooltip"
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-400/80 font-semibold">
            Step {stepIdx + 1} of {total}
          </p>
          <button
            onClick={skip}
            className="text-slate-500 hover:text-slate-200 transition-colors"
            aria-label="Close tour"
            data-testid="demo-tour-close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <h3 className="text-base font-bold text-white mb-1.5">{step.title}</h3>
        <p className="text-[13px] text-slate-300 leading-relaxed">{step.body}</p>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mt-3">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all ${
                i === stepIdx
                  ? "w-5 bg-cyan-400"
                  : i < stepIdx
                  ? "w-1.5 bg-cyan-400/40"
                  : "w-1.5 bg-white/10"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={skip}
            className="text-slate-400 hover:text-slate-200 h-8"
            data-testid="demo-tour-skip"
          >
            Skip tour
          </Button>
          <div className="flex items-center gap-2">
            {stepIdx > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={back}
                className="h-8 gap-1"
                data-testid="demo-tour-back"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </Button>
            )}
            <Button
              size="sm"
              onClick={next}
              className="h-8 gap-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950"
              data-testid="demo-tour-next"
            >
              {isLast ? (
                <>
                  Finish <CheckCircle2 className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  Next <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function toRect(r: DOMRect): Rect {
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function computeTooltipPosition(rect: Rect | null): { top: number; left: number } {
  const pad = 16;
  const w = 340;
  const h = 220; // approximate
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 720;

  if (!rect) {
    return { top: Math.max(pad, vh / 2 - h / 2), left: Math.max(pad, vw / 2 - w / 2) };
  }

  const spaceBelow = vh - (rect.top + rect.height);
  const spaceAbove = rect.top;

  let top: number;
  if (spaceBelow >= h + pad || spaceBelow >= spaceAbove) {
    top = Math.min(vh - h - pad, rect.top + rect.height + 12);
  } else {
    top = Math.max(pad, rect.top - h - 12);
  }

  // Try to align tooltip horizontally near the rect, clamped into viewport.
  let left = rect.left;
  if (left + w + pad > vw) left = vw - w - pad;
  if (left < pad) left = pad;

  return { top, left };
}
