import type { Shortcut } from "./types";

export type SearchScope = "action" | "all";

export function filterShortcuts(
  shortcuts: Shortcut[],
  query: string,
  scope: SearchScope = "all"
): Shortcut[] {
  const t = query.trim().toLowerCase();
  if (!t) return shortcuts;
  return shortcuts.filter((s) => {
    const matchesAction = s.action.toLowerCase().includes(t);
    if (scope === "action") return matchesAction;
    return (
      matchesAction ||
      s.section.toLowerCase().includes(t) ||
      s.keys.flat().join(" ").toLowerCase().includes(t)
    );
  });
}

