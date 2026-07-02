# Contributing to YourCtrl

Thanks for your interest in contributing to YourCtrl. This document covers how to add new apps, fix shortcut data, or contribute code changes.

## Ways to contribute

### 1. Report wrong or missing shortcuts

If you notice a shortcut that is incorrect or an app that is missing, open an issue with details about what is wrong and what the correct shortcut should be.

### 2. Add a new app

To add a new app to YourCtrl, you need to:

1. Find the official keyboard shortcuts for the app (official documentation preferred, aggregators as fallback)
2. Add the app entry to the appropriate JSON file in `Sources/`
3. Run the extraction script to generate the data
4. Add an icon for the app in `src/assets/`
5. Test that the app appears in the dashboard with correct shortcuts

#### App entry format

Each app needs:
- `app_name` — Display name
- `process_name` — Windows process name (e.g. `Code.exe`, `chrome.exe`)
- `category` — Must match one of the 26 existing categories
- `platforms` — Array of supported platforms
- `icon_slug` — Simple Icons slug for the icon (optional)
- `brand_color` — Hex color for the icon (optional)
- `shortcuts` — Array of shortcut objects

#### Shortcut format

Each shortcut needs:
- `section` — Grouping label (e.g. "Navigation", "Editing")
- `action` — Plain-language description
- `keys` — Array of keys pressed simultaneously (e.g. `["Ctrl", "C"]`)
- `os` — Target OS (`"windows"` for all YourCtrl shortcuts)
- `source` — Where the shortcut came from (`"official"`, `"ctrlhelp"`, `"keycombiner"`, `"defkey"`)
- `confidence` — How certain you are (`"high"`, `"medium"`, `"low"`)
- `verified_against_official` — `true` if cross-checked against official docs

### 3. Fix incorrect shortcut data

If a shortcut is wrong, open an issue or submit a pull request with the correction. Include:
- The app name
- The incorrect shortcut
- The correct shortcut
- The source for the correct shortcut (official documentation URL preferred)

### 4. Contribute code

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes
4. Test locally with `npm run tauri dev`
5. Submit a pull request with a clear description of what changed and why

## Development setup

```bash
git clone https://github.com/i-ayushsingh/yourctrl.git
cd yourctrl
npm install
npm run tauri dev
```

## Project structure

- `src/` — React frontend (components, state, UI)
- `src-tauri/` — Rust backend (active window detection, settings, shortcut lookup)
- `src-tauri/seed/apps.json` — The shortcut database
- `Sources/` — Data extraction workspace (scripts, raw JSON, CSVs)

## Code style

- Frontend: TypeScript, React functional components, Tailwind CSS
- Backend: Rust, idiomatic error handling
- Keep changes focused — one feature or fix per pull request

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
