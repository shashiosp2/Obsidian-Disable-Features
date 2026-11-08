import { App, PluginSettingTab, Setting } from "obsidian";
import DisableFeaturesPlugin from "./main";

export interface DisableFeaturesSettings {
  disablePopoutWindows: boolean;
  disableSplitPanes: boolean;
}

export const DEFAULT_SETTINGS: DisableFeaturesSettings = {
  disablePopoutWindows: true,
  disableSplitPanes: true,
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

    containerEl.createEl("h2", { text: "Obsidian Disable Features Settings" });

    new Setting(containerEl)
      .setName("Disable Popout Windows")
      .setDesc("Prevents opening notes in separate OS windows. Leaves will be opened as tabs instead.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.disablePopoutWindows)
          .onChange(async (value) => {
            this.plugin.settings.disablePopoutWindows = value;
            await this.plugin.saveSettings();
            this.plugin.applySettings();
          })
      );

    new Setting(containerEl)
      .setName("Disable Split Panes")
      .setDesc("Disallows horizontal and vertical pane splitting. Enforces opening notes in tabs.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.disableSplitPanes)
          .onChange(async (value) => {
            this.plugin.settings.disableSplitPanes = value;
            await this.plugin.saveSettings();
            this.plugin.applySettings();
          })
      );
  }
}
