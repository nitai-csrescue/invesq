import { ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// ---------------------------------------------------------------------------
// FirmFilterControl — the admin-only show/hide firm picker shared by the
// /admin firms dashboard and /admin/reports. Purely a display filter over
// data the admin already has; visibility state lives in useHiddenFirms
// (localStorage, per page).
// ---------------------------------------------------------------------------
export interface FirmFilterOption {
  slug: string;
  name: string;
}

export function FirmFilterControl({
  firms,
  hidden,
  onToggle,
  onShowAll,
}: {
  firms: FirmFilterOption[];
  hidden: Set<string>;
  onToggle: (slug: string) => void;
  onShowAll: () => void;
}) {
  const hiddenCount = firms.filter((f) => hidden.has(f.slug)).length;
  const visibleCount = firms.length - hiddenCount;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" data-testid="button-firm-filter">
          <ListFilter className="h-4 w-4" />
          Firms
          {hiddenCount > 0 && (
            <span className="rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[11px] text-primary">
              {visibleCount}/{firms.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3" data-testid="popover-firm-filter">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Show firms
          </span>
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={onShowAll}
              className="text-xs text-primary hover:underline"
              data-testid="button-firm-filter-show-all"
            >
              Show all
            </button>
          )}
        </div>
        <div className="mt-2 max-h-72 space-y-1 overflow-y-auto">
          {firms.map((firm) => (
            <label
              key={firm.slug}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/50"
              data-testid={`firm-filter-option-${firm.slug}`}
            >
              <Checkbox
                checked={!hidden.has(firm.slug)}
                onCheckedChange={() => onToggle(firm.slug)}
                data-testid={`firm-filter-checkbox-${firm.slug}`}
              />
              <span className="truncate text-foreground">{firm.name}</span>
            </label>
          ))}
          {firms.length === 0 && (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">No firms yet.</p>
          )}
        </div>
        <p className="mt-2 border-t border-border pt-2 text-[11px] leading-snug text-muted-foreground">
          Display filter for this admin view only. Saved in this browser.
        </p>
      </PopoverContent>
    </Popover>
  );
}
