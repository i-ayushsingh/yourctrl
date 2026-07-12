import { useEffect, useMemo } from "react";
import { Search, PlusCircle, AlertTriangle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/store";
import { AppCard } from "./AppCard";
import { WindowControls } from "./WindowControls";
import { sortCategories } from "@/data/categoryOrder";

import logoUrl from "@/assets/yourctrl.png";

/** Stable ID for a category section, used for scroll-to anchors. */
export function catId(name: string) {
  return "cat-" + name.replace(/[^a-z0-9]/gi, "-").toLowerCase();
}

export function Dashboard() {
  const query = useAppStore((s) => s.searchQuery);
  const setQuery = useAppStore((s) => s.setSearchQuery);
  const openApp = useAppStore((s) => s.openApp);
  const openSuggest = useAppStore((s) => s.openSuggest);
  const openReport = useAppStore((s) => s.openReport);
  const openSettings = useAppStore((s) => s.openSettings);

  const pendingCategoryScroll = useAppStore((s) => s.pendingCategoryScroll);
  const setPendingCategoryScroll = useAppStore((s) => s.setPendingCategoryScroll);

  useEffect(() => {
    if (pendingCategoryScroll) {
      const timer = setTimeout(() => {
        const el = document.getElementById(catId(pendingCategoryScroll));
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          setPendingCategoryScroll(null);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [pendingCategoryScroll, setPendingCategoryScroll]);

  const apps = useAppStore((s) => s.apps);

  const filtered = useMemo(() => {
    const t = query.trim().toLowerCase();
    if (!t) return apps;
    return apps.filter(
      (a) => a.app_name.toLowerCase().includes(t) || a.category.toLowerCase().includes(t),
    );
  }, [query, apps]);

  const byCategory = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, typeof apps>();
    for (const a of filtered) {
      if (!map.has(a.category)) {
        map.set(a.category, []);
        order.push(a.category);
      }
      map.get(a.category)!.push(a);
    }
    const sortedOrder = sortCategories(order);
    return sortedOrder.map((c) => [c, map.get(c)!] as const);
  }, [filtered]);

  return (
    <div className="flex h-screen flex-1 flex-col">
      {/* Title / search bar — draggable */}
      <header
        className="flex items-center gap-3 border-b border-border bg-background/70 py-2 pl-5 pr-1 backdrop-blur-xl"
        data-tauri-drag-region
      >
        <div className="flex items-center gap-1.5 pl-0.5" data-no-drag>
          <img src={logoUrl} alt="" className="size-9 rounded-lg object-contain" />
          <span className="text-sm font-semibold tracking-tight">YourCtrl</span>
        </div>
        <div className="relative max-w-xs flex-1" data-no-drag>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search 189 apps…"
            className="h-9 bg-muted/50 pl-9"
          />
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5" data-no-drag>
          <Button variant="ghost" size="sm" className="gap-2" onClick={openSuggest}>
            <PlusCircle className="size-4" />
            Suggest
          </Button>
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground" onClick={openReport}>
            <AlertTriangle className="size-4" />
            Report
          </Button>
          <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground" onClick={openSettings} aria-label="Settings">
            <Settings className="size-4" />
          </Button>
        </div>
        <WindowControls />
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-10 pt-2">
        {byCategory.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <p className="text-muted-foreground">No apps found. Try a different search.</p>
            <Button variant="secondary" onClick={openSuggest}>
              Suggest an app
            </Button>
          </div>
        ) : (
          byCategory.map(([category, apps]) => (
            <section key={category} id={catId(category)} className="scroll-mt-4 pt-6">
              <div className="mb-3 flex items-baseline gap-2">
                <h2 className="text-base font-semibold tracking-tight">{category}</h2>
                <span className="font-mono text-xs text-muted-foreground">{apps.length}</span>
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(158px,1fr))] gap-3">
                {apps.map((a) => (
                  <AppCard key={a.app_name} app={a} onClick={() => openApp(a.app_name)} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
