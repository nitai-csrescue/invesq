import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Database, ShieldCheck, Upload } from "lucide-react";
import {
  useImportAdminBackengine,
  useListAdminBackengineNameMap,
  getListAdminBackengineNameMapQueryKey,
  getGetCsRescueInternalBackengineQueryKey,
  type BackengineImportResult,
} from "@workspace/api-client-react";

// ---------------------------------------------------------------------------
// /admin/backengine — dogfood BackEngine import + real-name mapping table.
//
// ADMIN-ONLY surface (server-side requireAdminAuth on every route it calls).
// The mapping table below is the ONLY place real account names are ever
// visible; everything tenant-facing renders placeholders exclusively. Do not
// export, print, or embed this table anywhere.
// ---------------------------------------------------------------------------
export default function AdminBackengine() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<BackengineImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: mapData, isLoading: mapLoading } = useListAdminBackengineNameMap();
  const importMutation = useImportAdminBackengine({
    mutation: {
      onSuccess: (data) => {
        setResult(data);
        setError(null);
        void queryClient.invalidateQueries({ queryKey: getListAdminBackengineNameMapQueryKey() });
        void queryClient.invalidateQueries({ queryKey: getGetCsRescueInternalBackengineQueryKey() });
      },
      onError: (err) => {
        setResult(null);
        setError(err instanceof Error ? err.message : "Import failed");
      },
    },
  });

  async function handleFile(file: File) {
    const isXlsx = /\.xlsx?$/i.test(file.name);
    if (isXlsx) {
      const buf = await file.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      importMutation.mutate({ data: { format: "xlsx", content: btoa(binary) } });
    } else {
      importMutation.mutate({ data: { format: "csv", content: await file.text() } });
    }
  }

  const rows = mapData?.rows ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">BackEngine (dogfood)</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Import BackEngine exports for the CS Rescue Internal tenant. Every real account name is
          replaced with a stable placeholder before anything is stored — the mapping below never
          leaves this admin surface.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Upload className="h-4 w-4" /> Import export file
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Accepts the Accounts-tab shape (Name + sentiment/engagement columns) or the Monitor/Feed
          shape (category + summary + date), as .csv or .xlsx. Null engagement metrics are valid.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={importMutation.isPending}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {importMutation.isPending ? "Importing…" : "Choose file & import"}
          </button>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            Anonymization enforced at import — real names never reach tenant tables
          </span>
        </div>
        {error && <p className="mt-3 text-xs text-rose-500">{error}</p>}
        {result && (
          <div className="mt-3 rounded-lg border border-border bg-background/40 p-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              Import complete ({result.shape} shape).
            </span>{" "}
            {result.rowsRead} rows read
            {result.shape === "accounts" ? (
              <>
                , {result.uniqueAccounts} unique accounts ({result.duplicatesCollapsed} duplicate
                {result.duplicatesCollapsed === 1 ? "" : "s"} collapsed), {result.newPlaceholders} new
                placeholder{result.newPlaceholders === 1 ? "" : "s"} assigned, {result.accountsUpserted}{" "}
                rows upserted.
              </>
            ) : (
              <>, {result.signalsInserted} anonymized signals inserted.</>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Database className="h-4 w-4" /> Real name → placeholder mapping
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Admin-only. Deterministic (hash-keyed) and stable across re-imports. Never included in
          tenant routes, exports, or PDFs.
        </p>
        <div className="mt-3 overflow-x-auto">
          {mapLoading ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-xs text-muted-foreground">No mappings yet — run an import.</p>
          ) : (
            <table className="w-full min-w-[420px] text-left text-xs">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Placeholder</th>
                  <th className="py-2 pr-3 font-medium">Real name</th>
                  <th className="py-2 font-medium">Mapped</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0">
                    <td className="py-1.5 pr-3 font-medium text-foreground">{r.placeholder}</td>
                    <td className="py-1.5 pr-3 text-muted-foreground">{r.realName}</td>
                    <td className="py-1.5 text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
