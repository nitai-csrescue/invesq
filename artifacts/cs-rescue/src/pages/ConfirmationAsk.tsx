import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// ConfirmationAsk — the ONE deliberately external-facing page of the
// confirmation flow (Engagement Entry Step 2). Reached only via an expiring,
// unguessable /confirm/:token link an admin sent to a portco CS lead or PE
// operating partner. Self-contained chrome (no app sidebar/nav), scoped to a
// single company; the API payload never includes firm names, other
// companies, or anything enumerable.
//
// Copy policy: forward-looking, structural framing only — no employee
// sentiment/Glassdoor content, no GRR/NRR figures, no judgments of named
// individuals. Mobile-first (verified at 390x844).
// ---------------------------------------------------------------------------

const API_BASE = `${import.meta.env.BASE_URL}api`;

interface AskPillar {
  pillarId: string;
  label: string;
  prompt: string;
}
interface AskPayload {
  companyName: string;
  recipientRole: string;
  expiresAt: string;
  scoreOptions: { value: string; label: string }[];
  pillars: AskPillar[];
}
interface Answer {
  response: "confirm" | "correct" | null;
  correctedScore: string;
  note: string;
}

type PageState =
  | { kind: "loading" }
  | { kind: "invalid" }
  | { kind: "expired" }
  | { kind: "already_submitted" }
  | { kind: "ready"; payload: AskPayload }
  | { kind: "done" };

export default function ConfirmationAsk() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<PageState>({ kind: "loading" });
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [respondentName, setRespondentName] = useState("");
  const [respondentRole, setRespondentRole] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/confirmations/${token}`);
        if (cancelled) return;
        if (res.status === 404) return setState({ kind: "invalid" });
        if (res.status === 410) {
          const body = await res.json().catch(() => ({}));
          return setState({
            kind: body?.error === "already_submitted" ? "already_submitted" : "expired",
          });
        }
        if (!res.ok) return setState({ kind: "invalid" });
        const payload = (await res.json()) as AskPayload;
        setAnswers(
          Object.fromEntries(
            payload.pillars.map((p) => [p.pillarId, { response: null, correctedScore: "", note: "" }]),
          ),
        );
        setState({ kind: "ready", payload });
      } catch {
        if (!cancelled) setState({ kind: "invalid" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const setAnswer = (pillarId: string, patch: Partial<Answer>) =>
    setAnswers((prev) => ({ ...prev, [pillarId]: { ...prev[pillarId], ...patch } }));

  const allAnswered =
    state.kind === "ready" &&
    state.payload.pillars.every((p) => {
      const a = answers[p.pillarId];
      return a?.response === "confirm" || (a?.response === "correct" && a.correctedScore);
    });

  async function submit() {
    if (state.kind !== "ready" || !allAnswered || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`${API_BASE}/confirmations/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: state.payload.pillars.map((p) => {
            const a = answers[p.pillarId];
            return {
              pillarId: p.pillarId,
              response: a.response,
              ...(a.response === "correct" ? { correctedScore: a.correctedScore } : {}),
              ...(a.note.trim() ? { note: a.note.trim() } : {}),
            };
          }),
          ...(respondentName.trim() ? { respondentName: respondentName.trim() } : {}),
          ...(respondentRole.trim() ? { respondentRole: respondentRole.trim() } : {}),
        }),
      });
      if (res.status === 410) {
        setState({ kind: "already_submitted" });
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setSubmitError(body?.error ?? "Something went wrong. Please try again.");
        return;
      }
      setState({ kind: "done" });
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const shellClass =
    "min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center px-4 py-8 sm:py-14";
  const cardClass = "w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm";

  if (state.kind === "loading") {
    return (
      <div className={shellClass}>
        <div className="flex items-center gap-2 text-sm text-slate-500 mt-20">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      </div>
    );
  }

  if (state.kind !== "ready" && state.kind !== "done") {
    const copy =
      state.kind === "already_submitted"
        ? {
            title: "Response already received",
            body: "This confirmation has already been submitted. No further action is needed — thank you.",
          }
        : state.kind === "expired"
          ? {
              title: "This link has expired",
              body: "For security, confirmation links are time-limited. Please ask your INVESQ contact to send a fresh link.",
            }
          : {
              title: "This link is not valid",
              body: "Please check the link you received, or ask your INVESQ contact to send a new one.",
            };
    return (
      <div className={shellClass}>
        <div className={`${cardClass} mt-16 text-center`}>
          <h1 className="text-lg font-semibold">{copy.title}</h1>
          <p className="mt-2 text-sm text-slate-600">{copy.body}</p>
        </div>
      </div>
    );
  }

  if (state.kind === "done") {
    return (
      <div className={shellClass}>
        <div className={`${cardClass} mt-16 text-center`}>
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
          <h1 className="mt-3 text-lg font-semibold">Thank you</h1>
          <p className="mt-2 text-sm text-slate-600">
            Your responses have been recorded and will sharpen the operating picture going forward.
            There is nothing further to do.
          </p>
        </div>
      </div>
    );
  }

  const { payload } = state;

  return (
    <div className={shellClass}>
      <div className="w-full max-w-xl">
        <div className="flex items-center gap-2 text-slate-500">
          <ShieldCheck className="h-5 w-5 text-sky-600" />
          <span className="text-xs font-semibold tracking-wider uppercase">
            INVESQ Operational Diagnostic
          </span>
        </div>
        <h1 className="mt-3 text-xl font-semibold sm:text-2xl">
          Help us confirm the operating picture for {payload.companyName}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Our diagnostic flagged a small number of areas where we did not have enough information
          to assess {payload.companyName} with confidence. This takes about two minutes: for each
          area, confirm our read or tell us how it actually stands today. Your answers are
          structural and forward-looking — they describe how the function is set up, not any
          individual.
        </p>

        <div className="mt-6 space-y-4">
          {payload.pillars.map((pillar, idx) => {
            const a = answers[pillar.pillarId];
            return (
              <div key={pillar.pillarId} className={cardClass}>
                <div className="text-xs font-medium text-slate-400">
                  {idx + 1} of {payload.pillars.length}
                </div>
                <h2 className="mt-1 font-semibold">{pillar.label}</h2>
                <p className="mt-1 text-sm text-slate-600">{pillar.prompt}</p>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant={a?.response === "confirm" ? "default" : "outline"}
                    className="justify-start sm:flex-1"
                    onClick={() => setAnswer(pillar.pillarId, { response: "confirm" })}
                    data-testid={`button-confirm-${pillar.pillarId}`}
                  >
                    Correct — not enough to assess yet
                  </Button>
                  <Button
                    type="button"
                    variant={a?.response === "correct" ? "default" : "outline"}
                    className="justify-start sm:flex-1"
                    onClick={() => setAnswer(pillar.pillarId, { response: "correct" })}
                    data-testid={`button-correct-${pillar.pillarId}`}
                  >
                    Let me describe it
                  </Button>
                </div>

                {a?.response === "correct" && (
                  <div className="mt-3 space-y-2">
                    {payload.scoreOptions.map((opt) => (
                      <label
                        key={opt.value}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm ${
                          a.correctedScore === opt.value
                            ? "border-sky-500 bg-sky-50"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`score-${pillar.pillarId}`}
                          value={opt.value}
                          checked={a.correctedScore === opt.value}
                          onChange={() => setAnswer(pillar.pillarId, { correctedScore: opt.value })}
                          className="accent-sky-600"
                        />
                        {opt.label}
                      </label>
                    ))}
                    <textarea
                      value={a.note}
                      onChange={(e) => setAnswer(pillar.pillarId, { note: e.target.value })}
                      maxLength={500}
                      rows={2}
                      placeholder="Optional context (e.g. what is being built, target timeline)"
                      className="w-full rounded-lg border border-slate-200 p-2 text-sm focus:border-sky-500 focus:outline-none"
                      data-testid={`input-note-${pillar.pillarId}`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className={`${cardClass} mt-4`}>
          <h2 className="text-sm font-semibold">About you (optional)</h2>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={respondentName}
              onChange={(e) => setRespondentName(e.target.value)}
              maxLength={120}
              placeholder="Name"
              className="w-full rounded-lg border border-slate-200 p-2 text-sm focus:border-sky-500 focus:outline-none"
              data-testid="input-respondent-name"
            />
            <input
              value={respondentRole}
              onChange={(e) => setRespondentRole(e.target.value)}
              maxLength={120}
              placeholder="Role (e.g. VP Customer Success)"
              className="w-full rounded-lg border border-slate-200 p-2 text-sm focus:border-sky-500 focus:outline-none"
              data-testid="input-respondent-role"
            />
          </div>
        </div>

        {submitError && <p className="mt-3 text-sm text-red-600">{submitError}</p>}

        <Button
          className="mt-4 w-full"
          size="lg"
          disabled={!allAnswered || submitting}
          onClick={submit}
          data-testid="button-submit-confirmation"
        >
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Submit responses
        </Button>
        <p className="mt-3 pb-8 text-center text-xs text-slate-400">
          This link is private to {payload.companyName} and expires on{" "}
          {new Date(payload.expiresAt).toLocaleDateString()}.
        </p>
      </div>
    </div>
  );
}
