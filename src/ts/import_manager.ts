import axios from "axios";
import { EasyCsv, Utils } from "./utils";
import { KintoneRestAPIClient } from "@kintone/rest-api-client"
import { Properties } from "@kintone/rest-api-client/lib/client/types"
import { Constants, ConstantsUtils, HeaderHandlingField } from "./constants";
import Encoding from "encoding-japanese";
import { Buffer } from 'buffer';

export class ImportManager {
    app_id: string;
    header_handling: HeaderHandlingField | undefined;   // HeaderHandlingField.NAME or HeaderHandlingField.CODE
    lotguard: boolean;  // true: ロットガードを行う false: 行わない
    guard_field: string;    // ロットガードの判定に使用するフィールド
    // fc_import_result: string;   // インポート結果を書き込む複数行テキストのフィールドコード

    // client: KintoneRestAPIClient;
    app_info: {
        properties: Properties;
        revision: string;
    } | undefined;

    constructor(app_id: string, header_handling: string, lotguard: boolean, guard_field: string){
        this.app_id = app_id
        this.header_handling = ConstantsUtils.toHeaderHandling(header_handling)
        this.lotguard = lotguard
        this.guard_field = guard_field
        // this.fc_import_result = fc_import_result
    }

    /**
     * 指定した添付ファイルフィールドに添付されているすべてのファイルをインポート処理する
     * @param fc_attached csvファイルを取得するフィールドコード
     */
    async import_all(fc_attached: string){

        const field = kintone.app.record.getFieldElement(fc_attached)
        if(field == null){
            return
        }

        const files = field.getElementsByClassName("file-image-container-gaia")
    
        let total_count = 0
        for(const file of files){
            const anchor = file.querySelector('a')
            if(anchor == null){
                return
            }
            // インポートする順番を保証したいのでawait
            const import_count = await this.import(anchor.href, anchor.innerText)
            total_count += import_count
        }
        
        let msg;
        if(total_count == 0){
            if(this.lotguard){
                msg = 'ロットガードフィルタによってインポート対象レコードがゼロ件となりました。'
            }
            else {
                msg = 'インポート対象レコードがcsvにありません。'
            }
        }
        else{
            msg = `${files.length}件のcsvファイルから、合計${total_count}件のレコードをアプリ${this.app_id}にインポートしました。`
        }
        alert(msg)
    }

    // 添付ファイルのURLを指定して、指定したアプリにインポートする
    async import(url: string, filename: string = ""){
        const csv = new EasyCsv()
        const client = new KintoneRestAPIClient()

        // 添付ファイルをストリームで取得
        const resp_attached = await axios.get(
            url
            , {
                responseType: 'arraybuffer',
                transformResponse: (data) => {  // streamで取得して変換
                    const bin = Buffer.from(data, 'binary');
                    const encoding = Encoding.detect(bin)
                    if(encoding != 'UNICODE'){
                        console.info(`文字コード[ ${encoding} ]の添付ファイルをUNICODEに変換してインポートします。`)
                    }
                    const utf8 = Encoding.convert(bin, 'UNICODE')
                    return utf8;
                }
            }
        ).catch((err)=>{
            const msg = `添付ファイルの取得でエラーが発生しました。(${url} / ${err})`
            console.error(msg)
            throw new Error(msg)
        })
        const converted = Encoding.codeToString(resp_attached.data)
        csv.parse(converted)

        // インポート先アプリのフィールド情報を取得
        const params_fields = { // リクエストパラメータの設定
            app: this.app_id,
        };
        const resp_fields = await client.app.getFormFields(params_fields).catch((err)=>{
            const msg = `アプリ情報の取得でエラーが発生しました。(appid: ${this.app_id} / ${err})`
            console.error(msg)
            throw new Error(msg)
        })

        // ロットガードが有効な場合、インポート先アプリの対象フィールド値をユニークで取得する
        const guard_values = await this.get_uniq_values(client, this.lotguard, this.guard_field, this.app_id)
        
        
        // 外部アプリへのインポート用の配列を構築
        const props = resp_fields.properties
        const import_records = this.compose_import_records(csv.content, props, this.header_handling, guard_values, this.guard_field)

        // フィルタ結果がゼロ件以上であればインポートを実行する
        if(import_records.length > 0){
            const params_addall = {
                app: this.app_id
                , records: import_records
            }
            // https://github.com/kintone/js-sdk/blob/master/packages/rest-api-client/docs/record.md#addAllRecords
            await client.record.addAllRecords(params_addall).catch((err)=>{
                const msg = ((filename) => {
                    let msg_file = ""
                    if(filename != "") {
                        msg_file = `ファイル[${filename}]のレコード`
                    }
                    return `アプリ(id:${this.app_id})に対する${msg_file}登録でエラーが発生しました。`
                })(filename)
                const whole_errors = Utils.retrieve_errors(err, 5)
                // console.error(whole_errors)
                if(whole_errors == undefined){
                    throw new Error(msg)
                }
                else {
                    whole_errors.unshift(`${msg}`)
                    throw new Error(whole_errors.join('\n'))
                }
            })
        }

        return import_records.length
    }

    /**
     * 外部アプリの指定したフィールドについて、ユニークしたフィールド値を取得する
     * @param client 
     * @param flag 
     * @param field 
     * @param app_id 
     * @returns 
     */
    async get_uniq_values(client: KintoneRestAPIClient, flag: boolean, field: string, app_id: string){
        if(!flag){
            return undefined
        }
        
        const params_guard_values = { // リクエストパラメータの設定
            app: app_id,
            fields: [field]
        };
        const resp_guard_values = await client.record.getAllRecordsWithId(params_guard_values)
        const uniq_values = resp_guard_values.reduce((fields:Set<string>, curr)=>{
            const curr_value = curr[this.guard_field].value as string
            if(curr_value != ""){
                fields.add(curr_value)
            }
            return fields
        }, new Set<string>())

        return uniq_values
    }

    // 
    /**
     * APIに渡す追加レコード情報を構築する
     * @param rows csvから読み込んだレコード
     * @param props インポート先アプリのフィールド情報
     * @param header_handling csvヘッダをフィールド名として扱うかフィールドコードとして扱うか
     * @param guard_values ロットガード対象のユニーク値、undefinedの場合はロットガードを行わない
     * @param guard_field インポート先アプリのロットガード対象フィールドコード
     * @returns 
     */
    compose_import_records(rows: string[][]
        , props: Properties
        , header_handling: HeaderHandlingField | undefined
        , guard_values: Set<string> | undefined
        , guard_field: string
    ): 
    { [fieldCode: string]: {
        value: string;
    };
    }[]{
        let dict_rows = this.convert_dict(rows)

        // csvのヘッダがフィールド名のとき、ここでフィールドコードに置換する
        if(header_handling == undefined){
            const msg = `[${Constants.PLUGIN_NAME}] csvのヘッダ情報が設定されていません。${header_handling}`
            console.warn(msg)
            throw new Error(msg)
        }
        else if(header_handling == HeaderHandlingField.NAME){
            dict_rows = this.replace_name_to_code(dict_rows, props)
        }
        
        const records = dict_rows.map((record: {
            [key: string]: string;
        })=>{
            const fields: {
                [key: string]: {
                    value: string
                };
            } = {}

            Object.entries(record).forEach(([key, value])=>{
                fields[key] = {
                    value: value
                }
            })

            return fields
        })

        // ロットガード
        if(guard_values){
            if(!(guard_field in records[0])){
                const guard_fieldname = ((fields, code)=>{  // フィールドコードから、対象アプリのフィールド名を取得
                    const field = Object.entries(fields).find((field)=>{
                        return field[0] == code
                    })
                    if(field){
                        return field[1].label
                    }
                })(props, guard_field)
                const msg = `[ERROR] ロットガードの設定またはcsvのいずれかを見直してください。\n\nインポート先アプリの『フィールド名: [${guard_fieldname}] / フィールドコード: [${guard_field}]』と対応するカラムがcsvにありません。`
                // msg += `\nインポート方式の設定は[ ${header_handling} ]一致方式で間違いありませんか？`

                console.error(msg)
                throw new Error(msg)
            }

            return records.filter((record)=>{
                const evaluand = record[guard_field].value
                return !guard_values.has(evaluand)
            })
        }
        return records

    }

    // csvの1行目をヘッダ行として辞書配列化する
    convert_dict(rows: string[][]): {
        [key: string]: string;
    }[]{
        const csv_headers = rows.shift()
        if(csv_headers == undefined){
            throw new Error('convert_dict(): csvが空です')
        }

        const records = rows.map((row: string[])=>{
            const fields: {[key:string]: string} = {}

            for(let i = 0; i <= row.length; i++){
                const key = csv_headers[i]
                fields[ key ] = row[i]
            }
            return fields
        })

        return records
    }

    /**
     * フィールド名指定の辞書配列を、フィールドコード指定の辞書配列にキーのみ差し替える
     * @param dict_rows csvを変換した辞書配列化
     * @param props インポート先アプリのフィールド情報
     */
    replace_name_to_code(dict_rows: {
        [key:string]: string;
    }[], props: Properties): {[key:string]: string}[] {

        const dict_props: {[label: string]: string} = {}
        Object.values(props).forEach((obj)=>{
            dict_props[obj.label] = obj.code
        })

        const code_dict_rows = dict_rows.map((row)=>{
            const coded_row: {[fieldcode:string]: string} = {}
            Object.entries(row).forEach(([label, text])=>{
                const fieldcode = dict_props[label]
                coded_row[fieldcode] = text
            })
            return coded_row
        })
        return code_dict_rows
    }
}