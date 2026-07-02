import type { AppEntry } from "@/types";
import { AppIcon } from "./AppIcon";

interface AppCardProps {
  app: AppEntry;
  onClick: () => void;
}

export function AppCard({ app, onClick }: AppCardProps) {
  const count = app.shortcuts.length;
  return (
    <button
      onClick={onClick}
      aria-label={`${app.app_name}, ${count} shortcuts`}
      className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-card/50 p-4 text-center outline-none transition-all duration-150 hover:-translate-y-0.5 hover:border-border/70 hover:bg-card hover:shadow-sm active:translate-y-0"
    >
      <AppIcon slug={app.icon_slug} color={app.brand_color} name={app.app_name} size={46} className="transition-transform duration-150 group-hover:scale-105" />
      <div className="w-full min-w-0">
        <div className="truncate text-sm font-medium text-foreground">{app.app_name}</div>
        <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
          {count} shortcut{count === 1 ? "" : "s"}
        </div>
      </div>
    </button>
  );
}
