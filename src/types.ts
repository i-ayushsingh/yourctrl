// Canonical shapes for the UI pass. Mirrors yourctrl-data-schema.md so swapping in
// real (Gumloop-scraped) data later requires no UI rework.

export interface Shortcut {
  section: string;
  action: string;
  keys: string[][];
  description?: string;
  os?: string;
  source?: string;
  confidence?: string;
  verified_against_official?: boolean;
}

export interface AppEntry {
  app_name: string;
  process_name?: string;
  category: string;
  /** Platform identifiers this app runs on, e.g. ["windows"]. */
  platforms?: string[];
  /** Simple Icons slug used by react-icons/si; undefined falls back to a monogram tile. */
  icon_slug?: string;
  /** Brand hex for the icon, e.g. "#F24E1E". Optional; falls back to theme foreground. */
  brand_color?: string;
  shortcuts: Shortcut[];
}
