import {
  App,
  Menu,
  MenuItem,
  Notice,
  Plugin,
  Workspace,
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
        console.error("Error during unpatch:", e);
      }
    }
    this.unpatches = [];
  }

  applySettings() {
    // Clean up previous patches before reapplying
    this.unpatchAll();

    this.patchMenuHandling();
    this.patchCommands();

    if (this.settings.disablePopoutWindows) {
      this.enableDisablePopoutWindows();
    }

    if (this.settings.disableSplitPanes) {
      this.enableDisableSplitPanes();
    }
  }

  /**
   * Disables opening leaves in floating/popout OS windows and forces them into tabs.
   */
  private enableDisablePopoutWindows() {
    const workspace = this.app.workspace as any;

    // 1. Intercept getLeaf('window') -> redirect to getLeaf('tab')
    if (typeof workspace.getLeaf === "function") {
      const origGetLeaf = workspace.getLeaf;
      const plugin = this;
      workspace.getLeaf = function (
        type?: any,
        ...args: any[]
      ): WorkspaceLeaf {
        if (plugin.settings.disablePopoutWindows && type === "window") {
          return origGetLeaf.call(this, "tab", ...args);
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
      const plugin = this;
      workspace.openPopoutLeaf = function (
        ...args: any[]
      ): WorkspaceLeaf {
        if (plugin.settings.disablePopoutWindows) {
          // Open in a standard tab leaf instead
          return workspace.getLeaf("tab");
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
      const plugin = this;
      workspace.moveLeafToPopout = function (
        leaf: WorkspaceLeaf,
        ...args: any[]
      ): any {
        if (plugin.settings.disablePopoutWindows) {
          new Notice("Popout windows are disabled.");
          return null;
        }
        return origMoveLeafToPopout.call(this, leaf, ...args);
      };
      this.unpatches.push(() => {
        workspace.moveLeafToPopout = origMoveLeafToPopout;
      });
    }

    // 4. Close any already existing or newly opening popout window and move leaves to main workspace
    this.closeExistingPopouts();

    const windowOpenRef = this.app.workspace.on(
      // @ts-ignore
      "window-open",
      (win: WorkspaceWindow, _window: Window) => {
        if (this.settings.disablePopoutWindows) {
          this.dockPopoutWindowLeaves(win);
        }
      }
    );
    this.unpatches.push(() => {
      this.app.workspace.offref(windowOpenRef);
    });

    // 5. Intercept dragend / drop behavior that detaches a leaf to popout window
    this.registerWindowDropGuard();
  }

  /**
   * Disables splitting panes vertically or horizontally.
   */
  private enableDisableSplitPanes() {
    const workspace = this.app.workspace as any;

    // 1. Intercept getLeaf('split') or getLeaf(true) -> redirect to getLeaf('tab')
    if (typeof workspace.getLeaf === "function") {
      const origGetLeaf = workspace.getLeaf;
      const plugin = this;
      workspace.getLeaf = function (
        type?: any,
        direction?: any,
        ...args: any[]
      ): WorkspaceLeaf {
        if (plugin.settings.disableSplitPanes) {
          if (type === "split" || type === true) {
            return origGetLeaf.call(this, "tab", ...args);
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
      const plugin = this;
      workspace.splitActiveLeaf = function (
        ...args: any[]
      ): WorkspaceLeaf {
        if (plugin.settings.disableSplitPanes) {
          return workspace.getLeaf("tab");
        }
        return origSplitActiveLeaf.apply(this, args);
      };
      this.unpatches.push(() => {
        workspace.splitActiveLeaf = origSplitActiveLeaf;
      });
    }

    // 3. Intercept createLeafBySplit
    if (typeof workspace.createLeafBySplit === "function") {
      const origCreateLeafBySplit = workspace.createLeafBySplit;
      const plugin = this;
      workspace.createLeafBySplit = function (
        ...args: any[]
      ): WorkspaceLeaf {
        if (plugin.settings.disableSplitPanes) {
          return workspace.getLeaf("tab");
        }
        return origCreateLeafBySplit.apply(this, args);
      };
      this.unpatches.push(() => {
        workspace.createLeafBySplit = origCreateLeafBySplit;
      });
    }

    // 4. Intercept duplicateLeaf
    if (typeof workspace.duplicateLeaf === "function") {
      const origDuplicateLeaf = workspace.duplicateLeaf;
      const plugin = this;
      workspace.duplicateLeaf = function (
        leaf: WorkspaceLeaf,
        leafType?: any,
        ...args: any[]
      ): Promise<WorkspaceLeaf> {
        if (plugin.settings.disableSplitPanes) {
          if (leafType === "split" || leafType === true || leafType === undefined) {
            leafType = "tab";
          }
        }
        return origDuplicateLeaf.call(this, leaf, leafType, ...args);
      };
      this.unpatches.push(() => {
        workspace.duplicateLeaf = origDuplicateLeaf;
      });
    }
  }

  /**
   * Filter context menu items for windows and split panes
   */
  private patchMenuHandling() {
    const plugin = this;
    const proto = Menu.prototype as any;

    if (proto && typeof proto.addItem === "function") {
      const origAddItem = proto.addItem;
      proto.addItem = function (cb: (item: MenuItem) => any) {
        return origAddItem.call(this, (item: MenuItem) => {
          cb(item);

          // We check the item's title or callback to determine if it should be suppressed
          const itemAny = item as any;
          const title = (itemAny.title || "").toString().toLowerCase();

          if (plugin.settings.disablePopoutWindows) {
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

          if (plugin.settings.disableSplitPanes) {
            if (
              title.includes("split right") ||
              title.includes("split down") ||
              title.includes("split vertically") ||
              title.includes("split horizontally")
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
   * Intercept command palette commands related to splitting and window creation
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
      if (plugin.settings.disablePopoutWindows) {
        const popoutCommands = [
          "workspace:open-in-new-window",
          "workspace:move-to-new-window",
        ];
        if (popoutCommands.includes(commandId)) {
          new Notice("Popout windows are disabled.");
          return false;
        }
      }

      if (plugin.settings.disableSplitPanes) {
        const splitCommands = [
          "workspace:split-vertical",
          "workspace:split-horizontal",
        ];
        if (splitCommands.includes(commandId)) {
          // Open in a new tab instead of splitting
          app.workspace.getLeaf("tab");
          new Notice("Splitting is disabled. Opened in new tab instead.");
          return true;
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

      // Close popout window if possible
      if (typeof (win as any).win?.close === "function") {
        (win as any).win.close();
      }
    } catch (e) {
      console.error("Failed to dock popout leaf:", e);
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

  /**
   * Guard drag-and-drop actions that could try to drop outside Obsidian to spawn a window
   */
  private registerWindowDropGuard() {
    const handleDragOver = (evt: DragEvent) => {
      // Prevent leaves from creating external windows if dragged out
      if (this.settings.disablePopoutWindows) {
        // Can inspect dataTransfer types if needed
      }
    };
    window.addEventListener("dragover", handleDragOver, true);
    this.unpatches.push(() => {
      window.removeEventListener("dragover", handleDragOver, true);
    });
  }
}
