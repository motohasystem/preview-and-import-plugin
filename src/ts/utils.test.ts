// ユーティリティモジュール
import { EasyCsv, Utils } from "./utils"

test('test is not empty string', () => {
    let act: boolean
    let exact: string | undefined | null | string[]

    exact = ''
    act = Utils.is_not_empty_string(exact)
    expect(act).toBeFalsy()

    exact = undefined
    act = Utils.is_not_empty_string(exact)
    expect(act).toBeFalsy()

    exact = null
    act = Utils.is_not_empty_string(exact)
    expect(act).toBeFalsy()

    exact = []
    act = Utils.is_not_empty_string(exact)
    expect(act).toBeFalsy()

    exact = '0'
    act = Utils.is_not_empty_string(exact)
    expect(act).toBeTruthy()

});

test('test is empty string', () => {
    let act: boolean
    let exact: string | undefined | null | string[]

    exact = ''
    act = Utils.is_empty_string(exact)
    expect(act).toBeTruthy()

    exact = undefined
    act = Utils.is_empty_string(exact)
    expect(act).toBeTruthy()

    exact = null
    act = Utils.is_empty_string(exact)
    expect(act).toBeTruthy()

    exact = []
    act = Utils.is_empty_string(exact)
    expect(act).toBeTruthy()

    exact = '0'
    act = Utils.is_empty_string(exact)
    expect(act).toBeFalsy()

});

test('test parse csv string', () => {
    let act: string
    let exp: string | undefined | null | string[]

    const target = `index,住所（漢字）,メモ,日付,ビル名,住所（ふりがな）,num_lotnumber
1,神山　花子,"共通書式用のテスト
休まずスクワット。",2022-03-02,共通書式用のテスト,かみやま　はなこ,20220316035226681530
2,酢橘　実子,"共通書式用のテスト
休まずスクワット。レク等に参加。",2022-03-02,共通書式用のテスト,すたちばな　みこ,20220316035226681530
3,一二三　１２３,"共通書式用のテスト
4/9,16スクワット。",2022-03-02,共通書式用のテスト,ひふみ　ひふみ,20220316035226681530
`

    const csv = new EasyCsv()

    csv.parse(target)
    expect(3).toEqual(csv.max_y)
    expect(6).toEqual(csv.max_x)

    exp = 'index'
    act = csv.get(0, 0)
    expect(exp).toEqual(act)

    exp = '住所（漢字）'
    act = csv.get(1, 0)
    expect(exp).toEqual(act)

    exp = '20220316035226681530'
    act = csv.get(6, 1)
    expect(exp).toEqual(act)

    const transposed = csv.transposed_rows()
    exp = 'index'
    act = transposed[0][0]
    expect(exp).toEqual(act)

    exp = '住所（漢字）'
    act = transposed[1][0]
    expect(exp).toEqual(act)

    exp = '20220316035226681530'
    act = transposed[6][3]
    expect(exp).toEqual(act)
});

test('test last line of csv', () => {
    const target = `index,住所（漢字）,メモ,日付,ビル名,住所（ふりがな）,num_lotnumber
1,神山　花子,"共通書式用のテスト
あいうえおかきくけこ。",2022-03-02,共通書式用のテスト,かみやま　はなこ,20220316035226681530
2,酢橘　実子,"共通書式用のテスト
あいう さしすせそ。レク等に参加。",2022-03-02,共通書式用のテスト,すたちばな　みこ,20220316035226681530
3,一二三　１２３,"共通書式用のテスト
4/9,16 さしすせそ。",2022-03-02,共通書式用のテスト,ひふみ　ひふみ,20220316035226681530`

    const csv = new EasyCsv()

    csv.parse(target)
    expect(3).toEqual(csv.max_y)
    expect(6).toEqual(csv.max_x)

});