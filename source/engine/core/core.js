// 値が定義されているかどうかをチェックする関数
export function IsDefined(val) {
    return val !== undefined && val !== null; // 値がundefinedでもnullでもない場合にtrueを返す
}

// 値が定義されていない場合にデフォルト値を返す関数
export function ValueOrDefault(val, def) {
    if (val === undefined || val === null) { // 値がundefinedまたはnullの場合
        return def; // デフォルト値を返す
    }
    return val; // そうでない場合は元の値を返す
}

// オブジェクトの属性をコピーする関数
export function CopyObjectAttributes(src, dest) {
    if (!IsDefined(src)) { // ソースオブジェクトが定義されていない場合は何もしない
        return;
    }
    for (let attribute of Object.keys(src)) { // ソースオブジェクトのすべてのキーをループ
        if (IsDefined(src[attribute])) { // キーに対応する値が定義されている場合
            dest[attribute] = src[attribute]; // その属性をデスティネーションオブジェクトにコピー
        }
    }
}

// オブジェクトが空かどうかをチェックする関数
export function IsObjectEmpty(obj) {
    return Object.keys(obj).length === 0; // オブジェクトのキーの数が0の場合にtrueを返す
}

// 文字列のフォーマットを行う関数
export function FormatString(template, ...args) {
    return template.replace(/{([0-9]+)}/g, (match, index) => { // プレースホルダーを探して置き換える
        return args[index] === undefined ? match : args[index]; // 対応する引数がundefinedの場合はプレースホルダーをそのまま、そうでない場合は引数で置き換える
    });
}

// HTMLの特殊文字をエスケープする関数
export function EscapeHtmlChars(str) {
    return str.replace(/</g, '&lt;').replace(/>/g, '&gt;'); // < と > をそれぞれ &lt; と &gt; に置き換える
}
