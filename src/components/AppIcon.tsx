import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import { iconRegistry } from "@/data/iconRegistry";
import { logoIcons } from "@/data/logoIcons";
import dashMap from "@/data/dashIcons.json";
import { customIcons, customMono } from "@/data/customIcons";

// Hand-picked overrides (svg/png/webp/jpg), bundled.
const customUrls = import.meta.glob("@/assets/custom/*.{svg,png,webp,jpg}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;
const customByFile: Record<string, string> = {};
for (const [path, url] of Object.entries(customUrls)) {
  customByFile[path.split("/").pop()!] = url;
}

// dashboard-icons / selfhst full-color SVGs, bundled.
const dashUrls = import.meta.glob("@/assets/dash/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;
const dashBySlug: Record<string, string> = {};
for (const [path, url] of Object.entries(dashUrls)) {
  const base = path.split("/").pop()!.replace(/\.svg$/, "");
  dashBySlug[base] = url;
}
const dashIcons = dashMap as Record<string, string>;

// LobeHub AI/LLM brand logos (static SVGs) for the AI app categories.
import openaiUrl from "@/assets/lobe/openai.svg";
import claudeUrl from "@/assets/lobe/claude.svg";
import qwenUrl from "@/assets/lobe/qwen.svg";
import copilotUrl from "@/assets/lobe/copilot.svg";
import ollamaUrl from "@/assets/lobe/ollama.svg";
import lmstudioUrl from "@/assets/lobe/lmstudio.svg";
import cursorUrl from "@/assets/lobe/cursor.svg";
import manusUrl from "@/assets/lobe/manus.svg";
import kiroUrl from "@/assets/lobe/kiro.svg";
import traeUrl from "@/assets/lobe/trae.svg";
import antigravityUrl from "@/assets/lobe/antigravity.svg";
import qoderUrl from "@/assets/lobe/qoder.svg";
import codexUrl from "@/assets/lobe/codex.svg";
import opencodeUrl from "@/assets/lobe/opencode.svg";
import gooseUrl from "@/assets/lobe/goose.svg";
import openclawUrl from "@/assets/lobe/openclaw.svg";
import hermesUrl from "@/assets/lobe/hermesagent.svg";
import capcutUrl from "@/assets/lobe/capcut.svg";

const LOBE: Record<string, { url: string; mono?: boolean }> = {
  ChatGPT: { url: openaiUrl, mono: true },
  Codex: { url: codexUrl },
  Claude: { url: claudeUrl },
  Qwen: { url: qwenUrl },
  "GitHub Copilot": { url: copilotUrl },
  Ollama: { url: ollamaUrl, mono: true },
  "LM Studio": { url: lmstudioUrl, mono: true },
  Cursor: { url: cursorUrl, mono: true },
  Manus: { url: manusUrl, mono: true },
  Kiro: { url: kiroUrl },
  Trae: { url: traeUrl },
  "Antigravity IDE": { url: antigravityUrl },
  "Antigravity 2": { url: antigravityUrl },
  Qoder: { url: qoderUrl },
  OpenCode: { url: opencodeUrl, mono: true },
  Goose: { url: gooseUrl, mono: true },
  OpenClaw: { url: openclawUrl },
  "Hermes Agent": { url: hermesUrl, mono: true },
  CapCut: { url: capcutUrl },
};

const PALETTE = [
  "#7C5CFF", "#3B82F6", "#10B981", "#F59E0B", "#06B6D4", "#EC4899",
  "#8B5CF6", "#0EA5E9", "#F43F5E", "#22C55E", "#A855F7", "#14B8A6",
];

function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function tint(hex: string, alpha: number): string {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface AppIconProps {
  slug?: string;
  color?: string;
  name: string;
  size?: number;
  className?: string;
}

const tileBase =
  "inline-flex shrink-0 items-center justify-center rounded-xl bg-muted/70 ring-1 ring-inset ring-border/60";

/**
 * Icon resolution: LobeHub AI brand logo → Iconify "logos" full-color → Simple Icons
 * monochrome glyph → colored monogram.
 */
export function AppIcon({ slug, color, name, size = 40, className }: AppIconProps) {
  const customFile = customIcons[name];
  const customUrl = customFile ? customByFile[customFile] : undefined;
  if (customUrl) {
    return (
      <span className={cn(tileBase, className)} style={{ width: size, height: size }} aria-label={name} title={name}>
        <img
          src={customUrl}
          alt=""
          className={cn(customMono.has(name) && "dark:invert")}
          style={{ width: Math.round(size * 0.6), height: Math.round(size * 0.6) }}
        />
      </span>
    );
  }

  const lobe = LOBE[name];
  if (lobe) {
    return (
      <span className={cn(tileBase, className)} style={{ width: size, height: size }} aria-label={name} title={name}>
        <img
          src={lobe.url}
          alt=""
          className={cn(lobe.mono && "dark:invert")}
          style={{ width: Math.round(size * 0.58), height: Math.round(size * 0.58) }}
        />
      </span>
    );
  }

  const dashSlug = dashIcons[name];
  const dashUrl = dashSlug ? dashBySlug[dashSlug] : undefined;
  if (dashUrl) {
    return (
      <span className={cn(tileBase, className)} style={{ width: size, height: size }} aria-label={name} title={name}>
        <img src={dashUrl} alt="" className="dark:brightness-[0.78]" style={{ width: Math.round(size * 0.6), height: Math.round(size * 0.6) }} />
      </span>
    );
  }

  const logo = logoIcons[name];
  if (logo) {
    return (
      <span className={cn(tileBase, className)} style={{ width: size, height: size }} aria-label={name} title={name}>
        <span className="dark:brightness-[0.78]">
          <Icon icon={logo.includes(":") ? logo : `logos:${logo}`} width={Math.round(size * 0.58)} height={Math.round(size * 0.58)} />
        </span>
      </span>
    );
  }

  const Comp = slug ? iconRegistry[slug] : undefined;
  const accent = (Comp ? color : undefined) ?? colorFromName(name);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-xl font-semibold ring-1 ring-inset ring-black/5",
        className,
      )}
      aria-label={name}
      title={name}
      style={{
        width: size,
        height: size,
        backgroundColor: tint(accent, 0.16),
        color: accent,
        fontSize: Math.round(size * 0.42),
      }}
    >
      {Comp ? <Comp size={Math.round(size * 0.56)} color={accent} aria-hidden /> : name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
