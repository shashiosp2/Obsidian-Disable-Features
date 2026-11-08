# Obsidian Disable Features Plugin

An Obsidian plugin that disables specific features (such as popout windows and split panes) to enforce a clean, distraction-free, tab-only workflow.

## Features & Granular Settings

All settings can be individually configured under Obsidian **Settings -> Community Plugins -> Disable Features**:

### Sidebar Configuration (Desktop & Mobile)
- **Enforce Single Sidebar**: Consolidates all sidebar views onto one active side (Left or Right) and completely collapses & disables the other side.
- **Active Sidebar Side**: Choose whether the single active sidebar is **Left** or **Right**. Any attempt by Obsidian or plugins to create or reveal a leaf in the disabled sidebar is seamlessly diverted into this active side.
- **Hide Disabled Sidebar Toggle Buttons**: Hides the UI ribbon icons and toggle buttons for the disabled sidebar.
- **Flatten Sidebar Tabs (No Top/Bottom Splits)**: Eliminates vertical split stacking inside sidebars. All sidebar views are placed in a single horizontal tab strip so you can cleanly cycle through all of them left-to-right without multi-level splits.

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
