import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/store";
import { filterShortcuts } from "@/filter";
import { AppIcon } from "./AppIcon";
import { ShortcutGroups } from "./ShortcutGroups";
import { WindowControls } from "./WindowControls";

export function ShortcutListView() {
  const selectedApp = useAppStore((s) => s.selectedApp);
  const openApp = useAppStore((s) => s.openApp);
  const back = useAppStore((s) => s.backToDashboard);
  const openReportWithPrefill = useAppStore((s) => s.openReportWithPrefill);
  const [query, setQuery] = useState("");
  const apps = useAppStore((s) => s.apps);

  const appsByName = useMemo(() => {
    return Object.fromEntries(apps.map((a) => [a.app_name, a]));
  }, [apps]);

  const app = selectedApp ? appsByName[selectedApp] : undefined;
  const shortcuts = useMemo(() => (app ? filterShortcuts(app.shortcuts, query) : []), [app, query]);

  const currentIndex = useMemo(() => {
    return apps.findIndex((a) => a.app_name === selectedApp);
  }, [selectedApp, apps]);

  const prevApp = useMemo(() => {
    if (currentIndex === -1 || apps.length === 0) return null;
    const idx = (currentIndex - 1 + apps.length) % apps.length;
    return apps[idx];
  }, [currentIndex, apps]);

  const nextApp = useMemo(() => {
    if (currentIndex === -1 || apps.length === 0) return null;
    const idx = (currentIndex + 1) % apps.length;
    return apps[idx];
  }, [currentIndex, apps]);

  const goToPrev = () => {
    if (prevApp) {
      openApp(prevApp.app_name);
      setQuery("");
    }
  };

  const goToNext = () => {
    if (nextApp) {
      openApp(nextApp.app_name);
      setQuery("");
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT") {
        return; // Don't trigger if search input is focused
      }
      if (e.key === "ArrowLeft") {
        goToPrev();
      } else if (e.key === "ArrowRight") {
        goToNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex]);

  return (
    <div className="flex h-screen flex-1 flex-col">
      <header
        className="flex items-center gap-3 border-b border-border bg-background/70 py-2 pl-3 pr-1 backdrop-blur-xl"
        data-tauri-drag-region
      >
        <Button variant="ghost" size="icon" onClick={back} aria-label="Back" data-no-drag>
          <ArrowLeft className="size-4" />
        </Button>
        {app && <AppIcon slug={app.icon_slug} color={app.brand_color} name={app.app_name} size={32} />}
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{app ? app.app_name : "App not found"}</div>
          {app && (
            <div className="font-mono text-[11px] text-muted-foreground">
              {app.category} · {app.shortcuts.length} shortcuts
            </div>
          )}
        </div>
        <div className="flex-1" />
        {app && (
          <div className="flex items-center gap-2" data-no-drag>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground hover:text-foreground"
              onClick={() => openReportWithPrefill(app.app_name, app.process_name)}
            >
              <AlertTriangle className="size-4" />
              Report
            </Button>
            <div className="relative w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search shortcuts"
                className="h-9 bg-muted/50 pl-9"
              />
            </div>
          </div>
        )}
        <WindowControls />
      </header>

      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        {/* Left Arrow Button */}
        {prevApp && (
          <button
            onClick={goToPrev}
            className="absolute left-0 top-0 bottom-0 z-10 flex w-16 items-center justify-center text-muted-foreground/20 hover:text-foreground hover:bg-white/[0.02] active:bg-white/[0.04] transition-all cursor-pointer"
            title={`Previous: ${prevApp.app_name}`}
          >
            <ChevronLeft className="size-8 transition-transform hover:-translate-x-0.5" />
          </button>
        )}

        {/* Shortcuts list container */}
        <div className="mx-auto w-full max-w-5xl flex-1 overflow-y-auto overscroll-contain px-16 pb-10 pt-5">
          {app ? <ShortcutGroups shortcuts={shortcuts} variant="card" /> : null}
        </div>

        {/* Right Arrow Button */}
        {nextApp && (
          <button
            onClick={goToNext}
            className="absolute right-0 top-0 bottom-0 z-10 flex w-16 items-center justify-center text-muted-foreground/20 hover:text-foreground hover:bg-white/[0.02] active:bg-white/[0.04] transition-all cursor-pointer"
            title={`Next: ${nextApp.app_name}`}
          >
            <ChevronRight className="size-8 transition-transform hover:translate-x-0.5" />
          </button>
        )}
      </div>
    </div>
  );
}
