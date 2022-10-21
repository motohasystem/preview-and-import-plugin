import { Constants, ConstantsUtils, LotGuardOption, PreviewStyle } from "./constants";
import { FilePreviewer } from "./file-previewer";
import { ImportManager } from "./import_manager";
import { KintoneEvent } from "./main_desktop";
import { Utils } from "./utils";
import "../scss/style.scss";
import { PluginSettings } from "./plugin_settings";
import { SettingItem, SettingValue } from "./common";

// 添付ファイル情報を取得するためのフィールドコードのセット
export type AttachedFileSet = {
    'fc_attached': string;
    'fc_preview_space': string;
    'preview_style': PreviewStyle
}

export interface DictConfig { 
    [fieldcode: string]: SettingValue 
}

export class DesktopManager {
    conf: DictConfig
    ready: boolean = false

    constructor(conf: DictConfig){
        this.conf = conf
    }

    run(){
        try{
            this.run_preview()
            this.run_import()
        }
        catch(err){
            if(err instanceof Error){
                const errmsg = '💡 ' + err.message
                const headerSpace = kintone.app.record.getHeaderMenuSpaceElement()
                headerSpace?.appendChild(Utils.createElement('p', 'p-3 mb-2 bg-danger text-light', [], errmsg))
            }
            else{
                console.error(err)
            }
        }
    }

    run_preview(){
        // プラグイン全体の設定情報
        const settings = PluginSettings.input

        // 変換後の添付ファイルフィールド
        const fc_attached_after = this.conf[settings.fc_after_file.code] as string

        // プレビュー表示
        this.show_preview([
            {   // 変換後ファイル
                fc_preview_space: this.conf[settings.fc_after_preview.code] as string
                , fc_attached: fc_attached_after
                , preview_style: this.conf[settings.radio_after_preview.code] as PreviewStyle
            }
        ])
    }

    run_import(){
        // プラグイン全体の設定情報
        const settings = PluginSettings.input

        // 変換後の添付ファイルフィールド
        const fc_attached_after = this.conf[settings.fc_after_file.code] as string

        // インポートに必要な設定値を収集
        const key_lotguard: keyof DictConfig = settings.radio_lotguard.code //  'fc_radio_lotguard'
        const key_guard_field: keyof DictConfig = settings.dropdown_lotguard_fieldcode.code
        const key_import_app: keyof DictConfig = settings.dropdown_import_app.code // 'fc_import_app_dropdown'
        const key_header_handling: keyof DictConfig = settings.radio_header_handling.code //'fc_radio_header_handling'
        const import_app_info = this.conf[key_import_app] as string
        const app_infos = import_app_info.match(/(.+?)\s*\(id:\s*(\d+)\).*/)

        if(app_infos == null){
            console.info('インポート先アプリ情報を設定していません。')
            return
        }

        const app_label = app_infos[1]
        const app_id = app_infos[2]

        const lotguard = this.conf[key_lotguard] as string
        const guard_field = this.conf[key_guard_field] as string
        const header_handling = this.conf[key_header_handling] as string

        if(lotguard == LotGuardOption.ON && guard_field == undefined){
            throw new Error(`[設定エラー] ロットガードを有効とした場合はロットガードの判定フィールドも指定してください。(lotguard:${lotguard} / guard_field:${guard_field})`)
        }

        if(lotguard == undefined || header_handling == undefined){
            throw new Error(`[設定エラー] インポート機能に必要な情報を設定していません。(lotguard:${lotguard} / guard_field:${guard_field} / header_handling:${header_handling})`)
        }

        // csvインポートマネージャ
        const import_manager = new ImportManager(
            app_id
            , header_handling
            , ConstantsUtils.isEnableLotguard(lotguard)
            , guard_field
        )

        // インポートボタンの設置
        const spacer_import_button = this.conf[settings.space_import_button.code] as string
        const button_input = this.install_import_button(
            {
                fc_preview_space: spacer_import_button
                , import_app_id: app_id            // インポート先アプリ情報
                , import_app_label: app_label      // インポート先アプリ情報
                , radio_lotguard: lotguard         // ロットガードスイッチ(on / off)
                , header_handling: header_handling
                , fc_attached: fc_attached_after
            }
        )
        if(button_input == undefined){
            const errmsg = `[${Constants.PLUGIN_NAME}] インポートボタンの構築に失敗しました。`
            console.error(errmsg)
            throw new Error(errmsg)
        }
        // インポートボタンのクリックイベント
        button_input.addEventListener('click', (event: MouseEvent)=>{
            const button = event.currentTarget as HTMLElement
            const backup = button.cloneNode(true)
            button.innerHTML = ''
            const spinners = [ 
                Utils.ce(
                    'span'
                    , 'spinner-grow spinner-grow-sm text-secondary'
                    , []
                    , ''
                    , {
                        'role': 'status'
                        , 'aria-hidden': 'true'
                    }
                )
                , Utils.ce('span', 'ms-2', [], 'インポートしています...')
            ]
            spinners.forEach((node)=>{
                button.appendChild(node)
            })

            import_manager.import_all(
                // 変換後ファイルのフィールドコードを渡す
                fc_attached_after
            ).catch((err)=>{
                console.error(err.message)
                alert(err.message)

            }).finally(()=>{
                console.log('インポート完了しました')
                button.innerHTML = ''
                Array.from(backup.childNodes).forEach((node)=>{
                    button.appendChild(node)
                })
            })
        })
    }

    // 実行準備が整っているか
    is_ready(): boolean{
        return this.ready
    }

    // フィールドコードの配列を受け取って存在チェック
    check_field_existence(event: KintoneEvent, setting_input: {[key:string]: SettingItem}): KintoneEvent{
        console.log(setting_input)

        // const keys = Object.keys(setting_input)
        this.ready = true
        for(const key in setting_input){
            const setting = setting_input[key]
            if(setting.check_exists == false){
                continue    // フィールド存在チェックしない項目はスキップ
            }
            const fieldcode = this.conf[setting.code] as string
            if(!(fieldcode in event.record)){
                const msg = ((fc)=>{
                    if(fc){
                        return "kintoneアプリに" + setting.label + "フィールド [" + fc + "] がありません。"
                    }
                    return "プラグイン設定画面で【" + setting.label + "フィールド】が設定されていません。"
                })(fieldcode)
                console.error(msg)
                if(event.error === undefined){
                    event.error = []
                }
                event.error.push(msg)
                this.ready = false
            }
        }

        return event

    }

    // 添付ファイルのプレビューを表示
    show_preview(fields: AttachedFileSet[]){
        fields.forEach((fieldset: AttachedFileSet)=>{
            if(fieldset.fc_attached == undefined || fieldset.fc_preview_space == undefined){
                console.info('プレビュー用のフィールドは未設定です。')
            }
            else{
                FilePreviewer.show(fieldset)
            }
        })
    }

    /**
     * インポートボタン自身と、周囲の説明書きを構築します
     * 返り値としてインポートボタンノードオブジェクトを返すので、そちらにクリックイベントを登録します。
     * @param options 
     * @returns 
     */
    install_import_button(options: {
        fc_preview_space: string
        , import_app_id: string
        , import_app_label: string
        , radio_lotguard: string
        , header_handling: string
        , fc_attached: string   // ファイル添付フィールドのフィールドコード
    }): HTMLElement {
        const app_label = options.import_app_label
        const app_id = options.import_app_id

        // リストアイテム: インポート先アプリと添付ファイル名について
        const attached_filenames = FilePreviewer.get_attached_filenames(options.fc_attached)?.map((filename, index)=>{
            let spacer = ' '
            if(index > 0){
                spacer = '  '

            }
            return `${spacer}[${index+1}] ${filename}${spacer}`
        })
        
        // インポートファイルの数
        const badge_files = ((files)=>{
            if(files == undefined){
                return ''
            }
            return `${files.length}`
        })(attached_filenames)
        
        // インポートボタン
        const msg_button = `添付ファイルのインポートを実行`
        const node_button = Utils.createElement('button', 'btn btn-warning float-end mt-3', [], msg_button) as HTMLElement
        node_button.setAttribute('type', 'button')
        // node_button.setAttribute('value', msg_button)
        node_button.setAttribute('app_id', app_id)
        node_button.setAttribute('app_label', app_label)
        node_button.appendChild( 
            Utils.createElement('span', 'ms-3 badge rounded-pill bg-danger align-middle', [], badge_files)
        )

        // アプリ名称とリンク
        const msg_app_link = `${app_label}(id: ${app_id})`
        const node_link = Utils.createElement('a', '', [], msg_app_link)
        node_link.setAttribute('href', Utils.get_application_url(app_id) )
        node_link.setAttribute('target', '_blank')

        const classes_list_group_item = 'list-group-item'
        const li_msg_app_and_file = Utils.createElement('li', classes_list_group_item, [
            Utils.createElement('h5', 'mb-1', [], '添付ファイルとインポート先アプリ')
            , Utils.createElement('div', 'text-wrap', [], `添付ファイル ${attached_filenames} がインポート対象です。`)
            , Utils.createElement('div', '', [
                node_link.cloneNode(true) as HTMLAnchorElement
                , Utils.createElement('span', '', [], 'にインポートします。')
            ])
        ])

        // リストアイテム: インポート方式について
        const li_msg_handling = Utils.createElement('li', classes_list_group_item, [
            Utils.createElement('h5', 'mb-1', [], 'インポート方式')
            , Utils.createElement('div', '', [], `[${options.header_handling}一致]方式でインポートします。`)
            , Utils.createElement('div', '', [], `CSVの1行目を${options.header_handling}とみなします。`)
            , Utils.createElement('div', '', [
                node_link.cloneNode(true) as HTMLAnchorElement
                , Utils.createElement('span', '', [], `に対し、${options.header_handling}が一致するフィールドにインポートします。`)
            ])
        ])

        // リストアイテム: ロットガードについて
        const li_msg_lotguard = ((flag: boolean)=>{
            let msgs: string[]
            if(flag){
                msgs = [
                    'ロットガードが有効です。'
                    ,'csvのうちインポート先アプリにすでに存在するレコードはインポートしません。'
                ]
            }
            else{
                msgs = [
                    'ロットガードは無効です。'
                    , '重複登録に注意してインポートを実行してください。'
                ]
            }
            return Utils.createElement('li', classes_list_group_item, [
                Utils.createElement('h5', 'mb-1', [], 'ロットガードについて')
                , Utils.createElement('div', '', [], `${msgs[0]}`)
                , Utils.createElement('div', '', [], `${msgs[1]}`)
            ])
        })(ConstantsUtils.isEnableLotguard(options.radio_lotguard))

        const node_list = Utils.createElement('ul', 'list-group mw-50', [
            li_msg_app_and_file
            , li_msg_handling
            , li_msg_lotguard
        ])

        const node_parts = Utils.createElement('div', '', [
            node_list
            , node_button
        ])

        const space = kintone.app.record.getSpaceElement(options.fc_preview_space)
        if(space){
            space.appendChild(node_parts)
        }
        else{
            const errmsg = `[${Constants.PLUGIN_NAME}] ボタン設置先のスペーサー要素が見つかりません。(${options.fc_preview_space})`
            console.error(errmsg)
            throw new Error(errmsg)
        }

        return node_button
    }

}