import { useMemo } from "react";
import { Settings, Keyboard, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppStore } from "@/store";
import logoUrl from "@/assets/yourctrl.png";
import { sortCategories } from "@/data/categoryOrder";

export function catId(name: string) {
  return "cat-" + name.replace(/[^a-z0-9]/gi, "-").toLowerCase();
}

export function AppSidebar() {
  const route = useAppStore((s) => s.route);
  const openSettings = useAppStore((s) => s.openSettings);
  const backToDashboard = useAppStore((s) => s.backToDashboard);
  const apps = useAppStore((s) => s.apps);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const a of apps) {
      if (!seen.has(a.category)) {
        seen.add(a.category);
        list.push(a.category);
      }
    }
    return sortCategories(list);
  }, [apps]);

  const jumpTo = (category: string) => {
    if (route !== "dashboard") {
      useAppStore.getState().setPendingCategoryScroll(category);
      backToDashboard();
    } else {
      document.getElementById(catId(category))?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar/85">
      <div className="flex items-center gap-2.5 px-4 pb-3 pt-4" data-tauri-drag-region>
        <img src={logoUrl} alt="" className="size-9 rounded-lg object-contain" />
        <div className="leading-none">
          <div className="text-sm font-semibold tracking-tight text-sidebar-foreground">YourCtrl</div>
          <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">shortcuts, instantly</div>
        </div>
      </div>

      <div className="px-4 pb-1 pt-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Categories</span>
      </div>
      <ScrollArea className="flex-1 min-h-0 px-2">
        <nav className="flex flex-col gap-0.5 pb-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => jumpTo(c)}
              className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <Keyboard className="size-3.5 shrink-0 opacity-50" />
              <span className="truncate">{c}</span>
            </button>
          ))}
        </nav>
      </ScrollArea>

      <div className="flex flex-col gap-2 border-t border-sidebar-border p-3">
        <Button
          variant={route === "settings" ? "secondary" : "ghost"}
          className="w-full justify-start gap-2"
          onClick={openSettings}
        >
          <Settings className="size-4" />
          Settings
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => useAppStore.getState().openSuggest()}>
          <PlusCircle className="size-4" />
          Suggest an app
        </Button>
      </div>
    </aside>
  );
}
