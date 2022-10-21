import axios from "axios";
import { AttachedFileSet } from "./desktop-manager";
import { EasyCsv, Utils } from "./utils";
import Encoding from 'encoding-japanese'
import { Buffer } from 'buffer';
import "../scss/style.scss";
import { PreviewStyle } from "./constants";

// import { parse } from "csv-parse"

/**
 * 添付ファイルのプレビューを表示します。
 */
export class FilePreviewer {

    /**
     * 
     * @param fieldset PreviewSet 添付ファイルフィールドと、プレビュー表示用スペースフィールドのセット
     * @returns 
     */
    static async show(fieldset: AttachedFileSet){
        const infos = FilePreviewer.get_attached_fileinfo(fieldset.fc_attached)
        if(infos == null){
            return
        }

        Array.from(infos).map((info, index)=>{
            const filename = `[${index+1}] ${info.textContent}`
            const anchor = info.querySelector('a')
            if(anchor == null){
                return
            }

            if(fieldset.fc_preview_space == undefined){
                return
            }
            
            const preview_area = kintone.app.record.getSpaceElement(fieldset.fc_preview_space)
            if(preview_area){
                // 添付ファイルをストリームで取得
                axios.get(
                    anchor.href
                    , {
                        responseType: 'arraybuffer',
                        transformResponse: (data) => {  // streamで取得して変換
                            const bin = Buffer.from(data, 'binary');
                            const encoding = Encoding.detect(bin)
                            console.info(`添付ファイルの文字コードは[ ${encoding} ]です。`)
                            const utf8 = Encoding.convert(bin, 'UNICODE')
                            return utf8;
                        }
                    }
                ).then((resp)=>{
                    const converted = Encoding.codeToString(resp.data)
                    if(fieldset.preview_style == PreviewStyle.CSV){
                        FilePreviewer.show_table(preview_area, converted, filename)
                    }
                    else if(fieldset.preview_style == PreviewStyle.PLAINTEXT){
                        FilePreviewer.show_text(preview_area, converted, filename)
                    }
                })
            }
        })
    }

    // プレーンテキストの表示
    static show_text(preview_area: HTMLElement, attached_file: string, filename: string = ""){
        const max_line = 10
        let counter = 0
        let truncated = attached_file.split('\n').filter((_line: string)=>{
            if(counter++ > max_line){
                return false
            }
            return true
        })
        if(counter > max_line){
            truncated.push(`\n\n※ ${max_line}行以上は省略しました。`)
        }

        const preview = Utils.createElement('pre', 'ms-5 p-4 w-75 bg-white text-dark text-truncate', [], truncated.join('\n'))
        preview.style.wordBreak = 'break-all'
        preview.style.whiteSpace = 'pre-wrap'

        const container = Utils.createElement('div', 'min-vw-75', [
            Utils.createElement('div', '', [], `${filename}`)
            , preview
        ])


        preview_area.appendChild(container)
    }

    // csvをテーブル表示
    static show_table(preview_area: HTMLElement, attached_file: string, filename: string = ""){
        const max_preview_count = 5

        const csv = new EasyCsv()
        csv.parse(attached_file)

        // const tbody = document.createElement('tbody')
        const tbody = Utils.createElement('tbody')
    
        let line_count = 0
        const rows = csv.content
        for(const cells of rows){
            // console.log(cells)
            if(line_count > max_preview_count){
                break;
            }
            const row = Utils.createElement('tr', '')
            for(const col of cells){
                let cell
                if(line_count == 0){
                    cell = Utils.createElement('th', 'text-center align-middle')
                }
                else{
                    cell = Utils.createElement('td', 'text-wrap')
                }
                cell.innerText = col
                // cell.style.maxWidth = '50px'


                row.appendChild(cell)
            }
            tbody.appendChild(row)
            line_count++
            console.log(line_count)
        }

        const table = Utils.createElement('div', 'table-responsive-xxl', [
            Utils.createElement('table', 'table table-striped min-vw-75', [tbody])
        ])
        table.style.wordBreak = 'break-all'

        // ファイル概要情報
        const max_rows = csv.max_y
        const el_filename = Utils.createElement('div', 'float-start', [], `${filename}`)
        const el_summary = Utils.createElement('div', 'table-summary', [
            Utils.createElement('span', '', [], `1 - ${max_preview_count} （${max_rows}件中）`)
        ])

        preview_area.appendChild(
            Utils.createElement('div', 'mt-4', [
                el_filename
                , el_summary
                , table
            ])
        )
    }

    /**
     * 添付ファイルフィールドのフィールドコードを渡してファイル情報コレクションを取得する
     * API外のクラス名を使用してファイル名を取得しているため、kintoneのバージョンアップに伴い動作しなくなる可能性があります。
     * @param fieldcode 添付ファイルフィールドのフィールドコード
     * @returns 
     */
    static get_attached_fileinfo(fieldcode: string): HTMLCollectionOf<Element> | null{
        if(fieldcode == undefined){
            return null
        }
        const field = kintone.app.record.getFieldElement(fieldcode)
    
        if(field === null){
            return null
        }
        const files = field.getElementsByClassName("file-image-container-gaia")
        return files
    }

    static get_attached_filenames(fieldcode: string): string[] | null{
        const infos = FilePreviewer.get_attached_fileinfo(fieldcode)
        if(infos == null){
            return null
        }

        return Array.from(infos).map((info)=>{
            return `${info.textContent}`
        })
    }

}

