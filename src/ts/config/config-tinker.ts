import { Utils } from "../utils";
import { Constants } from "../constants";
import { FieldType } from "../common";

/**
 * 設定画面の共通処理
 */
export class ConfigUtilities {
    config_form: HTMLFormElement;
    whole_selected_field_codes: string[];

    constructor(config_form: HTMLFormElement){
        this.config_form = config_form

        // フィールドの重複チェック
        this.whole_selected_field_codes = []
    }

    add_selected_field_codes = (code: string) => {
        this.whole_selected_field_codes.push(code)
    }

    // プルダウンで選択済みのフィールドに重複がないかチェックする
    is_overlapped(additional_labels: string[]): boolean {
        return Utils.is_overlapped( this.overlapped(additional_labels) )
    }

    overlapped(additional_labels: string[] | undefined = undefined){
        if(additional_labels != undefined){
            this.whole_selected_field_codes.concat(additional_labels)
        }
        return Utils.overlapped(this.whole_selected_field_codes)
    }

    clear_selected_field_labels() {
        this.whole_selected_field_codes = []
    }

    /**
     * ドロップダウン要素から選択しているフィールドのフィールドコードを取得する
     * @param select_node_id 選択したフィールドのフィールドコード
     * @returns 
     */
     get_selected_fieldcode = (select_node_id: string) => {
        console.log(`[ConfigTinker] get_selected_fieldcode(): ${select_node_id}`)
        const node = document.getElementById(select_node_id) as HTMLSelectElement

        if(node.selectedIndex == -1){   // 選択されていない
            return ''
        }
        else if(node.options[node.selectedIndex].label == Constants.DEFAULT_OPTION){    // デフォルト値（空欄）が選択されている
            return ''
        }

        const code = node.selectedOptions[0].getAttribute('fieldcode')
        if(code == null){
            throw new Error(`ノード[ ${select_node_id} ]はフィールド選択ではありません。`)
        }
        return code
    }

    /**
     * ドロップダウン要素から選択文字列を取得する
     * @param select_node_id ドロップダウンのID
     * @returns 
     */
    get_selected_label = (select_node_id: string) => {
        console.log(`[ConfigTinker] get_selected_label(): ${select_node_id}`)
        const node = document.getElementById(select_node_id) as HTMLSelectElement
        if(node.selectedIndex == -1){
            return ''
        }
        return node.selectedOptions[0].label
    }

        
    /**
     * ラジオボタン要素から選択文字列を取得する
     * @param select_node_id ラジオボタンのName
     * @returns 
     */
    get_selected_radio = (radio_id: string) => {
        const radio_name = `radio-${radio_id}`
        console.log(`[ConfigTinker] get_selected_radio(): ${radio_name}`)
        const nodes = document.getElementsByName(radio_name) as NodeListOf<HTMLInputElement>

        const length = nodes.length
        for (let idx = 0; idx < length; idx++) {
            const node_input = nodes[idx] as HTMLInputElement
            if (node_input.checked == true) {
                return node_input.value
            }
        }

        return ""
    }

    // FieldTypeを受け取って適切な値を返す
    get_selected(node_id: string, field_type: FieldType){
        switch(field_type){
            case FieldType.Dropdown:
                return this.get_selected_label(node_id)
            case FieldType.Radio:
                return this.get_selected_radio(node_id)
            case FieldType.Dropdown_FieldSelect:
                return this.get_selected_fieldcode(node_id)
        }
        throw new Error(`get_selected(): 不明なフィールドタイプが渡されました (field_type: ${field_type})`)
    }


}
