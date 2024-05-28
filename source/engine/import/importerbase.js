import { Direction } from '../geometry/geometry.js';  // Direction定数をインポート
import { Model } from '../model/model.js';  // Modelクラスをインポート
import { FinalizeModel } from '../model/modelfinalization.js';  // モデルの最終処理関数をインポート
import { IsModelEmpty } from '../model/modelutils.js';  // モデルが空であるかをチェックする関数をインポート
import { Loc } from '../core/localization.js';  // ローカライゼーション関数をインポート

// ImporterBaseクラスを定義
export class ImporterBase {
    constructor() {
        this.name = null;  // ファイル名
        this.extension = null;  // ファイル拡張子
        this.callbacks = null;  // コールバック関数
        this.model = null;  // インポートされたモデル
        this.error = null;  // エラーフラグ
        this.message = null;  // エラーメッセージ
    }

    // インポート処理を開始するメソッド
    Import(name, extension, content, callbacks) {
        this.Clear();  // 変数をクリア

        this.name = name;  // ファイル名を設定
        this.extension = extension;  // ファイル拡張子を設定
        this.callbacks = callbacks;  // コールバック関数を設定
        this.model = new Model();  // 新しいモデルを作成
        this.error = false;  // エラーフラグをリセット
        this.message = null;  // エラーメッセージをリセット
        this.ResetContent();  // コンテンツをリセット
        this.ImportContent(content, () => {  // コンテンツをインポート
            this.CreateResult(callbacks);  // インポート結果を作成
        });
    }

    // 変数をクリアするメソッド
    Clear() {
        this.name = null;  // ファイル名をクリア
        this.extension = null;  // ファイル拡張子をクリア
        this.callbacks = null;  // コールバック関数をクリア
        this.model = null;  // モデルをクリア
        this.error = null;  // エラーフラグをクリア
        this.message = null;  // エラーメッセージをクリア
        this.ClearContent();  // コンテンツをクリア
    }

    // インポート結果を作成するメソッド
    CreateResult(callbacks) {
        if (this.error) {  // エラーがある場合
            callbacks.onError();  // エラーコールバックを呼び出し
            callbacks.onComplete();  // 完了コールバックを呼び出し
            return;
        }

        if (IsModelEmpty(this.model)) {  // モデルが空である場合
            this.SetError(Loc('The model doesn\'t contain any meshes.'));  // エラーメッセージを設定
            callbacks.onError();  // エラーコールバックを呼び出し
            callbacks.onComplete();  // 完了コールバックを呼び出し
            return;
        }

        FinalizeModel(this.model, {  // モデルの最終処理を実行
            defaultLineMaterialColor: this.callbacks.getDefaultLineMaterialColor(),  // デフォルトのラインマテリアルの色を設定
            defaultMaterialColor: this.callbacks.getDefaultMaterialColor()  // デフォルトのマテリアルの色を設定
        });

        callbacks.onSuccess();  // 成功コールバックを呼び出し
        callbacks.onComplete();  // 完了コールバックを呼び出し
    }

    // 指定された拡張子をインポートできるか確認するメソッド
    CanImportExtension(extension) {
        return false;  // デフォルトではインポート不可
    }

    // モデルの「上」方向を取得するメソッド
    GetUpDirection() {
        return Direction.Z;  // デフォルトではZ方向が「上」
    }

    // コンテンツをクリアするメソッド（サブクラスで実装）
    ClearContent() {

    }

    // コンテンツをリセットするメソッド（サブクラスで実装）
    ResetContent() {

    }

    // コンテンツをインポートするメソッド（サブクラスで実装）
    ImportContent(fileContent, onFinish) {

    }

    // モデルを取得するメソッド
    GetModel() {
        return this.model;  // モデルを返す
    }

    // エラーメッセージを設定するメソッド
    SetError(message) {
        this.error = true;  // エラーフラグを設定
        if (message !== undefined && message !== null) {
            this.message = message;  // エラーメッセージを設定
        }
    }

    // エラーが発生したか確認するメソッド
    WasError() {
        return this.error;  // エラーフラグを返す
    }

    // エラーメッセージを取得するメソッド
    GetErrorMessage() {
        return this.message;  // エラーメッセージを返す
    }
}
