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
  excludedApps: string[];
  holdMs: number;
  triggerType: "hold" | "double";
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
  toggleExcluded: (appName: string) => void;
  setExcludedApps: (apps: string[]) => void;
  resetExcludedApps: () => void;
  setPendingCategoryScroll: (category: string | null) => void;
  setHoldMs: (ms: number) => void;
  setTriggerType: (type: "hold" | "double") => void;
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

export const useAppStore = create<AppState>((set) => ({
  route: "dashboard",
  searchQuery: "",
  selectedApp: null,
  pendingCategoryScroll: null,
  suggestTab: "suggest",
  suggestPrefill: null,
  themePref: "dark",
  excludedApps: [],
  holdMs: 700,
  triggerType: "hold",
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
  setTriggerType: (triggerType) => set({ triggerType }),
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
