import { Building2 } from "lucide-react";
import { usePersona } from "@/lib/persona";
import { accounts } from "@/data";

/**
 * Visible only when the Customer persona is active. Lets the user pick which
 * account the outside-in "Customer" view represents. The choice is persisted
 * via PersonaProvider.
 */
export function CustomerAccountPicker() {
  const { persona, customerAccountId, setCustomerAccountId } = usePersona();
  if (persona !== "customer") return null;

  const sorted = [...accounts].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <label
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-cyan-400/30 bg-cyan-500/10 hover:bg-cyan-500/15 transition-colors"
      data-testid="customer-account-picker"
    >
      <Building2 className="w-4 h-4 text-cyan-200 shrink-0" />
      <div className="leading-tight">
        <p className="text-[10px] uppercase tracking-wider text-cyan-200/80 leading-none">
          Viewing account
        </p>
        <select
          value={customerAccountId}
          onChange={(e) => setCustomerAccountId(e.target.value)}
          className="bg-transparent text-sm font-semibold text-white focus:outline-none cursor-pointer pr-1"
          data-testid="customer-account-select"
          aria-label="Pick the customer account to represent"
        >
          {sorted.map((a) => (
            <option key={a.id} value={a.id} className="bg-slate-900 text-white">
              {a.name}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}
