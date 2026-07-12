# Changelog

## v1.1.0

Major experience and database synchronization update.

### Features

- Added offline shortcut cheat-sheet export (download as PNG or multi-page PDF)
- Added Popover Pinning to keep shortcuts floating on screen (Always-on-Top)
- Added persistent coordinate saving when dragging the pinned popover window
- Simplified Settings panel by removing the Appearance section
- Standardized and fixed UI spacing on range sliders and exclusion lists
- Fixed active window process case-sensitivity lookup bugs in the Rust layer

### Apps updated & reorganized

- Consolidated all Office apps into a dedicated Microsoft 365 category, except for Edge (Browsers), OneNote (Productivity), and Outlook (Email).
- Upgraded OneDrive to the modern 2025 Fluent Microsoft Design icon.
- Added full keyboard shortcut mappings for Blender (3D Modeling), FreeCAD (CAD), and Excalidraw, draw.io, Miro, Whimsical (Graphic Design).
- Removed the Game Development category (deleted all 8 engines: Unity, Unreal, Godot, etc.).
- Removed Steam, Heroic Games Launcher, Streamlabs, and Power Automate Desktop.
- Moved OBS Studio to a new dedicated Screen Recording category.
- Added CapCut, eM Client, Mailbird, and SumatraPDF shortcut support.

### Technical details

- Incremented database schema to version 5 to force auto-seeding of 143 clean app configurations
- Integrated HTML-to-Image and jsPDF libraries for client-side document exports
- Configured .gitignore to exclude Vite build configs and local agent workspace files

## v1.0.0

Initial release.

### Features

- Hold Ctrl to see keyboard shortcuts for the active app
- On desktop, shows a list of running supported apps to pick from
- Dashboard with category-grouped app grid and search
- Popover overlay with searchable shortcut list
- 160+ apps across 26 categories
- App exclusion settings
- Auto-update support via GitHub Releases
- System tray with minimize-to-tray
- Settings for trigger behavior, popover appearance, and more

### Apps included

Browsers, IDEs, AI Coding Agents, AI Assistants, Communication, Graphic Design, Video Editing, Media Players, Productivity, Utilities, Terminal, Version Control, API & Database, Window Management, Security, Email, Audio Production, 3D/CAD, Gaming/Streaming, Local AI Tools, Screen Recording, Diagramming, Game Development, Windows OS, Microsoft 365, Adobe Suite.

### Technical details

- Built with Tauri 2.x (Rust backend)
- React 18 + TypeScript frontend
- Fluent UI React v9 for Windows 11 native look
- Zustand for state management
- Settings persisted to JSON file in app data directory
