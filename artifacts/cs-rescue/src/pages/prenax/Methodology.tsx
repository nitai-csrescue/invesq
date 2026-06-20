import { Database, RefreshCw, Layers } from "lucide-react";
import { PrenaxLayout } from "@/components/prenax/PrenaxLayout";
import { Card } from "@/components/prenax/PrenaxComponents";
import { SCORING_MODEL, METHODOLOGY, type HealthBand } from "@/data/prenax";

const BAND_STYLES: Record<HealthBand, { bar: string; text: string; ring: string }> = {
  green: { bar: "bg-emerald-500", text: "text-emerald-400", ring: "border-emerald-500/20 bg-emerald-500/5" },
  amber: { bar: "bg-amber-500", text: "text-amber-400", ring: "border-amber-500/20 bg-amber-500/5" },
  red: { bar: "bg-rose-500", text: "text-rose-400", ring: "border-rose-500/20 bg-rose-500/5" },
};

const totalWeight = SCORING_MODEL.reduce((s, d) => s + d.weight, 0);

export default function Methodology() {
  return (
    <PrenaxLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">Methodology &amp; Scoring Model</h1>
        <p className="text-slate-400 mt-1 max-w-3xl">{METHODOLOGY.scale}</p>
      </div>

      {/* Context strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-5">
        <Card className="p-5 flex items-center gap-3">
          <Database className="w-5 h-5 text-indigo-400" />
          <div>
            <div className="text-xs text-slate-500">Data source</div>
            <div className="text-sm font-medium text-white">{METHODOLOGY.source}</div>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-indigo-400" />
          <div>
            <div className="text-xs text-slate-500">Cadence</div>
            <div className="text-sm font-medium text-white">{METHODOLOGY.cadence}</div>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-3">
          <Layers className="w-5 h-5 text-indigo-400" />
          <div>
            <div className="text-xs text-slate-500">Scope</div>
            <div className="text-sm font-medium text-white">{METHODOLOGY.phase}</div>
          </div>
        </Card>
      </div>

      {/* Scoring model */}
      <Card className="p-6 mb-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">Health Score Dimensions &amp; Weights</h2>
          <span className="text-xs text-slate-500">
            Total weight <span className="font-semibold text-slate-300">{totalWeight}</span>
          </span>
        </div>
        <div className="space-y-4">
          {SCORING_MODEL.map((d) => (
            <div key={d.key} className="grid grid-cols-12 items-center gap-4">
              <div className="col-span-12 sm:col-span-4">
                <div className="text-sm font-medium text-white">{d.label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{d.description}</div>
              </div>
              <div className="col-span-9 sm:col-span-6">
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-indigo-500"
                    style={{ width: `${(d.weight / totalWeight) * 100}%` }}
                  />
                </div>
              </div>
              <div className="col-span-3 sm:col-span-2 text-right">
                <span className="text-lg font-bold text-white">{d.weight}</span>
                <span className="text-xs text-slate-500"> / 100</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Bands */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
        {METHODOLOGY.bands.map((b) => {
          const s = BAND_STYLES[b.band];
          return (
            <Card key={b.band} className={`p-5 border ${s.ring}`}>
              <div className="flex items-center justify-between">
                <span className={`text-sm font-semibold ${s.text}`}>{b.label}</span>
                <span className="text-xs font-medium text-slate-400">{b.range}</span>
              </div>
              <div className={`mt-3 h-1.5 w-full rounded-full ${s.bar}`} />
              <p className="mt-3 text-sm text-slate-400 leading-relaxed">{b.meaning}</p>
            </Card>
          );
        })}
      </div>

      {/* Notes */}
      <Card className="p-6">
        <h2 className="text-base font-semibold text-white mb-3">How to read this diagnostic</h2>
        <ul className="space-y-2">
          {METHODOLOGY.notes.map((n, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-slate-400">
              <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-indigo-400" />
              {n}
            </li>
          ))}
        </ul>
      </Card>
    </PrenaxLayout>
  );
}
