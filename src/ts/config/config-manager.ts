import { DictConfig } from "../desktop-manager";
import { Utils } from "../utils";
import { ConfigUtilities } from "./config-tinker";
import 'bootstrap'
import { PluginSettings } from "../plugin_settings";
import { ConfigBuilder } from "./config-builder";
import { KintoneConfigSetting, SettingValue } from "../common";

/**
 * 設定画面のメイン処理
 * 設定値を読み込んで初期化、設定画面の構築、入力の受付を担当
 */
export class ConfigManager {
    setting_input: KintoneConfigSetting;
    

    // 設定項目のノード構築と動作設定と表示順序
    async make_setting_fields(props: {[key:string]: string}): Promise<HTMLElement[]>{

        const builder = new ConfigBuilder(props, this.config)
        await builder.load_layout_info()  // スペース情報を取得するために必要

        // レイアウトの構築
        return await PluginSettings.layout_inputs(builder)
    }


    KEY_CONFIG: string = 'config'
    config: {[key:string]: string | {} | []} = {}

    constructor( PLUGIN_ID: string, setting_input: KintoneConfigSetting ){
        const CONF = kintone.plugin.app.getConfig(PLUGIN_ID);
        this.set_config(CONF)
        console.log(this.config)

        this.setting_input = setting_input
    }

    set_config( CONF: {[key:string]: string} ){
        const serialized = Utils.get_from(CONF, this.KEY_CONFIG, '')
        if(serialized == ''){
            console.info('設定値がありません。初期値で開始します。')
        }
        else{
            this.config = JSON.parse(serialized)
        }
    }

    // プラグイン設定値を取得する(deserializedした辞書を取得できる)
    get_config(key: string | undefined = undefined): DictConfig | SettingValue {
        if(key == undefined){
            return this.config  // {[fieldcode:string]: string} の辞書、フィールドコードで引いてラベルを得られる
        }

        if(key in this.config){
            return this.config[key]
        }

        throw new Error(`未定義または未設定の設定キーが指定されました: [${key}]`)

    }


    // fields APIを呼び出して、フィールド情報をもとに設定画面を構築する
    build(){

        kintone.api(
            '/k/v1/preview/app/form/fields',    // 設定中のフィールドも取得できるようにする
            'GET',
            {
                app: kintone.app.getId() 
            },
            async (resp: any) => {

                const node_settings = await this.make_setting_fields(resp.properties)    // 設定フィールド配列
                const btn_submit = this.make_button_submit()        // 適用ボタン
                const btn_cancel = this.make_button_cancel()        // キャンセルボタン

                // トップのフォームノードを構築して配置
                const form_node = (() => {
                    const node = Utils.createElement('form', '', node_settings)
                    node.id = 'form_settings'
                    return node
                })()
            
                // 設定フォームのトップに設置
                const top = document.getElementById('config_body')
                top?.appendChild(form_node)
    
                const buttons = Utils.createElement('div', '', [
                    btn_cancel
                    , btn_submit
                ])
                top?.appendChild(buttons)
    
            },
            (err: any) => {
                throw err
            }
        )
    }

    
    // CONFに格納する辞書を構築する
    store_parameters():  {[key: string]: string | {}} {
        const store: {[key: string]: string | {}} = {}
        const this_form = document.getElementById('form_settings') as HTMLFormElement
        if(this_form == null){
            throw new Error('ERROR: フォーム要素を取得できませんでした。')
        }
        const config_tinker = new ConfigUtilities(this_form)

        for(const [key, value] of Object.entries(this.setting_input)){
            const selected = config_tinker.get_selected(value.code, value.type)
            if(selected){
                store[ value.code ] = selected
            }
            else {
                console.info(`未設定です [設定キー: ${key}]`)
            }
        }

        return store
    }

    // 適用ボタン
    make_button_submit() {
        const btn_submit = Utils.createElement('button', 'kintoneplugin-button-dialog-ok')
        btn_submit.setAttribute('type', 'button')
        btn_submit.textContent = '適用'
        btn_submit.addEventListener('keydown', (event)=>{
            if(event.isComposing || event.code == 'Enter'){
                console.info('適用ボタンのenterを無効化しました。')
                return false
            }
        })

        btn_submit.addEventListener('click', async (event) => {
            event.preventDefault();

            const this_form = document.getElementById('form_settings') as HTMLFormElement
            if(this_form == null){
                throw 'ERROR: フォーム要素を取得できませんでした。'
            }
            
            // 設定値を格納する
            const serialized = JSON.stringify(this.store_parameters())
            const config: {[key:string]: string} = {}
            config[this.KEY_CONFIG] = serialized

            kintone.plugin.app.setConfig(config, function () {
                alert('プラグイン設定を保存しました。アプリの更新をお忘れなく！');
                window.location.href = '../../flow?app=' + kintone.app.getId();
            });
        })

        return btn_submit
    }

    // キャンセルボタン
    make_button_cancel() {
        const btn_cancel = Utils.createElement('button', 'js-cancel-button kintoneplugin-button-dialog-cancel')
        btn_cancel.textContent = 'キャンセル'
    
        btn_cancel.addEventListener('click', function (event) {
            console.log(event)
            window.location.href = '../../' + kintone.app.getId() + '/plugin/';
        });

        return btn_cancel
    }


}
