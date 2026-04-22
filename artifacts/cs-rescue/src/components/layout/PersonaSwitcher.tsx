import { ChevronDown, UserCircle2 } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { usePersona, PERSONAS, type Persona } from "@/lib/persona";
import { cn } from "@/lib/utils";

/** Global persona switcher used by both the in-app Header and the bare top bar. */
export function PersonaSwitcher({ compact = false }: { compact?: boolean }) {
  const { persona, setPersona } = usePersona();
  const current = PERSONAS.find((p) => p.id === persona)!;

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (open) {
      const idx = PERSONAS.findIndex((p) => p.id === persona);
      setActiveIndex(idx >= 0 ? idx : 0);
    }
  }, [open, persona]);

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const closeAndFocusButton = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => buttonRef.current?.focus());
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!open) return;
    if (e.key === "Escape") { e.preventDefault(); closeAndFocusButton(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => (i + 1) % PERSONAS.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => (i - 1 + PERSONAS.length) % PERSONAS.length); }
    else if (e.key === "Home") { e.preventDefault(); setActiveIndex(0); }
    else if (e.key === "End") { e.preventDefault(); setActiveIndex(PERSONAS.length - 1); }
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setPersona(PERSONAS[activeIndex].id as Persona);
      closeAndFocusButton();
    }
  };

  return (
    <div className="relative" ref={ref} onKeyDown={onKeyDown}>
      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-white/10 bg-slate-900/60 hover:bg-slate-800/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        data-testid="persona-switcher"
      >
        <div className="w-7 h-7 rounded-md bg-gradient-to-br from-cyan-500/30 to-indigo-500/30 border border-cyan-400/30 flex items-center justify-center">
          <UserCircle2 className="w-4 h-4 text-cyan-200" />
        </div>
        {!compact && (
          <div className="text-left">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 leading-none">Viewing as</p>
            <p className="text-sm font-semibold text-white leading-tight">{current.label}</p>
          </div>
        )}
        {compact && <span className="text-sm font-semibold text-white">{current.label}</span>}
        <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full mt-2 w-72 rounded-xl border border-white/10 bg-slate-950/95 backdrop-blur-xl shadow-2xl shadow-black/40 z-50 overflow-hidden"
        >
          <div className="px-3 py-2 border-b border-white/5">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Switch persona</p>
          </div>
          {PERSONAS.map((p, idx) => (
            <button
              key={p.id}
              ref={(el) => { optionRefs.current[idx] = el; }}
              role="option"
              aria-selected={p.id === persona}
              tabIndex={idx === activeIndex ? 0 : -1}
              onMouseEnter={() => setActiveIndex(idx)}
              onClick={() => { setPersona(p.id as Persona); closeAndFocusButton(); }}
              className={cn(
                "w-full text-left px-3 py-2.5 hover:bg-white/5 transition-colors flex items-start gap-3 border-l-2 focus-visible:outline-none focus-visible:bg-white/10",
                p.id === persona ? "border-cyan-400 bg-cyan-500/5" : "border-transparent",
                idx === activeIndex && "bg-white/[0.04]",
              )}
              data-testid={`persona-option-${p.id}`}
            >
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{p.label}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{p.tagline}</p>
              </div>
              {p.id === persona && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Workspace label shown in the header next to the persona switcher. */
export function WorkspaceLabel() {
  return (
    <div className="hidden md:flex items-center gap-2 pl-3 ml-1 border-l border-white/10" data-testid="workspace-label">
      <div className="w-7 h-7 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-[11px] font-bold text-cyan-200">A</div>
      <div className="leading-tight">
        <p className="text-[10px] uppercase tracking-wider text-slate-500">Workspace</p>
        <p className="text-sm font-semibold text-white">Acme Inc.</p>
      </div>
    </div>
  );
}
