
// CSVインポート判定のヘッダー一致判定に関する定義
export enum HeaderHandlingField {
    NAME = 'フィールド名'
    , CODE = 'フィールドコード'
}

// ロットガードの実行に関する定義
export enum LotGuardOption {
    ON = 'on'
    , OFF = 'off'
}

export enum PreviewStyle {
    PLAINTEXT = 'plaintext'
    , CSV = 'csv'
}


// 定数定義
export class Constants {
    static readonly PLUGIN_NAME: string = 'Preview & Import Plugin'
    static readonly DEFAULT_OPTION: string = '----'      // 未選択状態を表す文字列
    static LAYOUT_PARTS: string[] = ["SPACER"]  // kintoneアプリのレイアウト情報から取得するフィールドタイプ
}

// 定数の判定関数を実装する
export class ConstantsUtils {

    /**
     * LotGuardOptionsに対応した文字列を渡すとtrue / falseが返る
     * @param label LotGuardOptionsに定義したいずれかの文字列
     * @returns 
     */
    static isEnableLotguard(label: string){
        if(label == LotGuardOption.ON){
            return true
        }
        else if (label == LotGuardOption.OFF){
            return false
        }

        throw new Error(`isEnableLotguard(): 想定外の文字列 [${label}] が渡されました。プラグイン設定を保存し直すことで修正される可能性があります。`)
    }

    static toHeaderHandling(label: string): HeaderHandlingField | undefined {
        if(label == undefined){
            return undefined
        }
        
        if(label == HeaderHandlingField.CODE){
            return HeaderHandlingField.CODE
        }
        else if(label == HeaderHandlingField.NAME){
            return HeaderHandlingField.NAME
        }

        throw new Error(`toHeaderHandling(): 想定外の文字列 [${label}] が渡されました。プラグイン設定を保存し直すことで修正される可能性があります。`)
    }
}
