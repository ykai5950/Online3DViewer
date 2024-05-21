import { Coord2D } from '../geometry/coord2d.js';

// スタイルのパラメータから整数値を取得する関数
export function GetIntegerFromStyle(parameter) {
    return Math.round(parseFloat(parameter));
}

// 要素の外部幅を取得する関数
export function GetDomElementExternalWidth(style) {
    // 要素のパディング、ボーダー、マージンの幅を合計して返す
    let padding = GetIntegerFromStyle(style.paddingLeft) + GetIntegerFromStyle(style.paddingRight);
    let border = GetIntegerFromStyle(style.borderLeftWidth) + GetIntegerFromStyle(style.borderRightWidth);
    let margin = GetIntegerFromStyle(style.marginLeft) + GetIntegerFromStyle(style.marginRight);
    return padding + border + margin;
}

// 要素の外部高さを取得する関数
export function GetDomElementExternalHeight(style) {
    // 要素のパディング、ボーダー、マージンの高さを合計して返す
    let padding = GetIntegerFromStyle(style.paddingTop) + GetIntegerFromStyle(style.paddingBottom);
    let border = GetIntegerFromStyle(style.borderTopWidth) + GetIntegerFromStyle(style.borderBottomWidth);
    let margin = GetIntegerFromStyle(style.marginTop) + GetIntegerFromStyle(style.marginBottom);
    return padding + border + margin;
}

// 要素の内部寸法を取得する関数
export function GetDomElementInnerDimensions(element, outerWidth, outerHeight) {
    // 要素のスタイルを取得し、外部幅と外部高さから内部幅と内部高さを計算して返す
    let style = getComputedStyle(element);
    let width = outerWidth - GetDomElementExternalWidth(style);
    let height = outerHeight - GetDomElementExternalHeight(style);
    return {
        width: width,
        height: height
    };
}

// 要素のクライアント座標を取得する関数
export function GetDomElementClientCoordinates(element, clientX, clientY) {
    // elementがgetBoundingClientRectメソッドを持っている場合
    if (element.getBoundingClientRect) {
        // 要素のクライアント座標を取得し、clientRectに格納する
        // これにより、要素の位置(x, y)と大きさ(width, height)が取得できる
        let clientRect = element.getBoundingClientRect();

        // マウスのX座標から要素の左端の座標(clientRect.left)を引いて、
        // 要素内での相対的なX座標を取得する
        clientX -= clientRect.left;

        // マウスのY座標から要素の上端の座標(clientRect.top)を引いて、
        // 要素内での相対的なY座標を取得する
        clientY -= clientRect.top;
    }
    // ページのスクロール量を加算して、ビューポート全体での絶対座標を取得する
    if (window.pageXOffset && window.pageYOffset) {
        clientX += window.pageXOffset;
        clientY += window.pageYOffset;
    }
    return (new Coord2D(clientX, clientY));
}

// 要素を作成する関数
export function CreateDomElement(elementType, className, innerHTML) {
    // 指定の要素タイプの新しい要素を作成し、クラス名とHTML内容を設定して返す
    let element = document.createElement(elementType);
    if (className) {
        element.className = className;
    }
    if (innerHTML) {
        element.innerHTML = innerHTML;
    }
    return element;
}

// 要素を追加する関数
export function AddDomElement(parentElement, elementType, className, innerHTML) {
    // 新しい要素を作成し、親要素に追加して返す
    let element = CreateDomElement(elementType, className, innerHTML);
    parentElement.appendChild(element);
    return element;
}

// div要素を追加する関数
export function AddDiv(parentElement, className, innerHTML) {
    // div要素を追加する
    return AddDomElement(parentElement, 'div', className, innerHTML);
}

// 要素の子要素をクリアする関数
export function ClearDomElement(element) {
    // 要素の子要素を全て削除する
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

// 既存の要素の前に要素を挿入する関数
export function InsertDomElementBefore(newElement, existingElement) {
    // 新しい要素を既存の要素の前に挿入する
    existingElement.parentNode.insertBefore(newElement, existingElement);
}

// 既存の要素の後に要素を挿入する関数
export function InsertDomElementAfter(newElement, existingElement) {
    // 新しい要素を既存の要素の後に挿入する
    existingElement.parentNode.insertBefore(newElement, existingElement.nextSibling);
}

// 要素を表示する関数
export function ShowDomElement(element, show) {
    // 要素の表示/非表示を切り替える
    if (show) {
        element.style.display = 'block';
    } else {
        element.style.display = 'none';
    }
}

// 要素が表示されているかどうかを判定する関数
export function IsDomElementVisible(element) {
    // 要素の offsetParent が null でない場合は表示されていると判定する
    return element.offsetParent !== null;
}

// 要素の幅を設定する関数
export function SetDomElementWidth(element, width) {
    // 要素の幅をピクセル単位で設定する
    element.style.width = width.toString() + 'px';
}

// 要素の高さを設定する関数
export function SetDomElementHeight(element, height) {
    // 要素の高さをピクセル単位で設定する
    element.style.height = height.toString() + 'px';
}

// 要素の外部幅を取得する関数
export function GetDomElementOuterWidth(element) {
    // 要素の外部幅(マージンを含む)を取得する
    let style = getComputedStyle(element);
    return element.offsetWidth + GetIntegerFromStyle(style.marginLeft) + GetIntegerFromStyle(style.marginRight);
}

// 要素の外部高さを取得する関数
export function GetDomElementOuterHeight(element) {
    // 要素の外部高さ(マージンを含む)を取得する
    let style = getComputedStyle(element);
    return element.offsetHeight + GetIntegerFromStyle(style.marginTop) + GetIntegerFromStyle(style.marginBottom);
}

// 要素の外部幅を設定する関数
export function SetDomElementOuterWidth(element, width) {
    // 要素の外部幅(マージンを含む)を設定する
    let style = getComputedStyle(element);
    SetDomElementWidth(element, width - GetDomElementExternalWidth(style));
}

// 要素の外部高さを設定する関数
export function SetDomElementOuterHeight(element, height) {
    // 要素の外部高さ(マージンを含む)を設定する
    let style = getComputedStyle(element);
    SetDomElementHeight(element, height - GetDomElementExternalHeight(style));
}

// div要素を作成する関数
export function CreateDiv(className, innerHTML) {
    // div要素を作成する
    return CreateDomElement('div', className, innerHTML);
}
