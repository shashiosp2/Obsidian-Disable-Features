# Obsidian Disable Features Plugin

An Obsidian plugin that disables specific features (such as popout windows and split panes) to enforce a clean, distraction-free, tab-only workflow.

## Features

- **Disable Popout Windows**:
  - Intercepts opening notes in new OS windows and redirects them to open as new tabs.
  - Automatically moves any existing or newly spawned popout leaves back into the main workspace.
  - Hides/disables "Open in new window" and "Move to new window" from context menus.
  - Disables window popout commands in the Command Palette.
- **Disable Split Panes**:
  - Intercepts horizontal and vertical split requests and converts them into tab leaves.
  - Hides/disables "Split right", "Split down", "Split vertically", and "Split horizontally" menu options.
  - Disables split pane commands in the Command Palette, redirecting split commands to create a new tab.
- **Configurable Settings**:
  - Each restriction can be toggled on/off individually in the plugin settings.

## Installation

1. Copy `manifest.json` and `main.js` into your Obsidian vault's plugin directory:
   `<vault>/.obsidian/plugins/obsidian-disable-features/`
2. Open Obsidian settings -> **Community plugins** -> enable **Disable Features**.

## Development

```bash
npm run build   # Build production bundle main.js
npm run dev     # Build and watch for changes
```
