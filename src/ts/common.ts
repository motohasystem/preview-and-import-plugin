
// 設定フォーム部品について定義する
export enum FieldType {
    Dropdown
    , Dropdown_FieldSelect
    , Radio
    , Text
    , MultilineText
    , Checkbox
}

// 設定項目全体をまとめる辞書
export type KintoneConfigSetting = {[key:string]: SettingItem}

// 個別の設定項目
export type SettingItem = {
    'label': string             // 見出し、設定画面で表示します
    , 'desc': string            // 説明書き、設定画面で表示します
    , 'code': string            // フィールドコード
    , 'type': FieldType         // 項目の形式
    , 'accept': string[]        // 設定値、ドロップダウンの場合は列挙するフィールドタイプを、ラジオボタンとチェックボックスの場合は各項目のラベルを列挙してください
    , 'check_exists': boolean   // デスクトップ側で存在チェックを行う(true)
}

export type SettingValue = string | {} | [] 
