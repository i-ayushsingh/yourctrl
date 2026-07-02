import { Fragment } from "react";
import { cn } from "@/lib/utils";

interface KeyCapProps {
  keys: string[][];
  size?: "sm" | "md";
  className?: string;
}

export function KeyCap({ keys, className }: KeyCapProps) {
  return (
    <span className={cn("inline-flex flex-wrap items-center justify-end gap-1.5", className)}>
      {keys.map((group, gi) => (
        <Fragment key={gi}>
          {gi > 0 && (
            <span className="text-[9px] text-muted-foreground/35 select-none mx-0.5">then</span>
          )}
          {group.map((k, ki) => (
            <kbd
              key={ki}
              className={cn(
                "inline-flex min-w-[24px] justify-center select-none items-center font-mono font-medium text-foreground/70",
                "rounded border border-border/50 bg-muted/70 shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.15)]",
                "px-2 py-1 text-[10px] leading-none",
              )}
            >
              {k}
            </kbd>
          ))}
        </Fragment>
      ))}
    </span>
  );
}
