// 文字列フォーマット関数をインポート
import { FormatString } from './core.js';

// ローカライズされた文字列を保持する変数を初期化
let gLocalizedStrings = null;
// 言語コードを保持する変数を初期化
let gLanguageCode = null;

// ローカライズされた文字列を設定する関数
export function SetLocalizedStrings(localizedStrings) {
    gLocalizedStrings = localizedStrings; // 渡されたローカライズされた文字列を格納
}

// 言語コードを設定する関数
export function SetLanguageCode(languageCode) {
    gLanguageCode = languageCode; // 渡された言語コードを格納
}

// 文字列をローカライズする関数
export function Loc(str) {
    // ローカライズされた文字列や言語コードが設定されていない場合は、元の文字列を返す
    if (gLocalizedStrings === null || gLanguageCode === null) {
        return str;
    }
    // 指定されたキーのローカライズされた文字列が存在しない場合は、元の文字列を返す
    if (!gLocalizedStrings[str] || !gLocalizedStrings[str][gLanguageCode]) {
        return str;
    }
    // ローカライズされた文字列を返す
    return gLocalizedStrings[str][gLanguageCode];
}

// フォーマットされた文字列をローカライズする関数
export function FLoc(str, ...args) {
    // ローカライズされた文字列をフォーマットして返す
    return FormatString(Loc(str), ...args);
}
