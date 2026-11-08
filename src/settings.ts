import { App, PluginSettingTab, Setting } from "obsidian";
import DisableFeaturesPlugin from "./main";

export interface DisableFeaturesSettings {
  // Popout / Window Features
  disablePopoutWindows: boolean;
  redirectPopoutToTab: boolean;
  autoCloseExistingPopouts: boolean;
  hideWindowContextMenuItems: boolean;
  disableWindowCommands: boolean;

  // Split Pane Features
  disableSplitPanes: boolean;
  disableSplitVertical: boolean;
  disableSplitHorizontal: boolean;
  redirectSplitToTab: boolean;
  hideSplitContextMenuItems: boolean;
  disableSplitCommands: boolean;
  preventSplitOnDuplicate: boolean;

  // Sidebar Features
  enforceSingleSidebar: boolean;
  allowedSidebarSide: "left" | "right";
  flattenSidebarTabs: boolean;
  hideDisabledSidebarRibbonButtons: boolean;

  // Feedback notifications
  showNotificationOnBlock: boolean;
}

export const DEFAULT_SETTINGS: DisableFeaturesSettings = {
  // Popout / Window Features
  disablePopoutWindows: true,
  redirectPopoutToTab: true,
  autoCloseExistingPopouts: true,
  hideWindowContextMenuItems: true,
  disableWindowCommands: true,

  // Split Pane Features
  disableSplitPanes: true,
  disableSplitVertical: true,
  disableSplitHorizontal: true,
  redirectSplitToTab: true,
  hideSplitContextMenuItems: true,
  disableSplitCommands: true,
  preventSplitOnDuplicate: true,

  // Sidebar Features
  enforceSingleSidebar: true,
  allowedSidebarSide: "left",
  flattenSidebarTabs: true,
  hideDisabledSidebarRibbonButtons: true,

  // Feedback notifications
  showNotificationOnBlock: true,
};

export class DisableFeaturesSettingTab extends PluginSettingTab {
  plugin: DisableFeaturesPlugin;

  constructor(app: App, plugin: DisableFeaturesPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h1", { text: "Disable Features Settings" });

    // ==========================================
    // NOTIFICATIONS
    // ==========================================
    containerEl.createEl("h2", { text: "General & Feedback" });

    new Setting(containerEl)
      .setName("Show Notification on Block")
      .setDesc("Display an in-app notice when a disallowed window, split, or sidebar action is blocked or redirected.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showNotificationOnBlock)
          .onChange(async (value) => {
            this.plugin.settings.showNotificationOnBlock = value;
            await this.plugin.saveSettings();
          })
      );

    // ==========================================
    // SIDEBAR CONSOLIDATION & FLATTENING
    // ==========================================
    containerEl.createEl("h2", { text: "Sidebar Configuration" });

    new Setting(containerEl)
      .setName("Enforce Single Sidebar")
      .setDesc("Force everything into one sidebar side (Left or Right) and completely disable the other side. Works on Desktop and Mobile.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enforceSingleSidebar)
          .onChange(async (value) => {
            this.plugin.settings.enforceSingleSidebar = value;
            await this.plugin.saveSettings();
            this.plugin.applySettings();
            this.display();
          })
      );

    if (this.plugin.settings.enforceSingleSidebar) {
      new Setting(containerEl)
        .setName("Active Sidebar Side")
        .setDesc("Select which sidebar remains active. All tabs and views from the other sidebar are moved here.")
        .addDropdown((dropdown) =>
          dropdown
            .addOption("left", "Left Sidebar only")
            .addOption("right", "Right Sidebar only")
            .setValue(this.plugin.settings.allowedSidebarSide)
            .onChange(async (value: "left" | "right") => {
              this.plugin.settings.allowedSidebarSide = value;
              await this.plugin.saveSettings();
              this.plugin.applySettings();
            })
        );

      new Setting(containerEl)
        .setName("Hide Disabled Sidebar Toggle Buttons")
        .setDesc("Hide UI icons/buttons that open the disabled sidebar.")
        .addToggle((toggle) =>
          toggle
            .setValue(this.plugin.settings.hideDisabledSidebarRibbonButtons)
            .onChange(async (value) => {
              this.plugin.settings.hideDisabledSidebarRibbonButtons = value;
              await this.plugin.saveSettings();
              this.plugin.applySettings();
            })
        );
    }

    new Setting(containerEl)
      .setName("Flatten Sidebar Tabs (No Top/Bottom Splits)")
      .setDesc("Eliminate top/bottom split stacking in sidebars. Keeps all sidebar items in a single horizontal tab strip to cycle through left-to-right.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.flattenSidebarTabs)
          .onChange(async (value) => {
            this.plugin.settings.flattenSidebarTabs = value;
            await this.plugin.saveSettings();
            this.plugin.applySettings();
          })
      );

    // ==========================================
    // POPOUT / FLOATING WINDOWS
    // ==========================================
    containerEl.createEl("h2", { text: "Popout / Floating Windows" });

    new Setting(containerEl)
      .setName("Disable Popout Windows (Master Switch)")
      .setDesc("Master toggle to disallow opening notes in separate OS windows.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.disablePopoutWindows)
          .onChange(async (value) => {
            this.plugin.settings.disablePopoutWindows = value;
            await this.plugin.saveSettings();
            this.plugin.applySettings();
            this.display();
          })
      );

    if (this.plugin.settings.disablePopoutWindows) {
      new Setting(containerEl)
        .setName("Redirect Popout Requests to Tabs")
        .setDesc("When an action or plugin calls for a new popout window, redirect it into a tab leaf instead of failing silently.")
        .addToggle((toggle) =>
          toggle
            .setValue(this.plugin.settings.redirectPopoutToTab)
            .onChange(async (value) => {
              this.plugin.settings.redirectPopoutToTab = value;
              await this.plugin.saveSettings();
              this.plugin.applySettings();
            })
        );

      new Setting(containerEl)
        .setName("Auto-Close & Dock Existing Popout Windows")
        .setDesc("Automatically dock leaves from any open popout window back into the main vault layout.")
        .addToggle((toggle) =>
          toggle
            .setValue(this.plugin.settings.autoCloseExistingPopouts)
            .onChange(async (value) => {
              this.plugin.settings.autoCloseExistingPopouts = value;
              await this.plugin.saveSettings();
              this.plugin.applySettings();
            })
        );

      new Setting(containerEl)
        .setName("Hide Window Options from Context Menus")
        .setDesc("Hides 'Open in new window' and 'Move to new window' from tab and file context menus.")
        .addToggle((toggle) =>
          toggle
            .setValue(this.plugin.settings.hideWindowContextMenuItems)
            .onChange(async (value) => {
              this.plugin.settings.hideWindowContextMenuItems = value;
              await this.plugin.saveSettings();
              this.plugin.applySettings();
            })
        );

      new Setting(containerEl)
        .setName("Disable Window Commands in Command Palette")
        .setDesc("Block execution of 'workspace:open-in-new-window' and 'workspace:move-to-new-window'.")
        .addToggle((toggle) =>
          toggle
            .setValue(this.plugin.settings.disableWindowCommands)
            .onChange(async (value) => {
              this.plugin.settings.disableWindowCommands = value;
              await this.plugin.saveSettings();
              this.plugin.applySettings();
            })
        );
    }

    // ==========================================
    // SPLIT PANES
    // ==========================================
    containerEl.createEl("h2", { text: "Split Panes" });

    new Setting(containerEl)
      .setName("Disable Split Panes (Master Switch)")
      .setDesc("Master toggle to disallow splitting panes. Leaves will be kept in tab groups.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.disableSplitPanes)
          .onChange(async (value) => {
            this.plugin.settings.disableSplitPanes = value;
            await this.plugin.saveSettings();
            this.plugin.applySettings();
            this.display();
          })
      );

    if (this.plugin.settings.disableSplitPanes) {
      new Setting(containerEl)
        .setName("Disable Vertical Splits")
        .setDesc("Disallow splitting pane to the left or right.")
        .addToggle((toggle) =>
          toggle
            .setValue(this.plugin.settings.disableSplitVertical)
            .onChange(async (value) => {
              this.plugin.settings.disableSplitVertical = value;
              await this.plugin.saveSettings();
              this.plugin.applySettings();
            })
        );

      new Setting(containerEl)
        .setName("Disable Horizontal Splits")
        .setDesc("Disallow splitting pane up or down.")
        .addToggle((toggle) =>
          toggle
            .setValue(this.plugin.settings.disableSplitHorizontal)
            .onChange(async (value) => {
              this.plugin.settings.disableSplitHorizontal = value;
              await this.plugin.saveSettings();
              this.plugin.applySettings();
            })
        );

      new Setting(containerEl)
        .setName("Redirect Split Requests to Tabs")
        .setDesc("When an action or plugin calls to split the leaf, open it as a new tab instead.")
        .addToggle((toggle) =>
          toggle
            .setValue(this.plugin.settings.redirectSplitToTab)
            .onChange(async (value) => {
              this.plugin.settings.redirectSplitToTab = value;
              await this.plugin.saveSettings();
              this.plugin.applySettings();
            })
        );

      new Setting(containerEl)
        .setName("Hide Split Options from Context Menus")
        .setDesc("Hides 'Split right', 'Split down', 'Split vertically', and 'Split horizontally' in tab context menus.")
        .addToggle((toggle) =>
          toggle
            .setValue(this.plugin.settings.hideSplitContextMenuItems)
            .onChange(async (value) => {
              this.plugin.settings.hideSplitContextMenuItems = value;
              await this.plugin.saveSettings();
              this.plugin.applySettings();
            })
        );

      new Setting(containerEl)
        .setName("Disable Split Commands in Command Palette")
        .setDesc("Intercept 'workspace:split-vertical' and 'workspace:split-horizontal' from being executed.")
        .addToggle((toggle) =>
          toggle
            .setValue(this.plugin.settings.disableSplitCommands)
            .onChange(async (value) => {
              this.plugin.settings.disableSplitCommands = value;
              await this.plugin.saveSettings();
              this.plugin.applySettings();
            })
        );

      new Setting(containerEl)
        .setName("Prevent Splitting on Leaf Duplication")
        .setDesc("When duplicating a leaf, open the duplicate in a new tab instead of splitting.")
        .addToggle((toggle) =>
          toggle
            .setValue(this.plugin.settings.preventSplitOnDuplicate)
            .onChange(async (value) => {
              this.plugin.settings.preventSplitOnDuplicate = value;
              await this.plugin.saveSettings();
              this.plugin.applySettings();
            })
        );
    }
  }
}
