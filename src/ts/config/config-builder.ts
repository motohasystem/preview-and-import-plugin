import { SettingItem } from "../common"
import { Constants, LotGuardOption } from "../constants"
import { KintoneRecordItem, DropdownData, Utils, KintoneAppInfo } from "../utils"

export type KintoneApiResult_layout = {
    'layout': {
        'type': string
        , 'fields': KintoneApiResult_layout_field[]
        , 'layout': KintoneApiResult_layout_row[]
    }[]
    , 'revision': string
}

export type KintoneApiResult_layout_row = {
    'type': string
    , 'fields': KintoneApiResult_layout_field[]
}

export type KintoneApiResult_layout_child = {
    'code': string
    , 'layout': KintoneApiResult_layout_row[]
    , 'type': string
}

export type KintoneApiResult_layout_field = {
    'elementId': string
    , 'code': string
    , 'label': string
    , 'type': string
    , 'size': {
        'width': string
        , 'height': string
        , 'innerHeight': string
    }
}

/**
 * 設定画面の各要素を構築する
 */
export class ConfigBuilder {
    props: {[key:string]: string} | undefined = undefined
    layout: {[key:string]: KintoneApiResult_layout_field} | undefined = undefined
    config: {[key: string]: string | {} | []} | undefined = undefined
    
    constructor(props: {[key:string]: string}, config: {[key: string]: string | {} | []}){
        this.props = props
        this.config = config
    }
    
    // レイアウト情報を取得する。スペース情報を取るにはここが必要
    async load_layout_info() {
        const layout: KintoneApiResult_layout = await kintone.api(
            '/k/v1/preview/app/form/layout',
            'GET',
            {
                app: kintone.app.getId() 
            }
        )
        console.log(layout)

        // type = 'SPACER' のフィールドだけをピックアップする。他のタイプが必要な場合は適宜追加する。
        const layout_infos = layout.layout.reduce((prev: KintoneApiResult_layout_field[], curr)=>{
            if(curr.type == "GROUP") {
                console.log(`curr: ${curr.type}`)
                const spacers = curr.layout.reduce((row_prev: KintoneApiResult_layout_field[], row_curr)=>{
                    const row_spacers: KintoneApiResult_layout_field[] = row_curr.fields.filter((row_field)=>{
                        console.log(row_field.type)
                        return row_field.type == "SPACER"
                    })
                    row_prev = row_prev.concat(row_spacers)
                    console.log(`row_prev: ${row_prev}`)

                    return row_prev
                }, [])
                prev = prev.concat(spacers)
            }
            else {
                prev = prev.concat(curr.fields.filter((field)=>{
                    return field.type == 'SPACER'
                }))
            }

            return prev
        }, [])

        // 整形
        this.layout = layout_infos.reduce((prev: {[key:string]: KintoneApiResult_layout_field}, curr)=>{
            curr.code = curr.elementId
            curr.label = curr.elementId
            prev[curr.code] = curr
            return prev
        }, {})
        
        console.log(this.layout)
    }

    /**
     * フィールド選択プルダウンの増減テーブルを構築
     * @param fields プルダウンに列挙したい情報の辞書
     * @param saved_rows  CONFに保存したテーブルの行情報の配列
     * @param classname_select_element select要素に付与するクラス名
     * @param table_titles カラム見出し文字列の配列
     * @returns 増減テーブルを格納したtable要素
     */
    static build_plusminus_table(
        fields: {[key: string]: DropdownData}
        , saved_rows: KintoneRecordItem[] | null
        , classname_select_element: string
        , table_titles: string[]
    ) : HTMLElement {
        console.log({saved_rows})
        let table_rows = []
        const spacer_count = table_titles.length - 3
        if(saved_rows == null || Object.keys(saved_rows).length == 0){
            table_rows.push( this.build_table_row(
                fields
                , ''
                , classname_select_element
                , spacer_count
            ))
        }
        else {
            for(const opt of saved_rows){
                const row = this.build_table_row(
                    fields
                    , opt.label
                    , classname_select_element
                    , spacer_count
                )
                table_rows.push(row)
            }
        }

        const elements_th: HTMLElement[] = [];
        table_titles.map((title)=>{
            return ['span', 'title', title]
        }).forEach((el_info)=>{
            const span = Utils.createElement(el_info[0], el_info[1])
            span.textContent = el_info[2]

            const th = Utils.createElement('th', 'kintoneplugin-table-th', [span])
            elements_th.push(th)
        })

        elements_th.push(
            Utils.createElement('th', 'kintoneplugin-table-th-blankspace')
        )

        const tr = Utils.createElement('tr', '', elements_th)
        const thead = Utils.createElement('thead', '', [tr])
        const tbody = Utils.createElement('tbody', '', table_rows)
        const choice_table = Utils.createElement('table', 'kintoneplugin-table', [thead, tbody])

        return choice_table
    }

    // 設定テーブルの1行を構築する
    static build_table_row (
        fields: {[key: string]: DropdownData}
        , label_selected=''
        , classname_select_element: string=''
        , spacer_cols: number = 0
    ): HTMLElement {
        let code_selected = ""
        let type_selected = ""

        const option = Utils.createElement('option', '')
        option.setAttribute('name', 'none')
        option.setAttribute('label', '')
        const select = Utils.createElement('select', `select-kintone-field ${classname_select_element}`, [option])

        // フィールドリストから、プルダウンの選択肢を構築
        for(const code in fields){
            const prop = fields[code]
            
            const item = document.createElement('option')
            item.label = prop.label
            // item.name = prop.name
            item.setAttribute('code', code)
            item.setAttribute('option', prop.option)

            if(item.label == label_selected)
            {
                item.setAttribute('selected', '')
                code_selected = code
                type_selected = prop.option
            }

            select.appendChild(item)
        }

        // ドロップダウンの追加
        const node_dropdown = Utils.createElement('div', '', [
            Utils.createElement('div', "kintoneplugin-select-outer", [
                Utils.createElement('div', 'kintoneplugin-select', [select])
            ])
        ])

        const nodeunit_selected = (selected: string): HTMLElement => {
            const node_input = Utils.createElement('input', 'kintoneplugin-input-text')
            node_input.setAttribute('type', 'text')
            node_input.setAttribute('value', selected)
            node_input.setAttribute('disabled', '')

            return Utils.createElement('td', 'kintoneplugin-table-td-control', [
                Utils.createElement('div', 'kintoneplugin-table-td-control-value', [
                    Utils.createElement('div', 'kintoneplugin-input-outer', [
                        node_input
                    ])
                ])
            ])
        }

        // [+]ボタン
        const node_button_add = ConfigBuilder.create_button_row_add(fields, classname_select_element)

        // [-]ボタン
        const node_button_remove = ConfigBuilder.create_button_row_remove()

        // スペーサー
        const spacers = [...Array(spacer_cols)].map(() => {
            return Utils.createElement('td', 'td_spacer')
        })

        // 一行分を構築
        const tds = [
            Utils.createElement('td', '', [
                Utils.createElement('div', 'kintoneplugin-table-td-control', [
                    Utils.createElement('div', 'kintoneplugin-table-td-control-value', [
                        node_dropdown
                    ])
                ])
            ])
            , nodeunit_selected(type_selected)
            , nodeunit_selected(code_selected)
            , ...spacers
            , Utils.createElement('td', 'kintoneplugin-table-td-operation', [
                node_button_add
                , node_button_remove
            ])
        ]
        const table_row = Utils.createElement('tr', '', tds)

        return table_row

    }


    // 祖父要素を取得する
    static get_grand_tr (target: EventTarget | null) {
        if(target == null){
            throw 'ERROR: nullが渡されたため祖父要素を取得できません'
        }
        const self = target as HTMLElement
        const parent_td = self?.parentNode
        const grand_tr = parent_td?.parentNode
        return grand_tr
    }

    /**
     * プルダウンテーブルの[+]ボタンを生成する
     * @param fields プルダウンの選択肢として並べるフィールド一覧
     * @param classname_select_element 追加する行のプルダウンフィールドに与えるクラス名
     * @returns 
     */
    static create_button_row_add(fields: {[key: string]: DropdownData}, classname_select_element: string): HTMLButtonElement {

        const node_button_add: HTMLButtonElement = document.createElement('button')
        node_button_add.className = 'kintoneplugin-button-add-row-image'
        node_button_add.setAttribute('type', 'button')
        node_button_add.setAttribute('title', 'Add row')
        node_button_add.addEventListener('click', (event)=>{
            // テーブルを一行追加する
            console.log(`テーブルを一行追加する${event}`)
            const grand_tr = ConfigBuilder.get_grand_tr(event.target) as HTMLTableRowElement
            const ancestor_tbody = grand_tr?.parentNode
            // const ancestor_tbody = self.closest('tbody')
            if(grand_tr == null || ancestor_tbody == null){
                throw 'ERROR: 祖先のtbodyを取得できませんでした。'
            }

            const target = event?.target as HTMLTableElement
            if(target == null){
                return
            }
            const spacer_count = grand_tr.children.length - 1 - 3   // 列数 - プラマイボタン - デフォルト列数

            const add_elem = ConfigBuilder.build_table_row(fields, "", classname_select_element, spacer_count)
            const select_set = add_elem.getElementsByClassName(classname_select_element) as HTMLCollectionOf<HTMLSelectElement>
            ConfigBuilder.addOnChangeEvent(select_set)
            ancestor_tbody.insertBefore(add_elem, grand_tr.nextElementSibling)

        })

        return node_button_add
    }

    // プルダウンテーブルの[-]ボタンを生成する
    static create_button_row_remove(): HTMLButtonElement {
        const node_button_remove: HTMLButtonElement = document.createElement('button')
        node_button_remove.className = 'kintoneplugin-button-remove-row-image'
        node_button_remove.setAttribute('type', 'button')
        node_button_remove.setAttribute('title', 'Delete this row')
        node_button_remove.addEventListener('click', (event)=>{
            const grand_tr = ConfigBuilder.get_grand_tr(event.target) as HTMLTableRowElement
            if(grand_tr.parentNode?.childNodes.length == 1){
                return
            }
            grand_tr.parentNode?.removeChild(grand_tr)

            // テーブルを一行削除する
            console.log(`テーブルを一行削除する${event}`)
        })

        return node_button_remove
    }



    /**
     * fields APIの返り値を使ってフィールド部品の一覧を構築する
     * @param props props resp.properties を渡す
     * @param accept_types リストにしたいフィールドタイプの配列を渡す。ex. ['SINGLE_LINE_TEXT', 'LINK']
     * @returns 
     */
    static get_formparts(props: any, accept_types: string[] = []): {[code:string]: DropdownData} {
        const lists: { [key: string]: DropdownData} = {}
        for (const key in props) {
            if (!props.hasOwnProperty(key)) {continue;}
            const prop = props[key];
            const label: string = prop.label;
            const code: string = prop.code;
            const type: string = prop.type;

            if(accept_types.includes(type)){
                lists[code] = { 
                    'code': code,
                    'label': label,
                    'option': type
                }
            }
        }

        const array = Object.keys(lists).map((k)=>({
            key:k, value: lists[k]
        }));

        // フィールドラベルでソート
        const sorted = array.sort((a, b)=> {
            const str_a = a.value.label.toString().toLowerCase();
            const str_b = b.value.label.toString().toLowerCase();
            if(str_a < str_b)
            return -1;
            else if(a > b)
            return 1;
            return 0;
        })

        const sorted_dic: {[key: string]: DropdownData} = Object.assign({}, ...sorted.map((item)=>({
            [item.key]: item.value,
        })));

        return sorted_dic
    }

    // 設定テーブルの行に対して、プルダウン変更で発火するChangeイベントを追加する
    static addOnChangeEvent(select_set: HTMLCollectionOf<HTMLSelectElement>){
        for(const select of select_set){
            select.addEventListener('change', (event) => {
                const target = event.target as HTMLSelectElement
                if(target == null){
                    return
                }

                const selected = target[target.selectedIndex]
                
                // const label = selected.label
                let option = selected.getAttribute('option')
                if( option == null){
                    option = ""
                }

                let code = selected.getAttribute('code')
                if( code == null){
                    code = ""
                }

                const ancestor = target.closest('tr')    // 祖先TR要素
                console.log(ancestor)
                if(ancestor == null){
                    return
                }
                const inputs = ancestor.getElementsByTagName('input')
                inputs[0].value = option
                inputs[1].value = code
            })
        }
    }


    /**
     * フィールド選択ドロップダウンを構築する
     * @param props fields.jsonのレスポンスのproperties
     * @param accepts 列挙対象とするフィールドタイプ
     * @param selected_fieldcode 選択済みとしたいフィールドコード（省略可）
     * @param selected_node_id ドロップダウンのノードID（省略可）
     * @param empty_label 空の選択肢を追加する場合はラベル文字列を指定する nullのときは追加しない
     * @returns 
     */
    static build_fields_dropdown(
        props: any
        , accepts: string[]
        , selected_fieldcode: string = ""
        , selected_node_id = ""
        , empty_label: string | null = null
    ){
        const parts = ConfigBuilder.get_formparts(props, accepts)
        const field_dropdown = Utils.createElement('select', 'select-kintone-field') as HTMLSelectElement
        field_dropdown.id = selected_node_id

        if(empty_label != null){
            const empty_item = Utils.createElement('option') as HTMLOptionElement
            empty_item.label = empty_label
            field_dropdown.appendChild(empty_item)
        }

        for(const code in parts){
            const prop = parts[code]
            const item = Utils.createElement('option') as HTMLOptionElement
            item.setAttribute('fieldcode', code)
            item.label = prop.label
            if(code == selected_fieldcode){
                item.setAttribute('selected', '')
            }
            field_dropdown.appendChild(item)
        }

        return Utils.createElement('div', '', [
            Utils.createElement('div', "kintoneplugin-select-outer", [
                Utils.createElement('div', 'kintoneplugin-select', [field_dropdown])
            ])
        ])
        
    }

    /**
     * fields.json APIを呼び出して、別アプリのフィールド選択ドロップダウンを構築する
     * @param app_id 別アプリのアプリID
     * @param accepts 列挙対象とするフィールドタイプ
     * @param selected_label 選択済みとしたいフィールドラベル（省略可）
     * @param selected_node_id ドロップダウンのノードID（省略可）
     * @param empty_label 空の選択肢を追加する場合はラベル文字列を指定する nullのときは追加しない
     * @returns 
     */
    static async build_fields_dropdown_other_app(
        app_id: string | undefined
        , accepts: string[]
        , selected_label: string = ""
        , selected_node_id = ""
        , empty_label: string | null = null
    ){

        // app_idが未指定の場合は空のドロップダウンを配置する
        if(app_id == undefined || app_id == Constants.DEFAULT_OPTION){
            const empty_dropdown = Utils.createElement('select', 'select-kintone-field') as HTMLSelectElement
            empty_dropdown.id = selected_node_id
    
            if(empty_label != null){
                const empty_item = Utils.createElement('option') as HTMLOptionElement
                empty_item.label = empty_label
                empty_dropdown.appendChild(empty_item)
            }

            return Utils.createElement('div', '', [
                Utils.createElement('div', "kintoneplugin-select-outer", [
                    Utils.createElement('div', 'kintoneplugin-select', [empty_dropdown])
                ])
            ])
        }

        const resp_fields = await kintone.api(
            '/k/v1/app/form/fields',
            'GET',
            {
                app: parseInt(app_id)
            }
        )
        
        return this.build_fields_dropdown(
                resp_fields.properties
                , accepts
                , selected_label
                , selected_node_id
                , empty_label
        )
    }

    /**
     * 指定したノードを子ノードとして、タイトルとコメントを付与したブロックを構築する
     * @param main_node 修飾したいパーツを含むノード
     * @param title ブロックにつけるタイトル文字列
     * @param comment ブロックにつけるコメント文字列
     * @param block_class ブロックのクラスを指定する（省略可）
     * @returns 
     */
    static make_parts_block(
        main_node:HTMLElement
        , title:string
        , comment: string
        , block_class: string = ""
    ){
        const comment_node = Utils.createElement('div')
        comment_node.textContent = comment
        comment_node.classList.add('mb-1')
        const caption_node = Utils.createElement('div', 'h5', [])
        caption_node.textContent = title
        const block = Utils.createElement('div', block_class, [
            caption_node
            , comment_node
            , main_node
        ])
        block.classList.add('ms-4')
        block.classList.add('mt-2')
        return block
    }

    // テーブルセル内にドロップダウンを追加し、ドロップダウンの選択結果をテーブル行内の別セルに書き込む
    static addFieldSelectEvent(parent_dropdown: HTMLElement, parent_fieldcode: HTMLElement, appid: string, selected_fieldcode: string | undefined = undefined) {
        
        kintone.api(
            '/k/v1/app/form/fields',
            'GET',
            {
                app: appid
            }
        ).then((resp_fields: any)=>{

            const fields = Object.keys(resp_fields.properties).map((prop)=>{
                return resp_fields.properties[prop]
            })

            // テーブル業内ドロップダウン（子）の選択肢
            const single_line_items: HTMLOptionElement[] = fields.filter((prop: KintoneRecordItem)=>{
                return prop.type == 'SINGLE_LINE_TEXT'
            }).map((field: KintoneRecordItem)=>{
                return {
                    'code': field.code
                    , 'label': field.label
                    , 'option': field.type
                }
            }).map((dd_item: DropdownData)=>{
                const item = Utils.createElement('option', '') as HTMLOptionElement
                item.label = dd_item.label
                item.setAttribute('code', dd_item.code)
                item.setAttribute('option', dd_item.option)
                if(dd_item.code == selected_fieldcode){
                    item.setAttribute('selected', '')
                }
                return item
            })
            
            // テーブル行内ドロップダウン（子）とその選択イベント
            const select = Utils.createElement('select', `select-kintone-field`, single_line_items) as HTMLSelectElement
            select.addEventListener('change', (event)=>{
                console.log({event})
                const target = event.target as HTMLSelectElement
                if(target == null){
                    return
                }

                const selected = target[target.selectedIndex] as HTMLOptionElement
                const td_fieldcode = make_fieldcode_cell(selected)
                parent_fieldcode.firstChild?.remove()
                parent_fieldcode.appendChild(td_fieldcode)
            })

            // SELECTEDなOption要素を受け取って、対応するattributeのinput要素を構築する
            const make_fieldcode_cell = (selected: HTMLOptionElement | null) => {
                let fieldcode;
                if(selected){
                    fieldcode = selected.getAttribute('code')
                    if(fieldcode == null){
                        fieldcode = ""
                    }
                }
                else{
                    fieldcode = ""
                }

                const node_input = Utils.createElement('input', 'kintoneplugin-input-text', [])
                node_input.setAttribute('value', fieldcode)
                node_input.setAttribute('disabled', '')

                const el_td = Utils.createElement('td', 'kintoneplugin-table-td-control', [
                    Utils.createElement('div', 'kintoneplugin-table-td-control-value', [
                        Utils.createElement('div', 'kintoneplugin-input-outer', [
                            node_input
                        ])
                    ])
                ])
                return el_td
            }

            // ドロップダウンの追加
            const node_dropdown = Utils.createElement('div', 'kintoneplugin-table-td-control-value', [
                Utils.createElement('div', "kintoneplugin-select-outer", [
                    Utils.createElement('div', 'kintoneplugin-select', [select])
                ])
            ])

            parent_dropdown.firstChild?.remove()
            parent_dropdown.appendChild(node_dropdown)

            // 追加したドロップダウンに対応するフィールドコードを4列目に書き込む
            parent_fieldcode.firstChild?.remove()

            const selected = select.item(select.selectedIndex)
            const td_fieldcode = make_fieldcode_cell(selected)
            parent_fieldcode.appendChild(td_fieldcode)
            
        })

    }

    // ラジオボタンを選択したときに発火するイベントを登録する
    static set_switch_event(
        node_radio: HTMLElement
        , event_type: string
        , callback_object: {
            pattern: string[]
            handleEvent: (e: Event) => void
        }
    ){
        const input_radios = node_radio.querySelectorAll('input[type="radio"]')
        input_radios.forEach((input)=>{
            input.addEventListener(event_type, callback_object)
        })
    }

    // ラジオボタンを構築する
    make_radio_block(
        input_field: SettingItem
        , block_class: string = ""
    ){
        if(this.config == undefined || this.props == undefined){
            throw new Error('インスタンスが初期化されていません')
        }

        const fieldcode = input_field.code
        const saved_string = this.config[fieldcode] as string
        
        const el_options = input_field.accept.map((label)=>{
            const id = `radio-${fieldcode}-${label}`
            const name = `radio-${fieldcode}`

            const el_radio = Utils.createElement('input')
            el_radio.setAttribute('type', 'radio')
            el_radio.setAttribute('name', name)
            el_radio.setAttribute('value', label)
            el_radio.setAttribute('id', id)
            if(label == saved_string){
                el_radio.setAttribute('checked', 'checked')
            }

            const el_label = Utils.createElement('label', '', [], label)
            el_label.setAttribute('for', id)
            return Utils.createElement('span', 'kintoneplugin-input-radio-item', [el_radio, el_label])
        })

        const el_radio = Utils.createElement('div', 'kintoneplugin-input-radio', el_options)
        el_radio.id = fieldcode

        const node_block = ConfigBuilder.make_parts_block(
            el_radio
            , input_field.label
            , input_field.desc
            , block_class
        )
        return node_block
    }


    /**
     * ドロップダウン形式でフィールドを選択できる設定項目用HTMLノードを構築して返す
     * @param fieldcode フォームに指定するフィールドコード、保存値もこのコードで読み込む
     * @param empty_label 選択肢のデフォルト値を指定する、 nullの場合は選択必須のドロップダウンとなる
     * @param block_class ブロック全体に与えるクラス、省略可
     * @returns 
     */
     make_dropdown_block(
        input_field: SettingItem
        , empty_label: string | null = null
        , block_class: string = ""
    ){

        const form_types: string[] = []
        const layout_types: string[] = []

        input_field.accept.forEach((type)=>{
            if( ConfigBuilder.is_layout_info(type) ){
                layout_types.push(type)
            }
            else{
                form_types.push(type)
            }
        })


        if(this.config == undefined || this.props == undefined){
            throw new Error('インスタンスが初期化されていません')
        }
        if(layout_types.length > 0 && this.layout == undefined){
            throw new Error('レイアウト情報をロードしていません。load_layout_info() を事前に呼び出してください。')
        }
        if(layout_types.length > 0 && form_types.length > 0){
            throw new Error('フォーム情報のフィールドとレイアウト情報のフィールドとが混在したドロップダウンは構築できません。')
        }

        const fieldcode = input_field.code
        const saved_string = this.config[fieldcode] as string

        let node_dropdown
        
        if(form_types.length > 0){ // フォーム情報の取得（通常のフィールド）
            node_dropdown = ConfigBuilder.build_fields_dropdown(
                this.props
                , form_types
                , saved_string
                , fieldcode
                , empty_label)
        }
        else if(layout_types.length > 0){   // レイアウト情報の取得（主にスペーサー）
            node_dropdown = ConfigBuilder.build_fields_dropdown(
                this.layout
                , layout_types
                , saved_string
                , fieldcode
                , empty_label)
        }
        else{
            throw new Error('フォーム情報またはレイアウト情報が空欄で呼び出されました')
        }

        const node_block = ConfigBuilder.make_parts_block(
            node_dropdown
            , input_field.label
            , input_field.desc
            , block_class
        )

        return node_block
    }

    /**
     * レイアウト情報から取得する必要のある情報かどうかを判定する
     */
    static is_layout_info(type: string){
        if(Constants.LAYOUT_PARTS.includes(type)){
            return true
        }

        return false
    }

    static is_includes_layout_info(types: string[]){
        const is_includes = types.reduce((prev, curr)=>{
            if( ConfigBuilder.is_layout_info(curr) ) {
                prev = true
            }
            return prev
        }, false)
        return is_includes
    }
    

    // 変換後のファイルをインポートするアプリを選ぶドロップダウンを構築する
    async build_import_apps_dropdown(
        input_field: SettingItem
        , radio_lotguard_field: SettingItem    // ロットガードラジオボタンのブロック
        , dropdown_fieldcode: SettingItem      // ロットガードの判定をするフィールドコードを選ぶドロップダウン
    ): Promise<HTMLElement>{
        if(this.config == undefined || this.props == undefined){
            throw new Error('インスタンスが初期化されていません')
        }

        // アプリ情報からスペースIDを取得
        const apps: KintoneAppInfo[] = await kintone.api('/k/v1/app','GET', {id: kintone.app.getId() })
        .then((resp_app:any) => {
            const space_id = resp_app.spaceId
            return kintone.api('/k/v1/space', 'GET', {id: space_id})
        })
        .then((resp_space:any)=>{
            const attached_apps = resp_space['attachedApps'] as KintoneAppInfo[]
            console.log({attached_apps})
            return new Promise((resolve)=>{
                return resolve(attached_apps)
            })
        })
        .catch((err:any)=>{
            console.error(`アプリ情報の取得でエラーが発生しました。[${err}]`)
        })
        console.log({apps}) // 同じスペースにあるアプリ情報

        const app_infos: DropdownData[] = apps.map((app: any): DropdownData =>{
            return {
                code: app.appId
                , label: app.name
                , option: app.description
            }
        })

        // ドロップダウンの構築
        const fieldcode = input_field.code
        const selected_label = this.config[fieldcode] as string
        let selected_app_id

        const node_dropdown = ((app_infos, selected_label) => {
            const node_select = Utils.createElement('select', 'select-kintone-field') as HTMLSelectElement
            node_select.id = fieldcode
            app_infos.unshift({
                'code': Constants.DEFAULT_OPTION
                , 'label': Constants.DEFAULT_OPTION
                , 'option': Constants.DEFAULT_OPTION
            })
            app_infos.forEach((app)=>{
                const option = Utils.createElement('option') as HTMLOptionElement
                option.setAttribute('fieldcode', app.code)
                option.label = app.label != Constants.DEFAULT_OPTION ? `${app.label} (id: ${app.code})` : app.label
                if(option.label == selected_label){
                    option.setAttribute('selected', '')
                    selected_app_id = app.code   // 保存された選択済みアプリのID
                }
                node_select.appendChild(option)
            })

            return node_select

        })(app_infos, selected_label)

        // インポート先アプリの選択イベントを受け取って対応フィールドドロップダウンを作り変える
        node_dropdown.addEventListener('change', async function(){
            console.log(this)
            const app_id = this.options[this.selectedIndex].getAttribute('fieldcode')
            if(app_id == null || app_id == Constants.DEFAULT_OPTION){
                return
            }

            const prev_dropdown = document.getElementById(dropdown_fieldcode.code)
            if(prev_dropdown != null){
                const parent = prev_dropdown.parentNode
                if(parent == null){
                    return
                }
                const grand = parent?.parentNode
                grand?.removeChild(parent)
                
                // フィールドコード選択ドロップダウン
                const node_dropdown_lotguard_fieldcode = await ConfigBuilder.build_fields_dropdown_other_app(
                    app_id
                    , dropdown_fieldcode.accept
                    , selected_other_apps_field
                    , dropdown_fieldcode.code
                    , Constants.DEFAULT_OPTION
                )
                grand?.appendChild(node_dropdown_lotguard_fieldcode)
            }

        })


        // 同ロットガード on / off ラジオボタン
        const node_radio_lotguard = this.make_radio_block(
            radio_lotguard_field
            // , radio_lotguard_field.accept
            // , radio_lotguard_field.desc
        )
        ConfigBuilder.set_switch_event(
            node_radio_lotguard
            , 'change'
            , {
                pattern: [LotGuardOption.ON, LotGuardOption.OFF]
                , handleEvent: function(e){
                    const selected = e.currentTarget as HTMLInputElement
                    const evaluation_dropdown = document.getElementById(dropdown_fieldcode.code)
                    if(evaluation_dropdown == null){
                        console.warn(`ロットガード判定フィールドのドロップダウン[${dropdown_fieldcode.code}]が見つかりませんでした。`)
                        return
                    }
                    if(selected.value == this.pattern[0]){  // on
                        evaluation_dropdown.removeAttribute('disabled')
                        evaluation_dropdown.style.color = '#3498db'
                    }
                    else if(selected.value == this.pattern[1]){ // off
                        evaluation_dropdown.setAttribute('disabled', '')
                        evaluation_dropdown.style.color = 'gray'
                    }
                    else{
                        throw new Error(`ラジオボタンの選択肢が想定外の値を示しました。(${selected.value})`)
                    }
                }
            }
        )

        const block_dropdown = Utils.createElement('div', '', [
            Utils.createElement('div', "kintoneplugin-select-outer", [
                    Utils.createElement('div', 'kintoneplugin-select', [node_dropdown])
                ]
            )
        ])

        const blockset_dropdown = ConfigBuilder.make_parts_block(
            block_dropdown
            , input_field.label
            , input_field.desc
            , '' //'float-start me-4'
        )

        const main_block = Utils.createElement('div', 'clearfix',
        [
            blockset_dropdown
            , node_radio_lotguard
        ])

        // ロットガードの判定フィールド選択ドロップダウンを構築する
        const selected_other_apps_field = this.config[dropdown_fieldcode.code] as string

        // フィールドコード選択ドロップダウン
        const node_dropdown_lotguard_fieldcode = await ConfigBuilder.build_fields_dropdown_other_app(
            selected_app_id
            , dropdown_fieldcode.accept
            , selected_other_apps_field
            , dropdown_fieldcode.code
            , Constants.DEFAULT_OPTION
        )

        // 設定画面の表示の時点で、ロットガードがオフのときはドロップダウンをdisabledにする
        const saved_lotguard_flag = this.config[radio_lotguard_field.code] as string
        if(saved_lotguard_flag == LotGuardOption.OFF){
            const dropdown = node_dropdown_lotguard_fieldcode.getElementsByTagName('select')[0]
            dropdown.setAttribute('disabled', '')
            dropdown.style.color = 'gray'
        }
        
        const node_dropdown_lotguard = ConfigBuilder.make_parts_block(
            node_dropdown_lotguard_fieldcode
            , dropdown_fieldcode.label
            , dropdown_fieldcode.desc
            , ''
        )
        
        main_block.appendChild(node_dropdown_lotguard)

        return main_block
    }
}