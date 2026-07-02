import { useMemo, useState, useEffect } from "react";
import { ArrowLeft, Search, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAppStore } from "@/store";
import { AppIcon } from "./AppIcon";
import { WindowControls } from "./WindowControls";

interface CustomSelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (val: any) => void;
  options: CustomSelectOption[];
}

function CustomSelect({ value, onChange, options }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((o) => o.value === value) || options[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between rounded-lg border border-border bg-muted/30 hover:bg-muted/50 px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-40 cursor-pointer transition-all duration-150"
      >
        <span className="truncate font-medium">{selectedOption?.label}</span>
        <ChevronDown className={cn("size-3.5 ml-1 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open && (
        <>
          {/* Backdrop to close click-away */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          
          <div className="absolute right-0 mt-1.5 z-50 w-40 overflow-hidden rounded-xl border border-white/8 bg-[#18181b]/95 p-1 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-1 duration-150">
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-all cursor-pointer font-medium",
                    isSelected
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-foreground/80 hover:bg-white/8 hover:text-foreground"
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check className="size-3.5 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export function SettingsView() {
  const back = useAppStore((s) => s.backToDashboard);
  const excludedApps = useAppStore((s) => s.excludedApps);
  const toggleExcluded = useAppStore((s) => s.toggleExcluded);
  const holdMs = useAppStore((s) => s.holdMs);
  const setHoldMs = useAppStore((s) => s.setHoldMs);
  const autostart = useAppStore((s) => s.autostart);
  const setAutostart = useAppStore((s) => s.setAutostart);
  const startMinimized = useAppStore((s) => s.startMinimized);
  const setStartMinimized = useAppStore((s) => s.setStartMinimized);
  const disableUnsupportedTrigger = useAppStore((s) => s.disableUnsupportedTrigger);
  const setDisableUnsupportedTrigger = useAppStore((s) => s.setDisableUnsupportedTrigger);
  const autoFocusSearch = useAppStore((s) => s.autoFocusSearch);
  const setAutoFocusSearch = useAppStore((s) => s.setAutoFocusSearch);
  const showShortcutCountBadge = useAppStore((s) => s.showShortcutCountBadge);
  const setShowShortcutCountBadge = useAppStore((s) => s.setShowShortcutCountBadge);
  const resetExcludedApps = useAppStore((s) => s.resetExcludedApps);
  const popoverPosition = useAppStore((s) => s.popoverPosition);
  const setPopoverPosition = useAppStore((s) => s.setPopoverPosition);
  const popoverOpacity = useAppStore((s) => s.popoverOpacity);
  const setPopoverOpacity = useAppStore((s) => s.setPopoverOpacity);
  const popoverScale = useAppStore((s) => s.popoverScale);
  const setPopoverScale = useAppStore((s) => s.setPopoverScale);
  const globalHotkey = useAppStore((s) => s.globalHotkey);
  const setGlobalHotkey = useAppStore((s) => s.setGlobalHotkey);
  const hotkeyConflict = useAppStore((s) => s.hotkeyConflict);
  const setHotkeyConflict = useAppStore((s) => s.setHotkeyConflict);
  const searchScope = useAppStore((s) => s.searchScope);
  const setSearchScope = useAppStore((s) => s.setSearchScope);
  const autoUpdate = useAppStore((s) => s.autoUpdate);
  const setAutoUpdate = useAppStore((s) => s.setAutoUpdate);
  const [filter, setFilter] = useState("");
  const [activeApp, setActiveApp] = useState<{ app_name: string; process_name: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<string | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    
    void (async () => {
      if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
        try {
          const { invoke } = await import("@tauri-apps/api/core");
          const initial = await invoke<{ app_name: string; process_name: string }>("get_active_app");
          setActiveApp(initial);
        } catch (e) {
          console.error("Failed to get initial active app", e);
        }
        
        try {
          const { listen } = await import("@tauri-apps/api/event");
          unlisten = await listen<{ app_name: string; process_name: string }>(
            "active-app-changed",
            (event) => {
              setActiveApp(event.payload);
            }
          );
        } catch (e) {
          console.error("Failed to listen for active-app-changed", e);
        }
      }
    })();
    
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const handleRefreshDatabase = async () => {
    setRefreshing(true);
    setRefreshStatus(null);
    try {
      if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
        const { invoke } = await import("@tauri-apps/api/core");
        const updated = await invoke<any[]>("refresh_database");
        useAppStore.getState().setApps(updated);
        setRefreshStatus("Database reloaded successfully!");
      } else {
        setRefreshStatus("Not running in Tauri; simulated refresh.");
      }
    } catch (e) {
      console.error(e);
      setRefreshStatus("Error reloading database.");
    } finally {
      setRefreshing(false);
      setTimeout(() => setRefreshStatus(null), 3000);
    }
  };

  const handleCheckForUpdates = async () => {
    setCheckingUpdate(true);
    setUpdateStatus(null);
    setUpdateVersion(null);
    try {
      if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
        const { invoke } = await import("@tauri-apps/api/core");
        const update = await invoke<{ version: string; current_version: string; body: string | null } | null>("fetch_update");
        if (update) {
          setUpdateVersion(update.version);
          setUpdateStatus(`Update available: v${update.version}`);
        } else {
          setUpdateStatus("You're up to date!");
        }
      } else {
        setUpdateStatus("Not running in Tauri; simulated check.");
      }
    } catch (e) {
      console.error(e);
      setUpdateStatus("Error checking for updates.");
    } finally {
      setCheckingUpdate(false);
      setTimeout(() => setUpdateStatus(null), 5000);
    }
  };

  const handleInstallUpdate = async () => {
    setDownloading(true);
    setDownloadProgress(0);
    try {
      if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
        const { invoke } = await import("@tauri-apps/api/core");
        const { Channel } = await import("@tauri-apps/api/core");
        const onEvent = new Channel();
        onEvent.onmessage = (event: any) => {
          if (event.event === "Progress") {
            setDownloadProgress((prev) => (prev || 0) + event.data.chunkLength);
          } else if (event.event === "Finished") {
            setDownloadProgress(null);
            setUpdateStatus("Update installed! Restarting...");
          }
        };
        await invoke("install_update", { onEvent });
      }
    } catch (e) {
      console.error(e);
      setUpdateStatus("Error installing update.");
    } finally {
      setDownloading(false);
    }
  };

  const storeApps = useAppStore((s) => s.apps);
  const apps = useMemo(() => {
    const t = filter.trim().toLowerCase();
    return t ? storeApps.filter((a) => a.app_name.toLowerCase().includes(t)) : storeApps;
  }, [filter, storeApps]);

  return (
    <div className="flex h-screen flex-1 flex-col">
      <header
        className="flex items-center gap-3 border-b border-border bg-background/70 py-2 pl-3 pr-1 backdrop-blur-xl"
        data-tauri-drag-region
      >
        <Button variant="ghost" size="icon" onClick={back} aria-label="Back" data-no-drag>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-sm font-semibold">Settings</h1>
        <div className="flex-1" />
        <WindowControls />
      </header>

      <div className="mx-auto w-full max-w-5xl flex-1 overflow-y-auto px-5 pb-10 pt-6">
        {/* General settings */}
        <h2 className="mb-2 px-1 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
          General Settings
        </h2>
        <div className="mb-6 overflow-hidden rounded-xl border border-border bg-card/60 divide-y divide-border/40">
          {/* Launch on Startup */}
          <div className="flex items-center justify-between p-4">
            <div className="space-y-0.5">
              <label className="text-xs font-medium text-foreground">Launch on System Startup</label>
              <div className="text-[10px] text-muted-foreground">
                Automatically start Yourctrl when Windows boots up.
              </div>
            </div>
            <Switch checked={autostart} onCheckedChange={setAutostart} aria-label="Launch on Startup" />
          </div>

          {/* Start Minimized */}
          <div className="flex items-center justify-between p-4">
            <div className="space-y-0.5">
              <label className="text-xs font-medium text-foreground">Start Minimized</label>
              <div className="text-[10px] text-muted-foreground">
                Launch the application minimized in the system tray.
              </div>
            </div>
            <Switch checked={startMinimized} onCheckedChange={setStartMinimized} aria-label="Start Minimized" />
          </div>

          {/* Disable Popover on Unsupported Apps */}
          <div className="flex items-center justify-between p-4">
            <div className="space-y-0.5">
              <label className="text-xs font-medium text-foreground">Disable Popover on Unsupported Apps</label>
              <div className="text-[10px] text-muted-foreground">
                Never show the shortcut overlay if the active application has no shortcuts configured.
              </div>
            </div>
            <Switch
              checked={disableUnsupportedTrigger}
              onCheckedChange={setDisableUnsupportedTrigger}
              aria-label="Disable Popover on Unsupported Apps"
            />
          </div>

          {/* Auto Focus Search */}
          <div className="flex items-center justify-between p-4">
            <div className="space-y-0.5">
              <label className="text-xs font-medium text-foreground">Auto-Focus Search on Popover Open</label>
              <div className="text-[10px] text-muted-foreground">
                Automatically focus the search bar when the shortcut overlay appears.
              </div>
            </div>
            <Switch
              checked={autoFocusSearch}
              onCheckedChange={setAutoFocusSearch}
              aria-label="Auto Focus Search"
            />
          </div>

          {/* Show Shortcut Count Badge */}
          <div className="flex items-center justify-between p-4">
            <div className="space-y-0.5">
              <label className="text-xs font-medium text-foreground">Show Shortcut Count Badge</label>
              <div className="text-[10px] text-muted-foreground">
                Display the "N shortcuts" subtitle in the popover header for each app.
              </div>
            </div>
            <Switch
              checked={showShortcutCountBadge}
              onCheckedChange={setShowShortcutCountBadge}
              aria-label="Show Shortcut Count Badge"
            />
          </div>

          {/* Auto Update */}
          <div className="flex items-center justify-between p-4">
            <div className="space-y-0.5">
              <label className="text-xs font-medium text-foreground">Auto-Update</label>
              <div className="text-[10px] text-muted-foreground">
                Automatically check for and install updates when available.
              </div>
            </div>
            <Switch checked={autoUpdate} onCheckedChange={setAutoUpdate} aria-label="Auto Update" />
          </div>
        </div>

        {/* Popover Appearance & Position */}
        <h2 className="mb-2 px-1 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
          Popover Appearance & Position
        </h2>
        <div className="mb-6 overflow-hidden rounded-xl border border-border bg-card/60 p-4 space-y-4">
          {/* Popover Position */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-xs font-medium text-foreground">Popover Position</label>
              <div className="text-[10px] text-muted-foreground max-w-sm">
                Where the shortcut overlay displays on the screen.
              </div>
            </div>
            <CustomSelect
              value={popoverPosition}
              onChange={setPopoverPosition}
              options={[
                { value: "Center", label: "Center" },
                { value: "Top-Center", label: "Top-Center" },
                { value: "Bottom-Center", label: "Bottom-Center" },
                { value: "Near Cursor", label: "Near Cursor" },
              ]}
            />
          </div>

          {/* Backdrop Opacity */}
          <div className="flex items-center justify-between pt-2">
            <div className="space-y-0.5">
              <div className="flex items-baseline gap-2">
                <label className="text-xs font-medium text-foreground">Backdrop Opacity</label>
                <span className="font-mono text-[11px] text-primary">{Math.round(popoverOpacity * 100)}%</span>
              </div>
              <div className="text-[10px] text-muted-foreground max-w-sm">
                Opacity of the shortcut overlay's background.
              </div>
            </div>
            <div className="flex items-center justify-end w-40">
              <input
                type="range"
                min="0.5"
                max="1.0"
                step="0.05"
                value={popoverOpacity}
                onChange={(e) => setPopoverOpacity(Number(e.target.value))}
                className="w-full accent-primary h-[2px] bg-muted-foreground/20 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Popover Scale */}
          <div className="flex items-center justify-between pt-2">
            <div className="space-y-0.5">
              <div className="flex items-baseline gap-2">
                <label className="text-xs font-medium text-foreground">Popover Scale</label>
                <span className="font-mono text-[11px] text-primary">{Math.round(popoverScale * 100)}%</span>
              </div>
              <div className="text-[10px] text-muted-foreground max-w-sm">
                Resize the entire overlay for different screen sizes.
              </div>
            </div>
            <div className="flex items-center justify-end w-40">
              <input
                type="range"
                min="0.8"
                max="1.5"
                step="0.05"
                value={popoverScale}
                onChange={(e) => setPopoverScale(Number(e.target.value))}
                className="w-full accent-primary h-[2px] bg-muted-foreground/20 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Trigger settings */}
        <h2 className="mb-2 px-1 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
          Trigger Settings
        </h2>
        <div className="mb-6 overflow-hidden rounded-xl border border-border bg-card/60 p-4 space-y-4">
          {/* Hold duration threshold */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-baseline gap-2">
                <label className="text-xs font-medium text-foreground">Hold Duration</label>
                <span className="font-mono text-[11px] text-primary">{holdMs}ms</span>
              </div>
              <div className="text-[10px] text-muted-foreground max-w-sm">
                Time required to hold Ctrl before the shortcuts overlay appears.
              </div>
            </div>
            <div className="flex items-center justify-end w-40">
              <input
                type="range"
                min="150"
                max="1500"
                step="50"
                value={holdMs}
                onChange={(e) => setHoldMs(Number(e.target.value))}
                className="w-full accent-primary h-[2px] bg-muted-foreground/20 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Global Hotkey */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="space-y-0.5">
              <label className="text-xs font-medium text-foreground">Global Toggle Hotkey</label>
              <div className="text-[10px] text-muted-foreground max-w-sm">
                Hotkey to show/hide the main YourCtrl dashboard window.
              </div>
            </div>
            <input
              type="text"
              value={globalHotkey}
              onChange={(e) => setGlobalHotkey(e.target.value)}
              placeholder="e.g. Ctrl+Shift+Y"
              className="rounded-lg border border-border bg-muted/50 px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-40"
            />
          </div>

          {/* Hotkey conflict warning banner */}
          {hotkeyConflict && (
            <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2.5 text-xs text-yellow-400">
              <span className="mt-0.5 shrink-0 text-yellow-400">⚠</span>
              <div className="flex-1 min-w-0">
                <span className="font-semibold">Hotkey conflict detected</span>
                <span className="text-yellow-400/70"> — </span>
                <span className="font-mono">{hotkeyConflict}</span> is already registered by another app. Change the hotkey above.
              </div>
              <button
                onClick={() => setHotkeyConflict(null)}
                className="shrink-0 text-yellow-400/60 hover:text-yellow-300 cursor-pointer bg-transparent border-0 text-sm leading-none"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          )}

          {/* Search Scope */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="space-y-0.5">
              <label className="text-xs font-medium text-foreground">Search Scope in Popover</label>
              <div className="text-[10px] text-muted-foreground max-w-sm">
                Limit search to action names or search across all fields (section/keys).
              </div>
            </div>
            <CustomSelect
              value={searchScope}
              onChange={setSearchScope}
              options={[
                { value: "all", label: "Search All Fields" },
                { value: "action", label: "Search Action Only" },
              ]}
            />
          </div>
        </div>

        {/* Advanced & Troubleshooting */}
        <h2 className="mb-2 px-1 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
          Advanced & Troubleshooting
        </h2>
        <div className="mb-6 overflow-hidden rounded-xl border border-border bg-card/60 p-4 space-y-4">
          {/* Focused App Debug Mode */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground">Focused App Debug Mode</span>
            <div className="rounded-lg bg-muted/40 p-3 space-y-2 border border-border/40">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Active Process Name:</span>
                <code className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-muted text-foreground">
                  {activeApp?.process_name || "None (or unrecognized)"}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Active App:</span>
                <span className="text-xs font-semibold text-foreground">
                  {activeApp?.app_name || "None / Desktop"}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground">
                Displays the live `.exe` process name currently focused. Useful for testing why a custom app isn't showing up.
              </div>
            </div>
          </div>

          {/* Database Refresh */}
          <div className="flex items-center justify-between pt-2 border-t border-border/40">
            <div className="space-y-0.5 max-w-[70%]">
              <span className="text-xs font-medium text-foreground">Database Refresh</span>
              <div className="text-[10px] text-muted-foreground">
                Reload and re-parse the local database cache from disk.
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshDatabase}
                disabled={refreshing}
                className="text-xs"
              >
                {refreshing ? "Refreshing..." : "Refresh Cache"}
              </Button>
              {refreshStatus && (
                <span className="text-[10px] text-emerald-500 font-medium">
                  {refreshStatus}
                </span>
              )}
            </div>
          </div>

          {/* Check for Updates */}
          <div className="flex items-center justify-between pt-2 border-t border-border/40">
            <div className="space-y-0.5 max-w-[70%]">
              <span className="text-xs font-medium text-foreground">Check for Updates</span>
              <div className="text-[10px] text-muted-foreground">
                Check GitHub releases for a newer version of YourCtrl.
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {updateVersion ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCheckForUpdates}
                    disabled={checkingUpdate}
                    className="text-xs"
                  >
                    {checkingUpdate ? "Checking..." : "Check Again"}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleInstallUpdate}
                    disabled={downloading}
                    className="text-xs"
                  >
                    {downloading ? "Installing..." : `Install v${updateVersion}`}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCheckForUpdates}
                  disabled={checkingUpdate}
                  className="text-xs"
                >
                  {checkingUpdate ? "Checking..." : "Check for Updates"}
                </Button>
              )}
              {updateStatus && (
                <span className={cn("text-[10px] font-medium", updateVersion ? "text-emerald-500" : "text-muted-foreground")}>
                  {updateStatus}
                </span>
              )}
              {downloadProgress !== null && (
                <div className="w-full max-w-[120px] h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (downloadProgress / 1000000) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <h2 className="mb-2 px-1 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
          App Exclusions
        </h2>
        <div className="overflow-hidden rounded-xl border border-border bg-card/60">
          <div className="flex items-center gap-2 border-b border-border/60 p-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Find an app to exclude"
                className="h-9 bg-muted/40 pl-9"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={resetExcludedApps}
              className="shrink-0 text-xs"
              title="Re-enable all excluded apps"
            >
              Reset to Default
            </Button>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {apps.map((a, i) => {
              const excluded = excludedApps.includes(a.app_name);
              return (
                <div
                  key={a.app_name}
                  className={cn("flex items-center justify-between gap-3 px-3 py-2.5", i > 0 && "border-t border-border/50")}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <AppIcon slug={a.icon_slug} color={a.brand_color} name={a.app_name} size={28} />
                    <div className="min-w-0">
                      <div className="truncate text-sm">{a.app_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {excluded ? "Popover hidden" : "Popover enabled"}
                      </div>
                    </div>
                  </div>
                  <Switch checked={!excluded} onCheckedChange={() => toggleExcluded(a.app_name)} aria-label={`Popover for ${a.app_name}`} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
