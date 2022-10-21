import { ConfigManager } from "./config/config-manager";
import { Constants } from "./constants";
import { DesktopManager, DictConfig } from "./desktop-manager";
import { PluginSettings } from "./plugin_settings";


export interface KintoneEvent {
    record: kintone.types.SavedFields;
    // viewId: string;
    error: string[];
}

/**
 * デスクトップ画面のメイン処理
 */
(function (PLUGIN_ID) {
    'use strict';
    // const DEBUG_MODE = true;

    const setting_input = PluginSettings.input
    const conf_manager = new ConfigManager(PLUGIN_ID, setting_input)

    console.log(conf_manager)

    // 詳細表示または編集画面
    const EVENT_DETAIL = [
        'app.record.detail.show'    // detail.showでは全体のエラーは表示されない
    ];

    // レコード詳細画面
    kintone.events.on(EVENT_DETAIL, (event: KintoneEvent) => {

        const full_conf = conf_manager.get_config() as DictConfig
        console.log(full_conf)

        const desktop_manager = new DesktopManager(full_conf)
        // フィールドの不足がないか環境チェック
        event = desktop_manager.check_field_existence(event, setting_input)

        if( desktop_manager.is_ready() ){
            desktop_manager.run()
        }
        else{
            const warn = `[${Constants.PLUGIN_NAME}] 実行準備が整っていません。メッセージに従って設定を見直してください。`
            console.warn(warn)
            const errmsg = [warn, '\n', ...event.error].join('\n')
            alert(errmsg)
        }

        console.log(event.error)
        return event;
    });

})(kintone.$PLUGIN_ID);
