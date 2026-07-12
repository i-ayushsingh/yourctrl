// Bridge for summoning/dismissing the popover. In Tauri it drives the dedicated
// always-on-top window via Rust commands; in a plain browser (dev/testing) it opens
// the popover route in a small separate window so the surface is still a real window,
// never an in-app modal (per the UI build spec).

import { useAppStore } from "@/store";
import { isTauri } from "./lib/tauri";

/** Mock "Ctrl-hold" trigger for this build pass. */
export async function showPopover(): Promise<void> {
  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("show_popover");
    return;
  }
  window.open(
    "?view=popover",
    "yourctrl-popover",
    "width=420,height=520,menubar=no,toolbar=no,location=no,status=no",
  );
}

/** Dismiss the popover window (Esc / outside-click / chip-click). */
export async function dismissPopover(): Promise<void> {
  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("hide_popover");
    return;
  }
  window.close();
}

/**
 * Like {@link dismissPopover} but respects the pinned state: when the popover is
 * pinned it stays on screen after Ctrl is released or focus is lost.
 */
export async function requestDismissPopover(): Promise<void> {
  if (useAppStore.getState().pinned) return;
  await dismissPopover();
}

/** From the popover's unsupported state: bring the main window forward. */
export async function focusMainWindow(): Promise<void> {
  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("focus_main");
    return;
  }
  window.opener?.focus?.();
}
