// Archived from primary nav on 2026-04-22. Kept for reuse — not routed.
import { useState } from "react";
import { 
  useListConnectors, 
  getListConnectorsQueryKey,
  useGetConnectorHealth,
  getGetConnectorHealthQueryKey,
  useUpdateConnector,
  useCreateConnector
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  XCircle,
  HelpCircle,
  Plus
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Connectors() {
  const queryClient = useQueryClient();
  const { data: connectors = [], isLoading: isLoadingConnectors } = useListConnectors({
    query: { queryKey: getListConnectorsQueryKey() }
  });
  
  const { data: health } = useGetConnectorHealth({
    query: { queryKey: getGetConnectorHealthQueryKey() }
  });

  const updateConnector = useUpdateConnector();
  const createConnector = useCreateConnector();

  const handleToggle = (id: string, currentStatus: string) => {
    updateConnector.mutate({
      id,
      data: { status: currentStatus === 'enabled' ? 'disabled' : 'enabled' }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListConnectorsQueryKey() });
      }
    });
  };

  return (
    <div className="space-y-8 pb-10 p-6 h-full overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Connector Admin</h1>
          <p className="text-muted-foreground">Manage external API connections and integrations.</p>
        </div>
        <Button className="shrink-0" data-testid="btn-add-connector">
          <Plus className="w-4 h-4 mr-2" /> Add Connector
        </Button>
      </div>

      {/* Health Summary */}
      {health && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Healthy</p>
              <p className="text-2xl font-bold">{health.healthy}</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Degraded</p>
              <p className="text-2xl font-bold">{health.degraded}</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
            <div className="p-2 bg-destructive/10 rounded-lg text-destructive">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Offline</p>
              <p className="text-2xl font-bold">{health.offline}</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
            <div className="p-2 bg-white/10 rounded-lg text-muted-foreground">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Unknown</p>
              <p className="text-2xl font-bold">{health.unknown}</p>
            </div>
          </div>
        </div>
      )}

      {/* Connectors Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-black/20 border-b border-border text-muted-foreground uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-medium">Connector</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Auth</th>
                <th className="px-6 py-4 font-medium">Environment</th>
                <th className="px-6 py-4 font-medium">Health</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoadingConnectors ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-4"><div className="h-5 bg-white/5 rounded w-full" /></td>
                  </tr>
                ))
              ) : connectors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No connectors configured.
                  </td>
                </tr>
              ) : (
                connectors.map(connector => (
                  <tr key={connector.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <LinkIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{connector.name}</p>
                          <p className="text-xs text-muted-foreground">{connector.dataOwner}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 capitalize">{connector.type}</td>
                    <td className="px-6 py-4 uppercase text-xs font-mono bg-white/5 px-2 py-1 rounded inline-block mt-3">{connector.authType}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded text-xs font-medium border",
                        connector.environment === 'production' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        connector.environment === 'staging' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                        "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      )}>
                        {connector.environment}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          connector.health === 'healthy' ? "bg-emerald-400" :
                          connector.health === 'degraded' ? "bg-amber-400" : 
                          connector.health === 'offline' ? "bg-destructive" : "bg-muted-foreground"
                        )} />
                        <span className="capitalize">{connector.health}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Switch 
                        checked={connector.status === 'enabled'} 
                        onCheckedChange={() => handleToggle(connector.id, connector.status)}
                        disabled={updateConnector.isPending}
                        data-testid={`switch-connector-${connector.id}`}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}