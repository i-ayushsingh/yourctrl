# Security Policy

YourCtrl is designed with privacy and security as core principles. This document explains how the app handles data, what external services are used, and how to report security issues.

## Data Privacy

YourCtrl is an offline-first application. The core functionality — keyboard shortcut lookup — operates entirely locally on your machine. No shortcut data, app usage patterns, or personal information is sent to any server.

### What stays local

- All keyboard shortcut data (stored in `src-tauri/seed/apps.json`)
- Your settings (trigger type, excluded apps, popover preferences)
- Active window detection data
- App exclusion lists

### What never leaves your machine

- Which apps you use
- Which shortcuts you look up
- Your keystrokes or input patterns
- Any personally identifiable information

## External Services

YourCtrl connects to two external services. Both are optional and only used for specific features.

### Web3Forms (App Suggestion Form)

When a user submits an app suggestion or shortcut correction through the "Suggest an app" form, the data is sent to Web3Forms, a third-party form submission service.

**Data sent:**
- App name (user-provided)
- Process name (auto-detected from the focused app)
- Website URL (user-provided, optional)

**Data NOT sent:**
- User identity or contact information (unless explicitly provided)
- Keystrokes or input patterns
- App usage data

**Web3Forms terms:** https://web3forms.com/terms

### GitHub Releases (Auto-Update)

YourCtrl checks GitHub Releases for updates when the auto-update feature is enabled. This connection only retrieves version metadata and signed update bundles. No user data is transmitted during this process.

**Data sent:**
- Current app version
- Operating system and architecture

**Data NOT sent:**
- User identity
- App usage data
- Keystrokes or input patterns

## Security Architecture

### Tauri Framework

YourCtrl is built on Tauri 2.x, which uses a Rust backend and a system webview. This architecture provides:

- Smaller attack surface compared to Electron (no bundled Chromium)
- Native OS integration for window management
- Rust memory safety guarantees in the backend

### Signed Updates

All updates distributed through GitHub Releases are cryptographically signed. The signing key pair is generated locally and the public key is embedded in the app. Updates cannot be installed unless they are signed with the corresponding private key.

To verify update signatures, the app uses the `tauri-plugin-updater` which validates the `.sig` file against the embedded public key before installing.

### Settings Storage

User settings are stored as a JSON file in the system app data directory (`%APPDATA%/YourCtrl/settings.json`). This file contains only preference data (trigger type, excluded apps, popover settings). No sensitive information is stored.

### Process Detection

YourCtrl detects the active foreground window to show relevant shortcuts. This detection:

- Reads the process name of the focused window
- Matches it against the known app database
- Does not capture screen content, input, or any other data
- Does not store which apps were detected

## Permissions Required

YourCtrl requires the following system permissions:

- **Foreground window detection** — to identify which app is focused
- **Global shortcut registration** — for the Ctrl-hold trigger
- **System tray** — for background operation
- **Autostart** (optional) — for launch on system startup
- **Update installation** (optional) — for auto-updates

## Known Limitations

- The Web3Forms API key is embedded in the frontend code. This is a limitation of the Web3Forms service design. The key is for form submission only and cannot be used to access submitted data.
- Auto-update checks require an internet connection. When offline, the app continues to function normally with locally stored shortcut data.
- The signing key for updates must be kept secure. If lost, future updates cannot be signed.

## Reporting Security Issues

If you discover a security vulnerability in YourCtrl, please report it responsibly:

1. **Do not** open a public GitHub issue for security vulnerabilities
2. **Do** email the maintainer directly at the email address in the git history
3. Include a description of the vulnerability, steps to reproduce, and potential impact
4. Allow reasonable time for a fix before public disclosure

## Updates and Patches

Security updates will be released as new versions through GitHub Releases. Users with auto-update enabled will receive updates automatically. Users without auto-update should periodically check the releases page for new versions.

## Third-Party Dependencies

YourCtrl uses the following key dependencies. For the latest security advisories, check their respective repositories:

- [Tauri](https://github.com/tauri-apps/tauri) — Application framework
- [tauri-plugin-updater](https://github.com/tauri-apps/plugins-workspace/tree/v2/plugins/updater) — Update mechanism
- [React](https://github.com/facebook/react) — UI framework
- [Fluent UI React](https://github.com/microsoft/fluentui) — UI components
- [Zustand](https://github.com/pmndrs/zustand) — State management
