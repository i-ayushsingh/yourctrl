// Bridge for summoning/dismissing the popover. In Tauri it drives the dedicated
// always-on-top window via Rust commands; in a plain browser (dev/testing) it opens
// the popover route in a small separate window so the surface is still a real window,
// never an in-app modal (per the UI build spec).

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

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

/** From the popover's unsupported state: bring the main window forward. */
export async function focusMainWindow(): Promise<void> {
  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("focus_main");
    return;
  }
  window.opener?.focus?.();
}
