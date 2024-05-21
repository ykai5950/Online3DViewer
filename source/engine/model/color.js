/**
 * RGB色オブジェクト。成分は0から255の整数です。
 */
export class RGBColor {
    /**
     * @param {integer} r 赤の成分。
     * @param {integer} g 緑の成分。
     * @param {integer} b 青の成分。
     */
    constructor(r, g, b) {
        this.r = r;
        this.g = g;
        this.b = b;
    }

    /**
     * 全ての成分の値を設定します。
     * @param {integer} r 赤の成分。
     * @param {integer} g 緑の成分。
     * @param {integer} b 青の成分。
     */
    Set(r, g, b) {
        this.r = r;
        this.g = g;
        this.b = b;
    }

    /**
     * オブジェクトのクローンを作成して返します。
     * @returns {RGBColor} 新しいRGBColorオブジェクト。
     */
    Clone() {
        return new RGBColor(this.r, this.g, this.b);
    }
}

/**
 * RGBA色オブジェクト。成分は0から255の整数です。アルファ成分を含みます。
 */
export class RGBAColor {
    /**
     * @param {integer} r 赤の成分。
     * @param {integer} g 緑の成分。
     * @param {integer} b 青の成分。
     * @param {integer} a アルファの成分。
     */
    constructor(r, g, b, a) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }

    /**
     * 全ての成分の値を設定します。
     * @param {integer} r 赤の成分。
     * @param {integer} g 緑の成分。
     * @param {integer} b 青の成分。
     * @param {integer} a アルファの成分。
     */
    Set(r, g, b, a) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }

    /**
     * オブジェクトのクローンを作成して返します。
     * @returns {RGBAColor} 新しいRGBAColorオブジェクト。
     */
    Clone() {
        return new RGBAColor(this.r, this.g, this.b, this.a);
    }
}

/**
 * 浮動小数点数からカラーコンポーネントへの変換。
 */
export function ColorComponentFromFloat(component) {
    return parseInt(Math.round(component * 255.0), 10);
}

/**
 * カラーコンポーネントから浮動小数点数への変換。
 */
export function ColorComponentToFloat(component) {
    return component / 255.0;
}

/**
 * 浮動小数点数からRGBColorオブジェクトを生成します。
 */
export function RGBColorFromFloatComponents(r, g, b) {
    return new RGBColor(
        ColorComponentFromFloat(r),
        ColorComponentFromFloat(g),
        ColorComponentFromFloat(b)
    );
}

/**
 * SRGBからリニアRGBへの変換。
 */
export function SRGBToLinear(component) {
    if (component < 0.04045) {
        return component * 0.0773993808;
    } else {
        return Math.pow(component * 0.9478672986 + 0.0521327014, 2.4);
    }
}

/**
 * リニアRGBからSRGBへの変換。
 */
export function LinearToSRGB(component) {
    if (component < 0.0031308) {
        return component * 12.92;
    } else {
        return 1.055 * (Math.pow(component, 0.41666)) - 0.055;
    }
}

/**
 * 整数から16進数文字列への変換。
 */
export function IntegerToHexString(intVal) {
    let result = parseInt(intVal, 10).toString(16);
    while (result.length < 2) {
        result = '0' + result;
    }
    return result;
}

/**
 * RGBColorオブジェクトから16進数文字列への変換。
 */
export function RGBColorToHexString(color) {
    let r = IntegerToHexString(color.r);
    let g = IntegerToHexString(color.g);
    let b = IntegerToHexString(color.b);
    return r + g + b;
}

/**
 * RGBAColorオブジェクトから16進数文字列への変換。
 */
export function RGBAColorToHexString(color) {
    let r = IntegerToHexString(color.r);
    let g = IntegerToHexString(color.g);
    let b = IntegerToHexString(color.b);
    let a = IntegerToHexString(color.a);
    return r + g + b + a;
}

/**
 * 16進数文字列からRGBColorオブジェクトへの変換。
 */
export function HexStringToRGBColor(hexString) {
    if (hexString.length !== 6) {
        return null;
    }

    let r = parseInt(hexString.substring(0, 2), 16);
    let g = parseInt(hexString.substring(2, 4), 16);
    let b = parseInt(hexString.substring(4, 6), 16);
    return new RGBColor(r, g, b);
}

/**
 * 16進数文字列からRGBAColorオブジェクトへの変換。
 */
export function HexStringToRGBAColor(hexString) {
    if (hexString.length !== 6 && hexString.length !== 8) {
        return null;
    }

    let r = parseInt(hexString.substring(0, 2), 16);
    let g = parseInt(hexString.substring(2, 4), 16);
    let b = parseInt(hexString.substring(4, 6), 16);
    let a = 255;
    if (hexString.length === 8) {
        a = parseInt(hexString.substring(6, 8), 16);
    }
    return new RGBAColor(r, g, b, a);
}

/**
 * 配列からRGBColorオブジェクトへの変換。
 */
export function ArrayToRGBColor(arr) {
    return new RGBColor(arr[0], arr[1], arr[2]);
}

/**
 * 二つのRGBColorオブジェクトが等しいかどうかを判定します。
 */
export function RGBColorIsEqual(a, b) {
    return a.r === b.r && a.g === b.g && a.b === b.b;
}
