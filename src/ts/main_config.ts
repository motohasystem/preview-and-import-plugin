// プラグイン設定画面 メイン

import { ConfigManager } from "./config/config-manager";
import { PluginSettings } from "./plugin_settings";

(function (PLUGIN_ID) {
    'use strict';

    const setting_input = PluginSettings.input
    const manager = new ConfigManager(PLUGIN_ID, setting_input)
    manager.build()

})(kintone.$PLUGIN_ID);
