# Implementation Plan - Obsidian Disable Features Plugin

## User Requirements
- **Disable Windows (Popout / Floating windows)**: Notes cannot be opened in separate OS windows. Only in-app tabs are allowed.
- **Disable Split Panes**: Disallow splitting panes vertically or horizontally. All notes stay in standard tab groups without splits.

## Architecture & Strategy

1. **Popout Windows Disabling**:
   - Intercept/monkeypatch `app.workspace.openPopoutLeaf` (redirect to standard leaf/tab in main workspace: `app.workspace.getLeaf(true)` or `getLeaf('tab')`).
   - Remove/hide "Move to new window" and "Open in new window" context menu options (`workspace:move-to-new-window`, `workspace:open-in-new-window`).
   - Intercept window popout commands via `app.commands`.
   - Prevent drag actions that would detach a tab into a floating popout window.
   - If any popout window exists or is opened, close it or re-dock its leaves back to the main workspace.

2. **Split Panes Disabling**:
   - Intercept/monkeypatch `app.workspace.splitActiveLeaf` (redirect to `app.workspace.getLeaf('tab')` or reuse active leaf).
   - Intercept/monkeypatch `WorkspaceItem.prototype.split` or `WorkspaceSplit.prototype.split` if called directly.
   - Intercept `workspace:split-vertical`, `workspace:split-horizontal` commands.
   - Remove split actions from tab header menus and command palette.
   - Prevent drop / drag splitting (via CSS or drag event handlers if needed).

3. **Settings**:
   - Setting to toggle "Disable popout windows" (default: true).
   - Setting to toggle "Disable split panes" (default: true).

4. **Scaffolding & Build**:
   - `manifest.json`, `package.json`, `tsconfig.json`, `esbuild.config.mjs`, `src/main.ts`, `src/settings.ts`.
   - Setup `npm run build` and `npm run dev`.
