// Archived from primary nav on 2026-04-22. Kept for reuse — not routed.
import { useState } from "react";
import { 
  useListResources, 
  getListResourcesQueryKey,
  Resource
} from "@workspace/api-client-react";
import { 
  Database,
  Search,
  Filter,
  ArrowRightLeft,
  ArrowRight,
  ArrowLeft,
  Globe,
  Lock,
  Building
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { usePersona } from "@/lib/persona";
import { PERSONA_PAGE_COPY } from "@/lib/persona-copy";

export default function Resources() {
  const { persona } = usePersona();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [envFilter, setEnvFilter] = useState<string>("all");

  const { data: resources = [], isLoading } = useListResources(undefined, {
    query: { queryKey: getListResourcesQueryKey() }
  });

  const filteredResources = resources.filter(res => {
    if (search && !res.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter !== 'all' && res.category !== categoryFilter) return false;
    if (envFilter !== 'all' && res.environment !== envFilter) return false;
    return true;
  });

  const categories = Array.from(new Set(resources.map(r => r.category)));

  return (
    <div className="space-y-6 pb-10 p-6 h-full overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Resource Explorer</h1>
          <p className="text-muted-foreground italic">{PERSONA_PAGE_COPY[persona].resources}</p>
          <p className="text-xs text-slate-500 mt-1">
            Resources are the underlying systems in your environment (CRM, warehouse, identity, APIs).
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-xl border border-border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search resources..." 
            className="pl-9 bg-black/20"
            value={search}
            onChange={e => setSearch(e.target.value)}
            data-testid="input-search-resources"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px] bg-black/20" data-testid="select-category">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={envFilter} onValueChange={setEnvFilter}>
          <SelectTrigger className="w-[180px] bg-black/20" data-testid="select-environment">
            <SelectValue placeholder="Environment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Environments</SelectItem>
            <SelectItem value="production">Production</SelectItem>
            <SelectItem value="staging">Staging</SelectItem>
            <SelectItem value="sandbox">Sandbox</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-card/50 border border-border animate-pulse" />
          ))
        ) : filteredResources.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            No resources found matching your filters.
          </div>
        ) : (
          filteredResources.map((resource) => (
            <div key={resource.id} className="bg-card hover:bg-card/80 transition-colors border border-border rounded-xl p-5 flex flex-col group cursor-pointer" data-testid={`resource-card-${resource.id}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div className={cn(
                  "px-2 py-1 rounded text-xs font-medium border",
                  resource.environment === 'production' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                  resource.environment === 'staging' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                  "bg-amber-500/10 text-amber-400 border-amber-500/20"
                )}>
                  {resource.environment}
                </div>
              </div>
              
              <h3 className="font-semibold text-lg mb-1">{resource.name}</h3>
              <p className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
                <Building className="w-3 h-3" /> {resource.vendor}
              </p>
              
              <div className="mt-auto pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    resource.status === 'connected' ? "bg-emerald-400" :
                    resource.status === 'degraded' ? "bg-amber-400" : "bg-destructive"
                  )} />
                  <span className="capitalize">{resource.status}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  {resource.dataDirection === 'inbound' && <ArrowRight className="w-3 h-3" />}
                  {resource.dataDirection === 'outbound' && <ArrowLeft className="w-3 h-3" />}
                  {resource.dataDirection === 'bidirectional' && <ArrowRightLeft className="w-3 h-3" />}
                  <span className="capitalize">{resource.dataDirection}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}