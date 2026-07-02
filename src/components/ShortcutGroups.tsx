import { cn } from "@/lib/utils";
import type { Shortcut } from "@/types";
import { KeyCap } from "./KeyCap";
import { ShieldAlert } from "lucide-react";

function groupBySection(shortcuts: Shortcut[]): [string, Shortcut[]][] {
  const order: string[] = [];
  const map = new Map<string, Shortcut[]>();
  for (const s of shortcuts) {
    if (!map.has(s.section)) {
      map.set(s.section, []);
      order.push(s.section);
    }
    map.get(s.section)!.push(s);
  }
  return order.map((name) => [name, map.get(name)!]);
}

interface ShortcutGroupsProps {
  shortcuts: Shortcut[];
  variant?: "card" | "flat";
  size?: "sm" | "md";
  onItemClick?: () => void;
  selectedIndex?: number; // Enable keyboard navigation highlighting
}

export function ShortcutGroups({ shortcuts, variant = "card", size = "md", onItemClick, selectedIndex = -1 }: ShortcutGroupsProps) {
  if (shortcuts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <p className="text-xs text-muted-foreground/50">No shortcuts match</p>
      </div>
    );
  }

  // Flatten index counter for keyboard navigation
  let currentFlatIdx = 0;

  return (
    <div className="flex flex-col">
      {groupBySection(shortcuts).map(([section, items], si) => (
        <section key={section} className={si > 0 ? "mt-4" : undefined}>
          <div className="mb-0.5 px-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/40">
            {section}
          </div>
          <div
            className={cn(
              variant === "card" && "relative grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-0.5 overflow-hidden rounded-xl border border-border/50 bg-card/40 p-3 md:after:absolute md:after:top-3 md:after:bottom-3 md:after:left-1/2 md:after:w-[1px] md:after:bg-border/30 md:after:-translate-x-1/2",
            )}
          >
            {items.map((s, i) => {
              const globalIdx = currentFlatIdx++;
              const isFocused = globalIdx === selectedIndex;
              return (
                <div
                  key={`${s.action}-${i}`}
                  onClick={onItemClick}
                  className={cn(
                    "flex items-center justify-between gap-4 rounded-lg px-2.5 py-1.5 transition-colors",
                    onItemClick ? "cursor-pointer" : "",
                    isFocused 
                      ? "bg-primary/20 text-foreground font-medium ring-1 ring-primary/30" 
                      : onItemClick ? "hover:bg-accent/60" : "hover:bg-accent/40"
                  )}
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span 
                      className="truncate text-[13px] text-foreground/80" 
                      title={s.description || s.action}
                    >
                      {s.action}
                    </span>
                    {s.verified_against_official === false && (
                      <span title="Unverified shortcut" className="shrink-0">
                        <ShieldAlert
                          className="size-3.5 text-yellow-500/80"
                          aria-label="Unverified shortcut"
                        />
                      </span>
                    )}
                  </div>
                  <KeyCap keys={s.keys} size={size} />
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
