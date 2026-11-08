# Obsidian Disable Features Plugin

An Obsidian plugin that disables specific features (such as popout windows and split panes) to enforce a clean, distraction-free, tab-only workflow.

## Features & Granular Settings

All settings can be individually configured under Obsidian **Settings -> Community Plugins -> Disable Features**:

### Popout / Floating Windows
- **Disable Popout Windows (Master Switch)**: Prevents opening notes as separate OS windows.
- **Redirect Popout Requests to Tabs**: When enabled, any request to open a window creates a new tab instead of failing silently.
- **Auto-Close & Dock Existing Popout Windows**: Automatically docks leaves in open floating windows back into the main vault's tab layout.
- **Hide Window Options from Context Menus**: Removes "Open in new window" / "Move to new window" from file & tab menus.
- **Disable Window Commands**: Blocks `workspace:open-in-new-window` and `workspace:move-to-new-window` from the command palette.

### Split Panes
- **Disable Split Panes (Master Switch)**: Prevents pane splitting, enforcing tabs only.
- **Disable Vertical Splits**: Selectively disallow left/right splits.
- **Disable Horizontal Splits**: Selectively disallow up/down splits.
- **Redirect Split Requests to Tabs**: Converts pane split calls into opening a new tab.
- **Hide Split Options from Context Menus**: Removes "Split right", "Split down", "Split vertically", and "Split horizontally" from tab headers.
- **Disable Split Commands**: Intercepts `workspace:split-vertical` and `workspace:split-horizontal` in the command palette.
- **Prevent Splitting on Leaf Duplication**: Forces duplicated leaves to open as tabs rather than splits.

### General & Feedback
- **Show Notification on Block**: Displays an in-app notice whenever a disallowed window or split action is blocked or redirected.

## Installation

1. Copy `manifest.json` and `main.js` into your Obsidian vault's plugin directory:
   `<vault>/.obsidian/plugins/obsidian-disable-features/`
2. Open Obsidian settings -> **Community plugins** -> enable **Disable Features**.

## Development

```bash
npm run build   # Build production bundle main.js
npm run dev     # Build and watch for changes
```
