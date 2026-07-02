import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAppStore, type MainRoute } from "@/store";
import { useApplyTheme } from "@/lib/theme";
import { useSyncSettings } from "@/lib/settings";
import { Dashboard } from "@/components/Dashboard";
import { ShortcutListView } from "@/components/ShortcutListView";
import { SettingsView } from "@/components/SettingsView";
import { SuggestView } from "@/components/SuggestView";
import { CommandPopover } from "@/components/CommandPopover";

function RouteView() {
  const route = useAppStore((s) => s.route);
  switch (route) {
    case "shortcuts":
      return <ShortcutListView />;
    case "settings":
      return <SettingsView />;
    case "suggest":
      return <SuggestView />;
    default:
      return <Dashboard />;
  }
}

export default function App() {
  const themePref = useAppStore((s) => s.themePref);
  const route = useAppStore((s) => s.route);
  useApplyTheme(themePref);
  useSyncSettings();

  const setApps = useAppStore((s) => s.setApps);

  useEffect(() => {
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      void (async () => {
        const { invoke } = await import("@tauri-apps/api/core");
        try {
          const apps = await invoke<any[]>("get_apps");
          setApps(apps);
        } catch (e) {
          console.error("Failed to load apps from SQLite", e);
        }
      })();
    }
  }, [setApps]);

  useEffect(() => {
    const isPopover =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("view") === "popover";
    if (isPopover) return;

    // 1. Tauri event listener
    let unlisten: (() => void) | undefined;
    let unlistenConflict: (() => void) | undefined;
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      void (async () => {
        const { listen } = await import("@tauri-apps/api/event");
        unlisten = await listen<{ route: MainRoute; selectedApp?: string | null }>(
          "navigate-main",
          (e) => {
            const { route, selectedApp } = e.payload;
            const store = useAppStore.getState();
            if (route === "shortcuts" && selectedApp) {
              store.openApp(selectedApp);
            } else if (route === "suggest") {
              store.openSuggest();
            } else if (route === "settings") {
              store.openSettings();
            } else if (route === "dashboard") {
              store.backToDashboard();
            }
          }
        );

        // Hotkey conflict warning: another app has claimed the hotkey
        unlistenConflict = await listen<string>("hotkey-conflict", (e) => {
          const hotkey = e.payload;
          console.warn(`[YourCtrl] Hotkey conflict: ${hotkey} is already registered by another application.`);
          useAppStore.getState().setHotkeyConflict(hotkey);
        });
      })();
    }

    // 2. Browser message listener (fallback)
    const handleMsg = (e: MessageEvent) => {
      if (e.data?.type === "navigate-main") {
        const { route, selectedApp } = e.data;
        const store = useAppStore.getState();
        if (route === "shortcuts" && selectedApp) {
          store.openApp(selectedApp);
        } else if (route === "suggest") {
          store.openSuggest();
        } else if (route === "settings") {
          store.openSettings();
        } else if (route === "dashboard") {
          store.backToDashboard();
        }
      }
    };
    window.addEventListener("message", handleMsg);

    return () => {
      unlisten?.();
      unlistenConflict?.();
      window.removeEventListener("message", handleMsg);
    };
  }, []);

  const isPopover =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("view") === "popover";

  if (isPopover) return <CommandPopover />;

  return (
    <div className="flex h-screen overflow-hidden bg-background/60">
      <AnimatePresence mode="wait">
        <motion.div
          key={route}
          initial={{ opacity: 0, scale: 0.985, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.985, y: -10 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="flex min-w-0 flex-1"
        >
          <RouteView />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
