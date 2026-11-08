import {
  Menu,
  MenuItem,
  Notice,
  Plugin,
  SplitDirection,
  WorkspaceLeaf,
  WorkspaceWindow,
} from "obsidian";
import {
  DEFAULT_SETTINGS,
  DisableFeaturesSettings,
  DisableFeaturesSettingTab,
} from "./settings";

export default class DisableFeaturesPlugin extends Plugin {
  settings: DisableFeaturesSettings = DEFAULT_SETTINGS;
  private unpatches: (() => void)[] = [];

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new DisableFeaturesSettingTab(this.app, this));

    this.app.workspace.onLayoutReady(() => {
      this.applySettings();
    });
  }

  onunload() {
    this.unpatchAll();
    this.cleanupBodyClasses();
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  unpatchAll() {
    for (const unpatch of this.unpatches) {
      try {
        unpatch();
      } catch (e) {
        console.error("[disable-features] Error during unpatch:", e);
      }
    }
    this.unpatches = [];
  }

  private cleanupBodyClasses() {
    document.body.classList.remove("df-hide-left-sidebar");
    document.body.classList.remove("df-hide-right-sidebar");
  }

  applySettings() {
    this.unpatchAll();
    this.cleanupBodyClasses();

    this.patchMenuHandling();
    this.patchCommands();

    // 1. Popouts / Floating Windows
    if (this.settings.disablePopoutWindows) {
      this.applyPopoutWindowRestrictions();
    }

    // 2. Split Panes
    if (this.settings.disableSplitPanes) {
      this.applySplitPaneRestrictions();
    }

    // 3. Sidebars (Single Side & Flatten Tabs)
    this.applySidebarRestrictions();
  }

  private notify(msg: string) {
    if (this.settings.showNotificationOnBlock) {
      new Notice(`[Disable Features] ${msg}`);
    }
  }

  /**
   * Applies single-side sidebar enforcement and sidebar flattening (no top/bottom splits)
   * Works on Desktop and Mobile
   */
  private applySidebarRestrictions() {
    const workspace = this.app.workspace as any;
    const plugin = this;

    // Apply UI visibility CSS classes for disabled sidebar
    if (
      this.settings.enforceSingleSidebar &&
      this.settings.hideDisabledSidebarRibbonButtons
    ) {
      if (this.settings.allowedSidebarSide === "left") {
        document.body.classList.add("df-hide-right-sidebar");
      } else {
        document.body.classList.add("df-hide-left-sidebar");
      }
    }

    // 1. Intercept getLeftLeaf and getRightLeaf
    if (this.settings.enforceSingleSidebar) {
      const origGetLeftLeaf = workspace.getLeftLeaf;
      const origGetRightLeaf = workspace.getRightLeaf;

      if (typeof origGetLeftLeaf === "function") {
        workspace.getLeftLeaf = function (split?: boolean): WorkspaceLeaf | null {
          const forceSplit = plugin.settings.flattenSidebarTabs ? false : split;
          if (plugin.settings.allowedSidebarSide === "right") {
            // Divert left sidebar request to right sidebar
            return origGetRightLeaf.call(this, forceSplit);
          }
          return origGetLeftLeaf.call(this, forceSplit);
        };
        this.unpatches.push(() => {
          workspace.getLeftLeaf = origGetLeftLeaf;
        });
      }

      if (typeof origGetRightLeaf === "function") {
        workspace.getRightLeaf = function (split?: boolean): WorkspaceLeaf | null {
          const forceSplit = plugin.settings.flattenSidebarTabs ? false : split;
          if (plugin.settings.allowedSidebarSide === "left") {
            // Divert right sidebar request to left sidebar
            return origGetLeftLeaf.call(this, forceSplit);
          }
          return origGetRightLeaf.call(this, forceSplit);
        };
        this.unpatches.push(() => {
          workspace.getRightLeaf = origGetRightLeaf;
        });
      }

      // Intercept ensureSideLeaf (Obsidian 1.7.2+)
      if (typeof workspace.ensureSideLeaf === "function") {
        const origEnsureSideLeaf = workspace.ensureSideLeaf;
        workspace.ensureSideLeaf = function (
          type: string,
          side: "left" | "right",
          options?: any
        ) {
          const targetSide = plugin.settings.allowedSidebarSide;
          const opts = Object.assign({}, options);
          if (plugin.settings.flattenSidebarTabs) {
            opts.split = false;
          }
          return origEnsureSideLeaf.call(this, type, targetSide, opts);
        };
        this.unpatches.push(() => {
          workspace.ensureSideLeaf = origEnsureSideLeaf;
        });
      }

      // Collapse and move any leaves from the disabled side to the allowed side
      this.consolidateSidebarLeaves();
    }

    // 2. Flatten sidebar tabs (prevent top/bottom split)
    if (this.settings.flattenSidebarTabs) {
      this.flattenSidebarContainers();

      // Intercept layout-change to continuously enforce single tab group in sidebars
      const layoutRef = this.app.workspace.on("layout-change", () => {
        if (this.settings.flattenSidebarTabs) {
          this.flattenSidebarContainers();
        }
        if (this.settings.enforceSingleSidebar) {
          this.ensureDisabledSidebarCollapsed();
        }
      });
      this.unpatches.push(() => {
        this.app.workspace.offref(layoutRef);
      });
    }
  }

  /**
   * Move leaves from disabled sidedock to allowed sidedock, then collapse disabled one
   */
  private consolidateSidebarLeaves() {
    const workspace = this.app.workspace as any;
    const disabledSplit =
      this.settings.allowedSidebarSide === "left"
        ? workspace.rightSplit
        : workspace.leftSplit;

    if (!disabledSplit) return;

    // Collapse disabled sidedock/drawer
    if (typeof disabledSplit.collapse === "function" && !disabledSplit.collapsed) {
      disabledSplit.collapse();
    }

    // Move any leaves in disabled split to the allowed split
    const leavesToMove: WorkspaceLeaf[] = [];
    if (typeof disabledSplit.iterateLeaves === "function") {
      disabledSplit.iterateLeaves((leaf: WorkspaceLeaf) => {
        leavesToMove.push(leaf);
      });
    } else if (Array.isArray(disabledSplit.children)) {
      this.collectLeavesFromContainer(disabledSplit, leavesToMove);
    }

    for (const leaf of leavesToMove) {
      try {
        const viewState = leaf.getViewState();
        const targetLeaf =
          this.settings.allowedSidebarSide === "left"
            ? workspace.getLeftLeaf(false)
            : workspace.getRightLeaf(false);
        if (targetLeaf) {
          targetLeaf.setViewState(viewState);
          leaf.detach();
        }
      } catch (e) {
        console.error("[disable-features] Error migrating sidedock leaf:", e);
      }
    }
  }

  /**
   * Helper to ensure the disabled sidedock remains collapsed
   */
  private ensureDisabledSidebarCollapsed() {
    const workspace = this.app.workspace as any;
    const disabledSplit =
      this.settings.allowedSidebarSide === "left"
        ? workspace.rightSplit
        : workspace.leftSplit;

    if (disabledSplit && typeof disabledSplit.collapse === "function" && !disabledSplit.collapsed) {
      disabledSplit.collapse();
    }
  }

  /**
   * Flatten multiple tab groups inside left/right sidedocks into a single tab container
   * Disables top/bottom split stacking
   */
  private flattenSidebarContainers() {
    const workspace = this.app.workspace as any;
    const sidedocks = [workspace.leftSplit, workspace.rightSplit];

    for (const sidedock of sidedocks) {
      if (!sidedock || !Array.isArray(sidedock.children)) continue;

      // In Obsidian desktop/mobile, a sidedock has children which are WorkspaceTabs components
      if (sidedock.children.length > 1) {
        // More than 1 tab group indicates a top/bottom split!
        const primaryTabGroup = sidedock.children[0];
        const secondaryTabGroups = sidedock.children.slice(1);

        for (const extraGroup of secondaryTabGroups) {
          const extraLeaves: WorkspaceLeaf[] = [];
          if (Array.isArray(extraGroup.children)) {
            extraLeaves.push(...extraGroup.children);
          }

          for (const leaf of extraLeaves) {
            try {
              const viewState = leaf.getViewState();
              // Create leaf in primary tab group
              const newLeaf = workspace.createLeafInParent(
                primaryTabGroup,
                primaryTabGroup.children.length
              );
              newLeaf.setViewState(viewState);
              leaf.detach();
            } catch (err) {
              console.error("[disable-features] Error merging sidebar tabs:", err);
            }
          }
        }
      }
    }
  }

  private collectLeavesFromContainer(
    container: any,
    outLeaves: WorkspaceLeaf[]
  ) {
    if (!container) return;
    if (container.view) {
      outLeaves.push(container as WorkspaceLeaf);
      return;
    }
    if (Array.isArray(container.children)) {
      for (const child of container.children) {
        this.collectLeavesFromContainer(child, outLeaves);
      }
    }
  }

  /**
   * Applies granular popout window restrictions (desktop only, safe on mobile)
   */
  private applyPopoutWindowRestrictions() {
    const workspace = this.app.workspace as any;
    const plugin = this;

    // 1. Intercept getLeaf('window')
    if (typeof workspace.getLeaf === "function") {
      const origGetLeaf = workspace.getLeaf;
      workspace.getLeaf = function (
        type?: any,
        ...args: any[]
      ): WorkspaceLeaf {
        if (plugin.settings.disablePopoutWindows && type === "window") {
          if (plugin.settings.redirectPopoutToTab) {
            plugin.notify("Popout window redirected to tab.");
            return origGetLeaf.call(this, "tab", ...args);
          } else {
            plugin.notify("Popout window creation blocked.");
            return origGetLeaf.call(this, false, ...args);
          }
        }
        return origGetLeaf.call(this, type, ...args);
      };
      this.unpatches.push(() => {
        workspace.getLeaf = origGetLeaf;
      });
    }

    // 2. Intercept openPopoutLeaf
    if (typeof workspace.openPopoutLeaf === "function") {
      const origOpenPopoutLeaf = workspace.openPopoutLeaf;
      workspace.openPopoutLeaf = function (
        ...args: any[]
      ): WorkspaceLeaf {
        if (plugin.settings.disablePopoutWindows) {
          if (plugin.settings.redirectPopoutToTab) {
            plugin.notify("Popout window redirected to tab.");
            return workspace.getLeaf("tab");
          } else {
            plugin.notify("Popout window creation blocked.");
            return workspace.getLeaf(false);
          }
        }
        return origOpenPopoutLeaf.apply(this, args);
      };
      this.unpatches.push(() => {
        workspace.openPopoutLeaf = origOpenPopoutLeaf;
      });
    }

    // 3. Intercept moveLeafToPopout
    if (typeof workspace.moveLeafToPopout === "function") {
      const origMoveLeafToPopout = workspace.moveLeafToPopout;
      workspace.moveLeafToPopout = function (
        leaf: WorkspaceLeaf,
        ...args: any[]
      ): any {
        if (plugin.settings.disablePopoutWindows) {
          plugin.notify("Moving leaf to popout window blocked.");
          return null;
        }
        return origMoveLeafToPopout.call(this, leaf, ...args);
      };
      this.unpatches.push(() => {
        workspace.moveLeafToPopout = origMoveLeafToPopout;
      });
    }

    // 4. Close any already existing or newly opening popout window and move leaves to main workspace
    if (this.settings.autoCloseExistingPopouts) {
      this.closeExistingPopouts();

      const windowOpenRef = this.app.workspace.on(
        // @ts-ignore
        "window-open",
        (win: WorkspaceWindow, _window: Window) => {
          if (
            this.settings.disablePopoutWindows &&
            this.settings.autoCloseExistingPopouts
          ) {
            this.dockPopoutWindowLeaves(win);
          }
        }
      );
      this.unpatches.push(() => {
        this.app.workspace.offref(windowOpenRef);
      });
    }
  }

  /**
   * Applies granular split pane restrictions
   */
  private applySplitPaneRestrictions() {
    const workspace = this.app.workspace as any;
    const plugin = this;

    const isSplitDisallowed = (direction?: SplitDirection) => {
      if (!plugin.settings.disableSplitPanes) return false;
      if (direction === "vertical" && plugin.settings.disableSplitVertical) {
        return true;
      }
      if (direction === "horizontal" && plugin.settings.disableSplitHorizontal) {
        return true;
      }
      if (!direction) {
        return (
          plugin.settings.disableSplitVertical ||
          plugin.settings.disableSplitHorizontal
        );
      }
      return false;
    };

    // 1. Intercept getLeaf('split') or getLeaf(true)
    if (typeof workspace.getLeaf === "function") {
      const origGetLeaf = workspace.getLeaf;
      workspace.getLeaf = function (
        type?: any,
        direction?: SplitDirection,
        ...args: any[]
      ): WorkspaceLeaf {
        if (plugin.settings.disableSplitPanes) {
          if (type === "split" || type === true) {
            if (isSplitDisallowed(direction)) {
              if (plugin.settings.redirectSplitToTab) {
                return origGetLeaf.call(this, "tab", ...args);
              } else {
                plugin.notify("Pane split blocked.");
                return origGetLeaf.call(this, false, ...args);
              }
            }
          }
        }
        return origGetLeaf.call(this, type, direction, ...args);
      };
      this.unpatches.push(() => {
        workspace.getLeaf = origGetLeaf;
      });
    }

    // 2. Intercept splitActiveLeaf
    if (typeof workspace.splitActiveLeaf === "function") {
      const origSplitActiveLeaf = workspace.splitActiveLeaf;
      workspace.splitActiveLeaf = function (
        direction?: SplitDirection,
        ...args: any[]
      ): WorkspaceLeaf {
        if (plugin.settings.disableSplitPanes && isSplitDisallowed(direction)) {
          if (plugin.settings.redirectSplitToTab) {
            return workspace.getLeaf("tab");
          } else {
            plugin.notify("Pane split blocked.");
            return workspace.getLeaf(false);
          }
        }
        return origSplitActiveLeaf.call(this, direction, ...args);
      };
      this.unpatches.push(() => {
        workspace.splitActiveLeaf = origSplitActiveLeaf;
      });
    }

    // 3. Intercept createLeafBySplit
    if (typeof workspace.createLeafBySplit === "function") {
      const origCreateLeafBySplit = workspace.createLeafBySplit;
      workspace.createLeafBySplit = function (
        leaf: WorkspaceLeaf,
        direction?: SplitDirection,
        ...args: any[]
      ): WorkspaceLeaf {
        if (plugin.settings.disableSplitPanes && isSplitDisallowed(direction)) {
          if (plugin.settings.redirectSplitToTab) {
            return workspace.getLeaf("tab");
          } else {
            plugin.notify("Pane split blocked.");
            return leaf;
          }
        }
        return origCreateLeafBySplit.call(this, leaf, direction, ...args);
      };
      this.unpatches.push(() => {
        workspace.createLeafBySplit = origCreateLeafBySplit;
      });
    }

    // 4. Intercept duplicateLeaf
    if (typeof workspace.duplicateLeaf === "function") {
      const origDuplicateLeaf = workspace.duplicateLeaf;
      workspace.duplicateLeaf = function (
        leaf: WorkspaceLeaf,
        leafType?: any,
        direction?: SplitDirection,
        ...args: any[]
      ): Promise<WorkspaceLeaf> {
        if (
          plugin.settings.disableSplitPanes &&
          plugin.settings.preventSplitOnDuplicate
        ) {
          if (leafType === "split" || leafType === true || leafType === undefined) {
            leafType = "tab";
          }
        }
        return origDuplicateLeaf.call(this, leaf, leafType, direction, ...args);
      };
      this.unpatches.push(() => {
        workspace.duplicateLeaf = origDuplicateLeaf;
      });
    }
  }

  /**
   * Filter context menu items for windows, split panes, and sidebar toggles
   */
  private patchMenuHandling() {
    const plugin = this;
    const proto = Menu.prototype as any;

    if (proto && typeof proto.addItem === "function") {
      const origAddItem = proto.addItem;
      proto.addItem = function (cb: (item: MenuItem) => any) {
        return origAddItem.call(this, (item: MenuItem) => {
          cb(item);

          const itemAny = item as any;
          const title = (itemAny.title || "").toString().toLowerCase();

          // Granular Popout Window Menu Filtering
          if (
            plugin.settings.disablePopoutWindows &&
            plugin.settings.hideWindowContextMenuItems
          ) {
            if (
              title.includes("open in new window") ||
              title.includes("move to new window") ||
              title.includes("open in popout") ||
              title.includes("move to popout")
            ) {
              if (typeof item.setDisabled === "function") {
                item.setDisabled(true);
              }
              if (itemAny.dom) {
                itemAny.dom.style.display = "none";
              }
            }
          }

          // Granular Split Panes Menu Filtering
          if (
            plugin.settings.disableSplitPanes &&
            plugin.settings.hideSplitContextMenuItems
          ) {
            const isVerticalMenu =
              title.includes("split right") || title.includes("split vertically");
            const isHorizontalMenu =
              title.includes("split down") || title.includes("split horizontally");

            if (
              (isVerticalMenu && plugin.settings.disableSplitVertical) ||
              (isHorizontalMenu && plugin.settings.disableSplitHorizontal) ||
              ((isVerticalMenu || isHorizontalMenu) &&
                plugin.settings.disableSplitVertical &&
                plugin.settings.disableSplitHorizontal)
            ) {
              if (typeof item.setDisabled === "function") {
                item.setDisabled(true);
              }
              if (itemAny.dom) {
                itemAny.dom.style.display = "none";
              }
            }
          }
        });
      };

      this.unpatches.push(() => {
        proto.addItem = origAddItem;
      });
    }
  }

  /**
   * Intercept command palette commands related to splitting, window creation, and sidebars
   */
  private patchCommands() {
    const app = this.app as any;
    if (!app.commands || !app.commands.executeCommandById) {
      return;
    }

    const origExecute = app.commands.executeCommandById;
    const plugin = this;

    app.commands.executeCommandById = function (
      commandId: string,
      ...args: any[]
    ) {
      // Window Commands
      if (
        plugin.settings.disablePopoutWindows &&
        plugin.settings.disableWindowCommands
      ) {
        const popoutCommands = [
          "workspace:open-in-new-window",
          "workspace:move-to-new-window",
        ];
        if (popoutCommands.includes(commandId)) {
          plugin.notify("Popout window commands are disabled.");
          return false;
        }
      }

      // Split Commands
      if (
        plugin.settings.disableSplitPanes &&
        plugin.settings.disableSplitCommands
      ) {
        if (
          commandId === "workspace:split-vertical" &&
          plugin.settings.disableSplitVertical
        ) {
          if (plugin.settings.redirectSplitToTab) {
            app.workspace.getLeaf("tab");
            plugin.notify("Vertical split redirected to a new tab.");
          } else {
            plugin.notify("Vertical split command is disabled.");
          }
          return true;
        }

        if (
          commandId === "workspace:split-horizontal" &&
          plugin.settings.disableSplitHorizontal
        ) {
          if (plugin.settings.redirectSplitToTab) {
            app.workspace.getLeaf("tab");
            plugin.notify("Horizontal split redirected to a new tab.");
          } else {
            plugin.notify("Horizontal split command is disabled.");
          }
          return true;
        }
      }

      // Sidebar Commands
      if (plugin.settings.enforceSingleSidebar) {
        if (
          plugin.settings.allowedSidebarSide === "left" &&
          (commandId === "app:toggle-right-sidebar" || commandId === "workspace:toggle-right-sidebar")
        ) {
          plugin.notify("Right sidebar is disabled.");
          return false;
        }

        if (
          plugin.settings.allowedSidebarSide === "right" &&
          (commandId === "app:toggle-left-sidebar" || commandId === "workspace:toggle-left-sidebar")
        ) {
          plugin.notify("Left sidebar is disabled.");
          return false;
        }
      }

      return origExecute.call(this, commandId, ...args);
    };

    this.unpatches.push(() => {
      app.commands.executeCommandById = origExecute;
    });
  }

  /**
   * Move leaves from any popout window back into the main workspace root
   */
  private dockPopoutWindowLeaves(win: WorkspaceWindow) {
    try {
      const leaves: WorkspaceLeaf[] = [];
      const workspace = this.app.workspace as any;
      if (typeof (win as any).iterateLeaves === "function") {
        (win as any).iterateLeaves((leaf: WorkspaceLeaf) => {
          leaves.push(leaf);
        });
      }

      for (const leaf of leaves) {
        const viewState = leaf.getViewState();
        const mainLeaf = workspace.getLeaf("tab");
        mainLeaf.setViewState(viewState);
        leaf.detach();
      }

      if (typeof (win as any).win?.close === "function") {
        (win as any).win.close();
      }
      this.notify("Popout window closed and docked to tabs.");
    } catch (e) {
      console.error("[disable-features] Failed to dock popout leaf:", e);
    }
  }

  /**
   * Check for any existing floating windows and move their contents back
   */
  private closeExistingPopouts() {
    const workspace = this.app.workspace as any;
    if (Array.isArray(workspace.floatingSplit?.children)) {
      const floatingWindows = [...workspace.floatingSplit.children];
      for (const win of floatingWindows) {
        this.dockPopoutWindowLeaves(win);
      }
    }
  }
}
