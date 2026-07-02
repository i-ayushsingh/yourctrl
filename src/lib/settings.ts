import { useEffect, useRef } from "react";
import { useAppStore, type ThemePref } from "@/store";

const isTauri = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

interface PersistedSettings {
  theme: string;
  excluded: string[];
  hold_ms: number;
  trigger_type: string;
  autostart?: boolean;
  start_minimized?: boolean;
  disable_unsupported_trigger?: boolean;
  auto_focus_search?: boolean;
  show_shortcut_count_badge?: boolean;
  popover_position?: string;
  popover_opacity?: number;
  popover_scale?: number;
  global_hotkey?: string;
  search_scope?: string;
  auto_update?: boolean;
}

/** Loads persisted settings on startup and writes them back (debounced) on change. */
export function useSyncSettings() {
  const loaded = useRef(false);

  useEffect(() => {
    if (!isTauri()) return;
    let unsub: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    void (async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      try {
        const s = await invoke<PersistedSettings>("load_settings");
        const store = useAppStore.getState();
        store.setThemePref((s.theme as ThemePref) || "system");
        store.setExcludedApps(s.excluded ?? []);
        if (typeof s.hold_ms === "number") store.setHoldMs(s.hold_ms);
        if (s.trigger_type === "hold" || s.trigger_type === "double") {
          store.setTriggerType(s.trigger_type);
        }
        if (typeof s.autostart === "boolean") store.setAutostart(s.autostart);
        if (typeof s.start_minimized === "boolean") store.setStartMinimized(s.start_minimized);
        if (typeof s.disable_unsupported_trigger === "boolean") {
          store.setDisableUnsupportedTrigger(s.disable_unsupported_trigger);
        }
        if (typeof s.auto_focus_search === "boolean") store.setAutoFocusSearch(s.auto_focus_search);
        if (typeof s.show_shortcut_count_badge === "boolean") store.setShowShortcutCountBadge(s.show_shortcut_count_badge);
        if (s.popover_position) store.setPopoverPosition(s.popover_position as any);
        if (typeof s.popover_opacity === "number") store.setPopoverOpacity(s.popover_opacity);
        if (typeof s.popover_scale === "number") store.setPopoverScale(s.popover_scale);
        if (s.global_hotkey) store.setGlobalHotkey(s.global_hotkey);
        if (s.search_scope) store.setSearchScope(s.search_scope as any);
        if (typeof s.auto_update === "boolean") store.setAutoUpdate(s.auto_update);
      } catch {
        /* first run / no file yet */
      }
      loaded.current = true;

      unsub = useAppStore.subscribe((state) => {
        if (!loaded.current) return;
        clearTimeout(timer);
        timer = setTimeout(() => {
          void invoke("save_settings", {
            theme: state.themePref,
            excluded: state.excludedApps,
            holdMs: state.holdMs,
            triggerType: state.triggerType,
            autostart: state.autostart,
            startMinimized: state.startMinimized,
            disableUnsupportedTrigger: state.disableUnsupportedTrigger,
            autoFocusSearch: state.autoFocusSearch,
            showShortcutCountBadge: state.showShortcutCountBadge,
            popoverPosition: state.popoverPosition,
            popoverOpacity: state.popoverOpacity,
            popoverScale: state.popoverScale,
            globalHotkey: state.globalHotkey,
            searchScope: state.searchScope,
            autoUpdate: state.autoUpdate,
          });
        }, 300);
      });
    })();

    return () => {
      clearTimeout(timer);
      unsub?.();
    };
  }, []);
}

