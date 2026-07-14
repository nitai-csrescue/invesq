import { useCallback, useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// useHiddenFirms — admin-only, per-page firm visibility filter.
//
// Stores the HIDDEN firm slugs (not the visible ones) in localStorage under
// a per-page key, so:
//   - empty storage = everything visible (the required default), and
//   - newly onboarded firms are visible automatically until hidden.
// Each admin surface passes its own pageKey ("firms", "reports") so hiding a
// firm on the dashboard does not hide it on the reports page.
//
// This is a personal display preference for the signed-in admin's browser —
// deliberately NOT in the DB (unlike the shared sort order). It never
// affects tenant-facing pages.
// ---------------------------------------------------------------------------

function storageKey(pageKey: string): string {
  return `cs-rescue:admin-firm-filter:${pageKey}`;
}

function readHidden(pageKey: string): Set<string> {
  try {
    const raw = window.localStorage.getItem(storageKey(pageKey));
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((v): v is string => typeof v === "string"));
  } catch {
    return new Set();
  }
}

export function useHiddenFirms(pageKey: string) {
  const [hidden, setHidden] = useState<Set<string>>(() => readHidden(pageKey));

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey(pageKey), JSON.stringify([...hidden]));
    } catch {
      // Storage full/unavailable: the filter still works for this session.
    }
  }, [pageKey, hidden]);

  const toggleFirm = useCallback((slug: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  }, []);

  const showAll = useCallback(() => {
    setHidden(new Set());
  }, []);

  const isVisible = useCallback((slug: string) => !hidden.has(slug), [hidden]);

  return { hidden, toggleFirm, showAll, isVisible };
}
