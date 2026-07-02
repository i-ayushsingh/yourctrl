import { Minus, Square, X } from "lucide-react";
import { cn } from "@/lib/utils";

const isTauri = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
async function win() {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  return getCurrentWindow();
}

const btn =
  "inline-flex h-8 w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-muted/70";

export function WindowControls() {
  return (
    <div className="flex items-center" data-no-drag>
      <button className={btn} aria-label="Minimize" onClick={() => isTauri() && void win().then((w) => w.minimize())}>
        <Minus className="size-4" />
      </button>
      <button className={btn} aria-label="Maximize" onClick={() => isTauri() && void win().then((w) => w.toggleMaximize())}>
        <Square className="size-3.5" />
      </button>
      <button
        className={cn(btn, "hover:bg-destructive hover:text-white")}
        aria-label="Close"
        onClick={() => isTauri() && void win().then((w) => w.close())}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
