export function ConfidenceBadge({ confidence }: { confidence: "High" | "Medium" | "Low" }) {
  const cls = "border-slate-400/40 bg-slate-400/10 text-slate-500";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${cls}`}
      title="Assessment confidence based on the breadth and consistency of available external signals"
    >
      Confidence: {confidence}
    </span>
  );
}
