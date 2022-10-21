/**
 * このクラスでプラグイン全体の設定を行います
 * PluginSettings.input :  設定画面に配置する個々の設定部品を定義します。
 * PluginSettings.layout_inputs() :  設定部品のレイアウトを決めます。
 */

import { Constants, HeaderHandlingField, LotGuardOption, PreviewStyle } from "./constants";
import { Utils } from "./utils";
import { ConfigBuilder } from "./config/config-builder";
import { FieldType, KintoneConfigSetting } from "./common";

export class PluginSettings {
    // 設定項目に関する設定
    static input: KintoneConfigSetting = {
        fc_after_file : {
            'label': '添付ファイル'
            , 'desc': '添付ファイルフィールドを一つ選んでください。'
            , 'code': 'attach_converted'
            , 'type': FieldType.Dropdown_FieldSelect
            , 'accept': ['FILE']
            , 'check_exists': false
        }
        , fc_after_preview : {
            'label': '添付ファイルのプレビュー領域'
            , 'desc': 'スペースを一つ選んでください。未選択状態のときはプレビューを表示しません。'
            , 'code': 'space_preview_converted'
            , 'type': FieldType.Dropdown_FieldSelect
            , 'accept': ['SPACER']
            , 'check_exists': false
        }
        , radio_after_preview : {
            'label': '添付ファイルのプレビュースタイル'
            , 'desc': 'テキスト形式(plaintext)かCSV形式(csv)のいずれかを選んでください'
            , 'code': 'radio_after_preview'
            , 'type': FieldType.Radio
            , 'accept': [PreviewStyle.PLAINTEXT, PreviewStyle.CSV]
            , 'check_exists': false
        }
        , dropdown_import_app : {   // インポート先アプリの指定
            'label': 'インポート先アプリ'
            , 'desc': "添付ファイルをインポートしたいアプリを指定してください"
            , 'code': 'fc_import_app_dropdown'
            , 'type': FieldType.Dropdown
            , 'accept': []
            , 'check_exists': false
        }
        , radio_lotguard : {    // 同ロットガード
            'label': 'ロットガードの有効化'
            , 'desc': "同じロット番号のレコードがすでに存在した場合にインポート対象から除外します"
            , 'code': 'fc_radio_lotguard'
            , 'type': FieldType.Radio
            , 'accept': [LotGuardOption.ON, LotGuardOption.OFF]
            , 'check_exists': false
        }
        , dropdown_lotguard_fieldcode : {    // 同ロットガードの判定に使用するフィールドコード
            'label': 'ロットガードの判定フィールド'
            , 'desc': '同ロット判定のために参照するフィールドを、インポート先アプリの中から指定します。'
            , 'code': 'fc_lotguard_fieldcode_dropdown'
            , 'type': FieldType.Dropdown_FieldSelect
            , 'accept': ['DATE', 'SINGLE_LINE_TEXT', 'NUMBER']
            , 'check_exists': false
        }
        , radio_header_handling : {    // インポート方式（フィールド名 or フィールドコード）
            'label': 'インポート先アプリの対応フィールド判定'
            , 'desc': "CSVのヘッダ行（1行目）がフィールド名とフィールドコードのいずれで構成されているか指定してください"
            , 'code': 'fc_radio_header_handling'
            , 'type': FieldType.Radio
            , 'accept': [HeaderHandlingField.NAME, HeaderHandlingField.CODE]    // ['フィールド名', 'フィールドコード']
            , 'check_exists': false
        }
        , space_import_button : {
            'label': 'インポートボタンの配置スペーサー（スペースフィールド）'
            , 'desc': 'インポートボタンを配置するスペースフィールドを一つ選んでください。'
            , 'code': 'space_import_button'
            , 'type': FieldType.Dropdown_FieldSelect
            , 'accept': ['SPACER']
            , 'check_exists': false
        }

    }

    /**
     * inputの設定を参照して設定画面のレイアウトを構築する
     * @param builder 設定済みのConfigBuilderインスタンス
     * @returns 
     */
    static async layout_inputs(builder: ConfigBuilder): Promise<HTMLElement[]> {
        const input: KintoneConfigSetting = PluginSettings.input

        // 変換後の添付ファイルフィールドコード
        const block_after_file = builder.make_dropdown_block(
            input.fc_after_file
            , Constants.DEFAULT_OPTION
        )

        // 添付ファイルのプレビュー領域
        const block_after_preview = builder.make_dropdown_block(
            input.fc_after_preview
            , Constants.DEFAULT_OPTION
        )

        // 添付ファイルのプレビュースタイル
        const block_radio_after_preview = builder.make_radio_block(
            input.radio_after_preview
        )

        // インポート先アプリの指定、ロットガードラジオボタン、ロットガード判定フィールドコードをまとめて構築
        const blocks_dropdown_import_app = await builder.build_import_apps_dropdown(
            input.dropdown_import_app
            , input.radio_lotguard
            , input.dropdown_lotguard_fieldcode
        )

        // csvのヘッダーをフィールド名として判定するかフィールドコードとして判定するか
        const block_radio_header_handling = builder.make_radio_block(
            input.radio_header_handling
        )

        // インポートボタンを配置するスペーサー
        const block_import_tools = builder.make_dropdown_block(
            input.space_import_button
            , Constants.DEFAULT_OPTION
        )

        const __index__ = (text: string): HTMLElement => Utils.createElement('div', class_heading, [], text)
        const __separator__ = (): HTMLElement => Utils.createElement('div', 'mt-5 bg-info')
        const class_heading = 'display-6 mb-3'

        // 設定画面ではここでreturnする配列の順序通りに項目が並びます。
        return [
            __index__('プレビュー設定')
            , block_after_file
            , block_after_preview
            , block_radio_after_preview
            , __separator__()

            , __index__('インポート設定')
            , blocks_dropdown_import_app
            , __separator__()

            , block_import_tools
            , block_radio_header_handling
            , __separator__()
        ]
    }

    

}