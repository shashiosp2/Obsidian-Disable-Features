# Walkthrough: Obsidian Disable Features Plugin

## Changes Implemented

1. **Repository Setup & Tracking**:
   - Cloned repository `git@github.com:shashiosp2/Obsidian-Disable-Features.git`.
   - Initialized project tracking files [task.md](file:///home/obulasetty/projects/0095_obsidian_disable_windows/task.md) and [implementation_plan.md](file:///home/obulasetty/projects/0095_obsidian_disable_windows/implementation_plan.md).

2. **Core Plugin Architecture**:
   - [manifest.json](file:///home/obulasetty/projects/0095_obsidian_disable_windows/manifest.json): Plugin metadata for Obsidian.
   - [src/settings.ts](file:///home/obulasetty/projects/0095_obsidian_disable_windows/src/settings.ts): Settings tab with toggles for:
     - **Disable Popout Windows** (enabled by default)
     - **Disable Split Panes** (enabled by default)
   - [src/main.ts](file:///home/obulasetty/projects/0095_obsidian_disable_windows/src/main.ts):
     - **Popout Window Disabling**:
       - Patches `workspace.getLeaf('window')` to return a tab leaf `workspace.getLeaf('tab')`.
       - Patches `workspace.openPopoutLeaf` and `workspace.moveLeafToPopout`.
       - Listens to `window-open` event and auto-docks popout leaves back into the main workspace tab structure.
       - Hides "Open in new window" / "Move to new window" from context menus.
       - Intercepts commands `workspace:open-in-new-window` and `workspace:move-to-new-window`.
     - **Split Pane Disabling**:
       - Patches `workspace.getLeaf('split')`, `workspace.splitActiveLeaf`, and `workspace.createLeafBySplit` to redirect to `workspace.getLeaf('tab')`.
       - Intercepts `workspace.duplicateLeaf` to enforce tabs.
       - Hides "Split right", "Split down", "Split vertically", and "Split horizontally" from context menus.
       - Intercepts split commands in the command palette (`workspace:split-vertical`, `workspace:split-horizontal`), redirecting them to open a new tab.

3. **Build & Bundling**:
   - Set up [esbuild.config.js](file:///home/obulasetty/projects/0095_obsidian_disable_windows/esbuild.config.js) and [package.json](file:///home/obulasetty/projects/0095_obsidian_disable_windows/package.json).
   - Ran `npm run build` which produced a standalone [main.js](file:///home/obulasetty/projects/0095_obsidian_disable_windows/main.js).

## Verification Results
- Ran `npm run build` cleanly with 0 errors.
- Both [manifest.json](file:///home/obulasetty/projects/0095_obsidian_disable_windows/manifest.json) and [main.js](file:///home/obulasetty/projects/0095_obsidian_disable_windows/main.js) are generated and ready for Obsidian installation.
