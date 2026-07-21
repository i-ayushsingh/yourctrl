# YourCtrl

Your shortcuts, always within reach.

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Platform](https://img.shields.io/badge/Platform-Windows-0078D4.svg)
![Built with](https://img.shields.io/badge/Built%20with-Tauri-FFC131.svg)
![Version](https://img.shields.io/badge/Version-v1.2.5-green.svg)

<!-- Add popover screenshot here -->
<!-- Add dashboard screenshot here -->

## About

YourCtrl is a lightweight Windows desktop app that shows keyboard shortcuts for the currently focused application. Hold Ctrl anywhere on your desktop and a popup appears with all the shortcuts for whatever app you're using. If no app is focused, the popup shows a list of your currently running supported apps so you can pick one to browse. It supports 140+ apps across 26 categories and works fully offline with no account required.

## Features

- Hold Ctrl to instantly see shortcuts for the active app
- Pin the popover window to keep it visible as an Always-On-Top overlay
- Export shortcut cheat sheets offline as PNG or multi-page A4 PDF files
- On desktop, shows a list of running apps to pick from
- 140+ apps across 26 categories
- Works fully offline — all data stored locally
- Native Windows 11 look and feel
- Exclude apps you don't want shortcuts for
- Lightweight — built with Tauri, not Electron

## Installation

### Download (for regular users)

Download the latest .exe installer from the Releases page.

[Download YourCtrl](https://github.com/i-ayushsingh/yourctrl/releases/latest)

### Build from source (for developers)

Prerequisites:
- Node.js 18+
- Rust (latest stable)
- npm

```bash
git clone https://github.com/i-ayushsingh/yourctrl.git
cd yourctrl
npm install
npm run tauri build
```

## Usage

1. Install and launch YourCtrl — it runs in the system tray
2. Open any supported app
3. Hold Ctrl to see its keyboard shortcuts instantly
4. If on the desktop, the popup shows a list of running supported apps to pick from

Click any app in the dashboard to browse its full shortcut list.

## Supported Apps

YourCtrl supports 140+ apps across 26 categories including browsers, IDEs, AI tools, creative software, terminals, productivity apps, and more.

[See the full app list](data/README.md)

## Contributing

### Reporting issues or wrong shortcuts

Found a shortcut that's wrong or missing? Open an issue using the shortcut correction template.

### Contributing code or shortcut data

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on adding new apps, correcting shortcut data, or contributing code.

## License

MIT License — see [LICENSE](LICENSE) for details.

## Acknowledgements

- [CtrlHelp](https://ctrlhelp.com) — for shortcut data reference
- [Simple Icons](https://simpleicons.org) — for app icons
- [Tauri](https://tauri.app) — for the framework
- [Fluent UI React](https://fluent2.microsoft.design) — for Windows 11 UI components
