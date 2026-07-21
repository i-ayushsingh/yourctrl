import { create } from "zustand";
import { mockApps } from "./data/mockApps";
import type { AppEntry } from "./types";

export type ThemePref = "dark" | "light" | "system";

/** Top-level routes in the main window. Popover lives in its own window. */
export type MainRoute = "dashboard" | "shortcuts" | "suggest" | "settings";

interface AppState {
  // Navigation
  route: MainRoute;
  searchQuery: string;
  selectedApp: string | null;
  pendingCategoryScroll: string | null;
  suggestTab: "suggest" | "broken";
  suggestPrefill: { appName: string; processName: string } | null;

  // Settings
  themePref: ThemePref;
  accentColor: string;
  matchOsAccent: boolean;
  pinned: boolean;
  pinnedPosition: { x: number; y: number } | null;
  excludedApps: string[];
  holdMs: number;
  autostart: boolean;
  startMinimized: boolean;
  disableUnsupportedTrigger: boolean;
  autoFocusSearch: boolean;
  showShortcutCountBadge: boolean;
  popoverPosition: "Center" | "Top-Center" | "Bottom-Center" | "Near Cursor";
  popoverOpacity: number;
  popoverScale: number;
  globalHotkey: string;
  searchScope: "action" | "all";
  autoUpdate: boolean;

  favorites: string[]; // Stores "appName:action" strings
  toggleFavorite: (appName: string, action: string) => void;
  setFavorites: (favs: string[]) => void;
  isFavorite: (appName: string, action: string) => boolean;

  apps: AppEntry[];
  setApps: (apps: AppEntry[]) => void;

  setRoute: (route: MainRoute) => void;
  setSearchQuery: (q: string) => void;
  openApp: (appName: string) => void;
  backToDashboard: () => void;
  openSuggest: () => void;
  openReport: () => void;
  openReportWithPrefill: (appName: string, processName: string) => void;
  openSettings: () => void;
  setThemePref: (pref: ThemePref) => void;
  setAccentColor: (hex: string) => void;
  setMatchOsAccent: (match: boolean) => void;
  setPinned: (pinned: boolean) => void;
  setPinnedPosition: (pos: { x: number; y: number } | null) => void;
  toggleExcluded: (appName: string) => void;
  setExcludedApps: (apps: string[]) => void;
  resetExcludedApps: () => void;
  setPendingCategoryScroll: (category: string | null) => void;
  setHoldMs: (ms: number) => void;
  setAutostart: (enabled: boolean) => void;
  setStartMinimized: (minimized: boolean) => void;
  setSuggestTab: (tab: "suggest" | "broken") => void;
  setDisableUnsupportedTrigger: (disable: boolean) => void;
  setAutoFocusSearch: (enabled: boolean) => void;
  setShowShortcutCountBadge: (show: boolean) => void;
  setPopoverPosition: (pos: "Center" | "Top-Center" | "Bottom-Center" | "Near Cursor") => void;
  setPopoverOpacity: (opacity: number) => void;
  setPopoverScale: (scale: number) => void;
  setGlobalHotkey: (hotkey: string) => void;
  setSearchScope: (scope: "action" | "all") => void;
  setAutoUpdate: (enabled: boolean) => void;
  // Hotkey conflict warning (null = no conflict)
  hotkeyConflict: string | null;
  setHotkeyConflict: (hotkey: string | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  route: "dashboard",
  searchQuery: "",
  selectedApp: null,
  pendingCategoryScroll: null,
  suggestTab: "suggest",
  suggestPrefill: null,
  themePref: "dark",
  accentColor: "#7C5CFC",
  matchOsAccent: false,
  pinned: false,
  pinnedPosition: null,
  excludedApps: [],
  holdMs: 700,
  autostart: false,
  startMinimized: false,
  disableUnsupportedTrigger: false,
  autoFocusSearch: true,
  showShortcutCountBadge: true,
  popoverPosition: "Center",
  popoverOpacity: 0.9,
  popoverScale: 1.0,
  globalHotkey: "Ctrl+Shift+Y",
  searchScope: "all",
  autoUpdate: true,
  favorites: [],
  toggleFavorite: (appName, action) => {
    const key = `${appName}:${action}`;
    const curr = get().favorites;
    const next = curr.includes(key) ? curr.filter((k) => k !== key) : [...curr, key];
    set({ favorites: next });
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      void (async () => {
        try {
          const { emit } = await import("@tauri-apps/api/event");
          await emit("favorites-changed", next);
        } catch {
          /* ignore */
        }
      })();
    }
  },
  setFavorites: (favorites) => set({ favorites }),
  isFavorite: (appName, action) => get().favorites.includes(`${appName}:${action}`),
  apps: mockApps,
  setApps: (apps) => set({ apps }),
  hotkeyConflict: null,
  setHotkeyConflict: (hotkeyConflict) => set({ hotkeyConflict }),

  setRoute: (route) => set({ route }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  openApp: (appName) => set({ selectedApp: appName, route: "shortcuts" }),
  backToDashboard: () => set({ route: "dashboard", selectedApp: null }),
  openSuggest: () => set({ route: "suggest", suggestTab: "suggest", suggestPrefill: null }),
  openReport: () => set({ route: "suggest", suggestTab: "broken", suggestPrefill: null }),
  openReportWithPrefill: (appName, processName) => set({ route: "suggest", suggestTab: "broken", suggestPrefill: { appName, processName } }),
  openSettings: () => set({ route: "settings" }),
  setThemePref: (themePref) => set({ themePref }),
  setAccentColor: (accentColor) => set({ accentColor }),
  setMatchOsAccent: (matchOsAccent) => set({ matchOsAccent }),
  setPinned: (pinned) => set({ pinned }),
  setPinnedPosition: (pinnedPosition) => set({ pinnedPosition }),
  toggleExcluded: (appName) =>
    set((s) => ({
      excludedApps: s.excludedApps.includes(appName)
        ? s.excludedApps.filter((n) => n !== appName)
        : [...s.excludedApps, appName],
    })),
  setExcludedApps: (excludedApps) => set({ excludedApps }),
  resetExcludedApps: () => set({ excludedApps: [] }),
  setPendingCategoryScroll: (pendingCategoryScroll) => set({ pendingCategoryScroll }),
  setHoldMs: (holdMs) => set({ holdMs }),
  setAutostart: (autostart) => set({ autostart }),
  setStartMinimized: (startMinimized) => set({ startMinimized }),
  setSuggestTab: (suggestTab) => set({ suggestTab }),
  setDisableUnsupportedTrigger: (disableUnsupportedTrigger) => set({ disableUnsupportedTrigger }),
  setAutoFocusSearch: (autoFocusSearch) => set({ autoFocusSearch }),
  setShowShortcutCountBadge: (showShortcutCountBadge) => set({ showShortcutCountBadge }),
  setPopoverPosition: (popoverPosition) => set({ popoverPosition }),
  setPopoverOpacity: (popoverOpacity) => set({ popoverOpacity }),
  setPopoverScale: (popoverScale) => set({ popoverScale }),
  setGlobalHotkey: (globalHotkey) => set({ globalHotkey }),
  setSearchScope: (searchScope) => set({ searchScope }),
  setAutoUpdate: (autoUpdate) => set({ autoUpdate }),
}));
