import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, X, HelpCircle, ArrowLeft, Check, AlertTriangle, ThumbsUp, ChevronRight, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/store";
import { filterShortcuts } from "@/filter";
import { AppIcon } from "./AppIcon";
import { ShortcutGroups } from "./ShortcutGroups";
import { dismissPopover } from "@/popover-control";
import { cn } from "@/lib/utils";

const UNSUPPORTED = "__unsupported__";

export function CommandPopover() {
  const [selected, setSelected] = useState("");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"desktop_list" | "shortcuts" | "suggest" | "unsupported">("shortcuts");
  const [runningApps, setRunningApps] = useState<string[]>([]);
  const [originWasDesktop, setOriginWasDesktop] = useState(false);

  const autoFocusSearch = useAppStore((s) => s.autoFocusSearch);
  const showShortcutCountBadge = useAppStore((s) => s.showShortcutCountBadge);
  const popoverOpacity = useAppStore((s) => s.popoverOpacity);
  const searchScope = useAppStore((s) => s.searchScope);

  const [detectedProcess, setDetectedProcess] = useState("");
  const [showSuggestForm, setShowSuggestForm] = useState(false);

  const [formAppName, setFormAppName] = useState("");
  const [formWebsite, setFormWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [reportingBroken, setReportingBroken] = useState(false);
  const [reportedApps, setReportedApps] = useState<Record<string, boolean>>({});
  const [votingSupport, setVotingSupport] = useState(false);
  const [votedProcesses, setVotedProcesses] = useState<Record<string, boolean>>({});

  const apps = useAppStore((s) => s.apps);
  const appsByName = useMemo(() => {
    return Object.fromEntries(apps.map((a) => [a.app_name, a]));
  }, [apps]);

  const app = (selected && selected !== UNSUPPORTED) ? appsByName[selected] : undefined;
  const shortcuts = useMemo(() => (app ? filterShortcuts(app.shortcuts, query, searchScope) : []), [app, query, searchScope]);
  const devMode =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("dev") === "1";

  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, selected]);

  useEffect(() => {
    if (detectedProcess) {
      const base = detectedProcess.replace(/\.exe$/i, "");
      const capitalized = base.charAt(0).toUpperCase() + base.slice(1);
      setFormAppName(capitalized);
    } else {
      setFormAppName("");
    }
    setFormWebsite("");
    setSuccess(false);
    setError("");
  }, [detectedProcess, showSuggestForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          access_key: "369b82a5-c2e9-4b23-b2e6-7f5521df375c",
          subject: `New App Suggestion: ${formAppName}`,
          app_name: formAppName,
          process_name: detectedProcess,
          website: formWebsite,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(true);
      } else {
        setError(json.message || "Something went wrong.");
      }
    } catch (err) {
      setError("Failed to send suggestion. Please check your network.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReportBroken = async () => {
    if (!app) return;
    setReportingBroken(true);
    try {
      await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: "369b82a5-c2e9-4b23-b2e6-7f5521df375c",
          subject: `Broken Shortcuts Report: ${app.app_name}`,
          app_name: app.app_name,
          process_name: detectedProcess,
          type: "broken_report",
        }),
      });
      setReportedApps((prev) => ({ ...prev, [app.app_name]: true }));
    } catch (e) {
      console.error(e);
    } finally {
      setReportingBroken(false);
    }
  };

  const handleVoteSupport = async () => {
    if (!detectedProcess) return;
    setVotingSupport(true);
    try {
      await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: "369b82a5-c2e9-4b23-b2e6-7f5521df375c",
          subject: `App Request Upvote: ${detectedProcess}`,
          app_name: formAppName,
          process_name: detectedProcess,
          type: "upvote",
        }),
      });
      setVotedProcesses((prev) => ({ ...prev, [detectedProcess]: true }));
    } catch (e) {
      console.error(e);
    } finally {
      setVotingSupport(false);
    }
  };

  const setApps = useAppStore((s) => s.setApps);

  useEffect(() => {
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      void (async () => {
        const { invoke } = await import("@tauri-apps/api/core");
        try {
          const apps = await invoke<any[]>("get_apps");
          setApps(apps);
        } catch (e) {
          console.error("Failed to load apps from SQLite in popover", e);
        }
      })();
    }
  }, [setApps]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        void dismissPopover();
        return;
      }

      if (view === "shortcuts" && shortcuts.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % shortcuts.length);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + shortcuts.length) % shortcuts.length);
        } else if (e.key === "Enter") {
          e.preventDefault();
          void dismissPopover();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, shortcuts.length]);

  // Real/Mock detection: adopt the focused app the backend captured on Ctrl-hold.
  useEffect(() => {
    const adopt = async (appName: string | null, processName: string) => {
      const isDesktop = !processName || processName.toLowerCase() === "explorer.exe";
      if (isDesktop) {
        setOriginWasDesktop(true);
        setView("desktop_list");
        setSelected("");
        if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
          try {
            const { invoke } = await import("@tauri-apps/api/core");
            const apps = await invoke<string[]>("get_running_apps");
            setRunningApps(apps);
          } catch (e) {
            console.error("Failed to load running apps", e);
          }
        } else {
          setRunningApps(["Spotify", "Visual Studio Code", "Google Chrome", "Adobe Photoshop", "Slack"]);
        }
      } else {
        const storeApps = useAppStore.getState().apps;
        const storeAppsByName = Object.fromEntries(storeApps.map((a) => [a.app_name, a]));
        if (appName && storeAppsByName[appName]) {
          setSelected(appName);
          setView("shortcuts");
          setOriginWasDesktop(false);
        } else {
          setSelected(UNSUPPORTED);
          setView("unsupported");
          setOriginWasDesktop(false);
        }
      }
      setDetectedProcess(processName || "");
      setQuery("");
      setShowSuggestForm(false);
    };

    if (!("__TAURI_INTERNALS__" in window)) {
      // Mock desktop detection on startup for browser preview
      void adopt(null, "explorer.exe");
      return;
    }

    let unlisten: (() => void) | undefined;
    void (async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      const { listen } = await import("@tauri-apps/api/event");
      try {
        const active = await invoke<{ app_name: string | null; process_name: string }>("get_active_app");
        if (active) {
          void adopt(active.app_name, active.process_name);
        }
      } catch {
        /* ignore */
      }
      unlisten = await listen<{ app_name: string | null; process_name: string }>("active-app-changed", (e) => {
        void adopt(e.payload.app_name, e.payload.process_name);
      });
    })();
    return () => unlisten?.();
  }, []);

  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) return;
    let unlisten: (() => void) | undefined;
    void (async () => {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      unlisten = await getCurrentWindow().onFocusChanged(({ payload: focused }) => {
        if (!focused) void dismissPopover();
      });
    })();
    return () => unlisten?.();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
      className="flex h-screen max-h-[520px] flex-col overflow-hidden rounded-xl text-popover-foreground ring-1 ring-white/8 backdrop-blur-2xl dark:ring-white/6"
      style={{ backgroundColor: `rgba(15, 15, 17, ${popoverOpacity})` }}
    >
      {/* Title bar */}
      <div className="flex items-center gap-2.5 px-3 py-2.5" data-tauri-drag-region>
        {view === "desktop_list" ? (
          <>
            <div className="flex size-5 shrink-0 items-center justify-center text-primary">
              <LayoutGrid className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold leading-tight">Running Apps</div>
              {showShortcutCountBadge && (
                <div className="text-[10px] text-muted-foreground/60">{runningApps.length} open applications</div>
              )}
            </div>
          </>
        ) : app ? (
          <>
            {originWasDesktop && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setView("desktop_list");
                  setSelected("");
                  setQuery("");
                }}
                className="size-6 mr-1 shrink-0 rounded-md text-muted-foreground/60 hover:bg-white/5 hover:text-foreground cursor-pointer"
                title="Back to running apps"
              >
                <ArrowLeft className="size-3.5" />
              </Button>
            )}
            <div className="flex size-5 shrink-0 items-center justify-center">
              <AppIcon slug={app.icon_slug} color={app.brand_color} name={app.app_name} size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold leading-tight">{app.app_name}</div>
              {showShortcutCountBadge && (
                <div className="text-[10px] text-muted-foreground/60">{app.shortcuts.length} shortcuts</div>
              )}
            </div>
          </>
        ) : (
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold leading-tight">
              {formAppName || detectedProcess || "Unknown App"}
            </div>
            <div className="text-[10px] text-muted-foreground/60">
              {detectedProcess || "unrecognized process"}
            </div>
          </div>
        )}
        <div className="flex items-center gap-1" data-no-drag>
          {view === "shortcuts" && app && (
            <Button
              variant="ghost"
              size="icon"
              disabled={reportingBroken || reportedApps[app.app_name]}
              onClick={handleReportBroken}
              className={cn(
                "size-6 rounded-md text-muted-foreground/50 hover:bg-yellow-500/10 hover:text-yellow-500",
                reportedApps[app.app_name] && "text-emerald-500 hover:bg-transparent hover:text-emerald-500"
              )}
              title={reportedApps[app.app_name] ? "Reported as broken" : "Report broken shortcuts"}
            >
              {reportedApps[app.app_name] ? (
                <Check className="size-3.5" />
              ) : (
                <AlertTriangle className="size-3.5" />
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-6 rounded-md text-muted-foreground/50 hover:bg-destructive/15 hover:text-destructive"
            onClick={() => void dismissPopover()}
            aria-label="Close"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </div>

      {devMode && (
        <div className="px-3 pb-2" data-no-drag>
          <select
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              setQuery("");
              setView(e.target.value === UNSUPPORTED ? "unsupported" : "shortcuts");
            }}
            className="w-full rounded-md border border-border bg-muted/50 px-2 py-1 text-xs"
          >
            <option value="">(Desktop Mode)</option>
            {apps.map((a) => (
              <option key={a.app_name} value={a.app_name}>
                {a.app_name}
              </option>
            ))}
            <option value={UNSUPPORTED}>(Unsupported app)</option>
          </select>
        </div>
      )}

      {view === "desktop_list" ? (
        <>
          {/* Search bar for running apps */}
          <div className="border-t border-white/5 px-2.5 py-1">
            <div className="flex h-8 items-center gap-2 rounded-lg bg-white/5 px-2.5">
              <Search className="size-3.5 shrink-0 text-muted-foreground/50" />
              <input
                autoFocus={autoFocusSearch}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search running apps..."
                className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground/40"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="shrink-0 text-muted-foreground/40 hover:text-muted-foreground/70"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-scroll px-2 pb-4 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden space-y-1">
            {(() => {
              const q = query.trim().toLowerCase();
              const filteredRunning = runningApps.filter((name) => name.toLowerCase().includes(q));

              if (filteredRunning.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-xs text-muted-foreground">
                    No running supported apps found
                  </div>
                );
              }

              return filteredRunning.map((name) => {
                const appObj = appsByName[name];
                if (!appObj) return null;
                return (
                  <button
                    key={name}
                    onClick={() => {
                      setSelected(name);
                      setView("shortcuts");
                      setQuery("");
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-all hover:bg-white/8 active:bg-white/5 cursor-pointer"
                  >
                    <AppIcon slug={appObj.icon_slug} color={appObj.brand_color} name={appObj.app_name} size={24} />
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-xs font-semibold text-foreground/90">{appObj.app_name}</div>
                      <div className="text-[10px] text-muted-foreground/60">{appObj.shortcuts.length} shortcuts</div>
                    </div>
                    <ChevronRight className="size-3.5 text-muted-foreground/40" />
                  </button>
                );
              });
            })()}
          </div>
        </>
      ) : view === "shortcuts" && app ? (
        <>
          {/* Search — borderless, seamlessly integrated */}
          <div className="border-t border-white/5 px-2.5 py-1">
            <div className="flex h-8 items-center gap-2 rounded-lg bg-white/5 px-2.5">
              <Search className="size-3.5 shrink-0 text-muted-foreground/50" />
              <input
                autoFocus={autoFocusSearch}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search shortcuts..."
                className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground/40"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="shrink-0 text-muted-foreground/40 hover:text-muted-foreground/70"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-scroll px-2 pb-4 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <ShortcutGroups shortcuts={shortcuts} variant="flat" size="sm" onItemClick={() => void dismissPopover()} selectedIndex={selectedIndex} />
          </div>
        </>
      ) : showSuggestForm ? (
        <div className="flex flex-1 flex-col px-5 py-4 gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSuggestForm(false)}
              className="text-muted-foreground/60 hover:text-foreground text-xs flex items-center gap-1 cursor-pointer bg-transparent border-0 outline-none p-0"
            >
              <ArrowLeft className="size-3.5" /> Back
            </button>
            <span className="text-xs font-semibold text-muted-foreground">Suggest a new app</span>
          </div>

          {success ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center py-6">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Check className="size-6" />
              </div>
              <div className="text-sm font-semibold">Suggestion Sent!</div>
              <p className="text-xs text-muted-foreground max-w-[280px]">
                Thank you! We've received your request for <strong>{formAppName}</strong> and will add it soon.
              </p>
              <Button size="sm" variant="secondary" onClick={() => setShowSuggestForm(false)} className="mt-2 h-8">
                Back to Popover
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="popover-app-name" className="text-[11px] font-medium text-muted-foreground">
                  App Name
                </label>
                <Input
                  id="popover-app-name"
                  required
                  value={formAppName}
                  onChange={(e) => setFormAppName(e.target.value)}
                  placeholder="e.g. Spotify"
                  className="h-8 bg-white/5 border-white/10 text-xs focus-visible:ring-1 focus-visible:ring-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="popover-process-name" className="text-[11px] font-medium text-muted-foreground">
                  Process Name
                </label>
                <Input
                  id="popover-process-name"
                  readOnly
                  value={detectedProcess}
                  placeholder="e.g. spotify.exe"
                  className="h-8 bg-white/5 border-white/5 text-xs text-muted-foreground select-none cursor-not-allowed"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="popover-website" className="text-[11px] font-medium text-muted-foreground">
                  Website / Doc Link (Optional)
                </label>
                <Input
                  id="popover-website"
                  value={formWebsite}
                  onChange={(e) => setFormWebsite(e.target.value)}
                  placeholder="e.g. https://spotify.com"
                  className="h-8 bg-white/5 border-white/10 text-xs focus-visible:ring-1 focus-visible:ring-primary"
                />
              </div>

              {error && <div className="text-[10px] text-destructive font-medium">{error}</div>}

              <div className="flex-grow" />

              <Button size="sm" type="submit" disabled={submitting} className="w-full h-8 mt-4">
                {submitting ? "Sending..." : "Submit Suggestion"}
              </Button>
            </form>
          )}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground/60">
            <HelpCircle className="size-6" />
          </div>
          <div className="space-y-1.5">
            <div className="text-sm font-semibold text-foreground/90">
              {formAppName || "This App"} is not supported yet
            </div>
            <div className="text-xs font-mono text-muted-foreground/80 bg-muted/40 px-2 py-0.5 rounded border border-border/40 inline-block">
              {detectedProcess || "unknown.exe"}
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground max-w-[280px]">
            No shortcuts have been mapped for this app. Vote to request support or suggest details!
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Button
              size="sm"
              variant="outline"
              disabled={votingSupport || votedProcesses[detectedProcess]}
              onClick={handleVoteSupport}
              className={cn(
                "gap-1.5 h-8 text-xs font-medium transition-colors border-white/10 hover:bg-white/5",
                votedProcesses[detectedProcess] && "text-emerald-500 hover:text-emerald-500 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/5"
              )}
            >
              {votedProcesses[detectedProcess] ? (
                <>
                  <Check className="size-3.5" /> Voted!
                </>
              ) : (
                <>
                  <ThumbsUp className="size-3.5" /> {votingSupport ? "Voting..." : "Upvote"}
                </>
              )}
            </Button>
            <Button
              size="sm"
              onClick={() => setShowSuggestForm(true)}
              className="gap-1.5 h-8 text-xs font-medium"
            >
              Suggest Details →
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
