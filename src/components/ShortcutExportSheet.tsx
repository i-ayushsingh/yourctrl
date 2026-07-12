import { forwardRef } from "react";
import type { AppEntry, Shortcut } from "@/types";
import { groupBySection } from "./ShortcutGroups";
import { AppIcon } from "./AppIcon";

interface ShortcutExportSheetProps {
  app: AppEntry;
  /** Accent hex used for the header rule and section labels. */
  accent: string;
}

/**
 * Static, print-appropriate layout used only for exporting a cheat sheet.
 * Deliberately does not reuse the interactive list styling — it renders a
 * designed, self-contained card with fixed light colors so the PNG/PDF looks
 * the same regardless of the app's current theme.
 */
export const ShortcutExportSheet = forwardRef<HTMLDivElement, ShortcutExportSheetProps>(
  function ShortcutExportSheet({ app, accent }, ref) {
    const sections = groupBySection(app.shortcuts);
    const total = app.shortcuts.length;

    return (
      <div
        ref={ref}
        style={{
          width: 720,
          backgroundColor: "#ffffff",
          color: "#1a1a1f",
          fontFamily:
            'ui-sans-serif, system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          padding: "32px 36px 40px",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            <AppIcon slug={app.icon_slug} color={app.brand_color} name={app.app_name} size={56} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.2 }}>{app.app_name}</div>
            <div style={{ fontSize: 13, color: "#6b6b76", marginTop: 2 }}>
              {app.category} · {total} shortcuts
            </div>
          </div>
        </div>

        <div
          style={{
            height: 3,
            borderRadius: 3,
            backgroundColor: accent,
            marginTop: 18,
            marginBottom: 22,
          }}
        />

        {/* Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {sections.map(([section, items]) => (
            <section key={section}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  color: accent,
                  marginBottom: 8,
                }}
              >
                {section}
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {items.map((s, i) => (
                  <ShortcutRow key={`${s.action}-${i}`} shortcut={s} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <div
          style={{
            marginTop: 28,
            paddingTop: 12,
            borderTop: "1px solid #ececf1",
            fontSize: 11,
            color: "#9a9aa5",
          }}
        >
          Exported with YourCtrl
        </div>
      </div>
    );
  },
);

function ShortcutRow({ shortcut }: { shortcut: Shortcut }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "7px 0",
        borderBottom: "1px solid #f3f3f6",
      }}
    >
      <span style={{ fontSize: 14, color: "#2b2b32" }}>{shortcut.action}</span>
      <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 6, justifyContent: "flex-end" }}>
        {shortcut.keys.map((group, gi) => (
          <span key={gi} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            {gi > 0 && <span style={{ fontSize: 10, color: "#b9b9c2" }}>then</span>}
            {group.map((k, ki) => (
              <kbd
                key={ki}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 26,
                  padding: "3px 8px",
                  fontSize: 12,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  color: "#2b2b32",
                  backgroundColor: "#f6f6f9",
                  border: "1px solid #e2e2e8",
                  borderRadius: 6,
                  boxShadow: "inset 0 -1px 0 0 rgba(0,0,0,0.06)",
                }}
              >
                {k}
              </kbd>
            ))}
          </span>
        ))}
      </span>
    </div>
  );
}
