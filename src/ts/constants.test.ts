import { ConstantsUtils, HeaderHandlingField } from "./constants"

test('test ConstantsUtils', () => {

    let act, exp

    act = ConstantsUtils.isEnableLotguard('on')
    exp = true
    expect(act).toBe(exp)

    act = ConstantsUtils.isEnableLotguard('off')
    exp = false
    expect(act).toBe(exp)

    expect(()=>{
        ConstantsUtils.isEnableLotguard('unknown')
    }).toThrow(Error)


    // HeaderHandlingField
    act = ConstantsUtils.toHeaderHandling(HeaderHandlingField.NAME)
    exp = HeaderHandlingField.NAME
    expect(act).toBe(exp)

    act = ConstantsUtils.toHeaderHandling(HeaderHandlingField.CODE)
    exp = HeaderHandlingField.CODE
    expect(act).toBe(exp)

    expect(()=>{
        ConstantsUtils.toHeaderHandling('unknown')
    }).toThrow(Error)

})
