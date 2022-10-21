
export type KintoneRecordItem = {
    'code': string
    , 'label': string
    , 'type': string
}

export type KintoneFieldValue = {
    'value': string
    , 'type': string
}

export type KintoneAppInfo = {
    'appId': string         // アプリID
    , 'name': string        // アプリ名
    , 'description': string // アプリの説明
}

// プルダウン１個分の情報を持つ
export type DropdownData = {
    'code': string
    , 'label': string
    , 'option': string
}


export class Utils {
    /**
     * 重複禁止フィールドだけをピックアップする
     * @param properties fields.jsonのレスポンスのproperties
     * @param with_record_number RECORD_NUMBERフィールドを返すフラグ
     */
    static unique_properties(props: {[code:string]: object}, with_record_number: boolean = false) {
        const results = []

        for(const fieldcode of Object.keys(props)){
            const prop = props[fieldcode] as any
            if(prop.unique == true){
                results.push(prop)
            }
            else if(with_record_number && prop['type'] == 'RECORD_NUMBER'){
                results.push(prop)
            }
        }
        return results
    }

    // 空文字列ではないことをチェックする
    static is_not_empty_string(test_str: string | string[] | undefined | null) {
        return !Utils.is_empty_string(test_str)
    }

    // 空文字列であることをチェックする
    static is_empty_string(test_str: string | string[] | undefined | null) {
        if (test_str == null || test_str == undefined) {
            return true
        }

        if (test_str.length > 0) {
            return false
        }

        return true
    }
    
    // 設定値またはデフォルト値を取得
    static get_from = (dic: {[key: string]: string}, conf_key: string, defaults: string): string => {
        if( dic.hasOwnProperty(conf_key) ){
        return dic[conf_key]
        }
        return defaults
    }

    // ノードを構築して返す
    static createElement = (
        tagName: string,
        className: string = "",
        childElements: HTMLElement[] = [],
        textContent: string = "",
        attrs: { [key: string]: string } | undefined = undefined
    ): HTMLElement => {
        const el = document.createElement(tagName)
        el.className = className
        el.textContent = textContent

        if (childElements.length > 0) {
            childElements.forEach((child) => {
                el.appendChild(child)
            })
        }

        // 属性値をセット
        if (attrs) {
            Object.entries(attrs).forEach(([key, value]) => {
                el.setAttribute(key, value)
            })
        }
        return el
    }

    // shotcut for createElement
    static ce = (
        t: string,
        c: string = "",
        ce: HTMLElement[] = [],
        tc: string = "",
        at: { [key: string]: string } | undefined = undefined
    ): HTMLElement => {
        return this.createElement(t, c, ce, tc, at)
    }


    /**
     * テキストだけを持ったDIV要素を構築して返す
     * @param msg innerText
     * @returns 
     */
    static simpleDiv = (msg: string): HTMLDivElement =>{
        return Utils.createElement('div', '',[], msg) as HTMLDivElement
    }

    // 配列のうち、重複したものがあればTrueを返す
    static is_overlapped = ( list: any[]) => {
        const overlapped = Utils.overlapped(list)

        if(overlapped.length > 0){
            return true
        }
        return false
    }

    // 配列のうち、重複したものをUniqして返す
    static overlapped = (list:any[]) =>{
        const overlapped = list.filter( (x, _i, self)=> {
            return self.indexOf(x) !== self.lastIndexOf(x)
        })

        return Array.from(new Set(overlapped))

    }

    // 現在開いているkintoneドメインのうち指定した番号のアプリのURLを構築して返す
    static get_application_url(appid: string): string{
        return `${location.protocol}//${location.host}/k/${appid}`
    }


    // kintone clientのエラーを受け取ってメッセージを抽出し、文字列配列の形で返す
    static retrieve_errors(error: any, max_msgs: number = -1): string[] | undefined{
        const errors = error?.error?.errors
        if(errors == undefined){
            return undefined
        }

        // メッセージの構築
        let whole_errors: string[] = []
        Object.keys(errors).forEach((field)=>{
            const msgs = errors[field].messages
            const comments = msgs.map((msg: string)=>{
                return `[${field}] ${msg}`
            })
            whole_errors = whole_errors.concat(comments)
        })

        // ソート
        whole_errors.sort()

        // エラーレコードの件数が多い場合に省略
        if(max_msgs >= 0 && max_msgs < whole_errors.length){
            const remain_msgs = whole_errors.length - max_msgs
            whole_errors = whole_errors.splice(0, max_msgs)
            whole_errors.push(`以下${remain_msgs}件のエラーメッセージを省略しました。`)
        }

        return whole_errors
    }

}

export class EasyCsv {
    content: string[][]
    in_cell: boolean = false
    x: number = 0
    y: number = 0
    max_x: number = -1
    max_y: number = -1

    cell: string = ""

    quotechar: string
    delimiter: string
    newline: string

    constructor(quotechar:string = `"`, delimiter: string = ',', newline: string = "[\r\n]+"){
        this.content = []
        this.content[0]= []

        this.quotechar = quotechar
        this.delimiter = delimiter
        this.newline = newline
    }

    get(x: number, y:number): string{
        if(this.content[y] == undefined || this.content[y][x] == undefined){
            throw new Error(`範囲外の配列が指定されました。(x: ${x} / y: ${y})`)
        }

        return this.content[y][x]
    }
    
    rows(): string[][]{
        return this.content
    }

    // x, yを転置させて返す
    transposed_rows(): string[][]{
        const new_rows: string[][] = []
        let y
        for(y=0; y < this.content.length; y++){
            let x
            for(x=0; x< this.content[y].length; x++){
                if(new_rows[x] == undefined){
                    new_rows[x] = []
                }
                new_rows[x][y] = this.content[y][x]
            }
        }

        return new_rows
    }
    
    add_cell(newline = false){
        if(newline){
            if(this.cell != ""){
                this.content[this.y][this.x] = this.cell
                this.cell = ""
                this.y++
                if(this.y > this.max_y){
                    this.max_y = this.y
                }
            }
    
            this.x = 0
            if(this.content[this.y] == undefined){
                this.content[this.y] = []
            }
        }
        else{
            this.content[this.y][this.x] = this.cell
            this.cell = ""
    
            this.x++
            if(this.x > this.max_x){
                this.max_x = this.x
            }
        }
    }

    add_char(char: string){
        if(char === this.delimiter){
            if(!this.in_cell){
                this.add_cell()
                return
            }
        }

        if(char === this.quotechar){
            if(this.in_cell){
                this.in_cell = false
            }
            else{
                this.in_cell = true
            }
            return
        }

        if(char.search(this.newline) != -1){
            if(!this.in_cell){
                this.add_cell(true)
                return
            }
        }

        this.cell += char
    }
    
    parse(content: string){
        for(let index=0; index < content.length; index++){
            this.add_char( content.charAt(index) )
        }
        if(this.content[this.max_y].length == 0){
            this.content.pop()
            this.max_y -= 1
        }
    }
}
