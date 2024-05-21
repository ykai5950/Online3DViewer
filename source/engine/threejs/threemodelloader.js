import { Direction } from '../geometry/geometry.js';  // ジオメトリの方向をインポート
import { Importer } from '../import/importer.js';  // インポーターをインポート
import { RevokeObjectUrl } from '../io/bufferutils.js';  // オブジェクトURLを解放するための関数をインポート
import { MaterialSource } from '../model/material.js';  // マテリアルのソースをインポート
import { ConvertModelToThreeObject, ModelToThreeConversionOutput, ModelToThreeConversionParams } from './threeconverter.js';  // Three.jsオブジェクトにモデルを変換するための関数をインポート
import { ConvertColorToThreeColor, HasHighpDriverIssue } from './threeutils.js';  // 色をThree.jsの色に変換する関数をインポート

import * as THREE from 'three';  // Three.jsをインポート

export class ThreeModelLoader {
    constructor() {
        this.importer = new Importer();  // インポーターのインスタンスを作成
        this.inProgress = false;  // 進行中のフラグを初期化
        this.defaultMaterials = null;  // デフォルトのマテリアルを初期化
        this.objectUrls = null;  // オブジェクトURLのリストを初期化
        this.hasHighpDriverIssue = HasHighpDriverIssue();  // Highpドライバーの問題を判定
    }

    InProgress() {
        return this.inProgress;  // 進行中のフラグを返す
    }

    LoadModel(inputFiles, settings, callbacks) {
        if (this.inProgress) {  // 進行中であれば何もせず終了
            return;
        }

        this.inProgress = true;  // 進行中のフラグを立てる
        this.RevokeObjectUrls();  // オブジェクトURLを解放
        this.importer.ImportFiles(inputFiles, settings, {
            onLoadStart: () => {  // 読み込み開始時のコールバック
                callbacks.onLoadStart();
            },
            onFileListProgress: (current, total) => {  // ファイルリストの進行状況のコールバック
                callbacks.onFileListProgress(current, total);
            },
            onFileLoadProgress: (current, total) => {  // ファイル読み込みの進行状況のコールバック
                callbacks.onFileLoadProgress(current, total);
            },
            onImportStart: () => {  // インポート開始時のコールバック
                callbacks.onImportStart();
            },
            onSelectMainFile: (fileNames, selectFile) => {  // メインファイルの選択時のコールバック
                if (!callbacks.onSelectMainFile) {
                    selectFile(0);
                } else {
                    callbacks.onSelectMainFile(fileNames, selectFile);
                }
            },
            onImportSuccess: (importResult) => {  // インポート成功時のコールバック
                callbacks.onVisualizationStart();  // 可視化の開始を通知
                let params = new ModelToThreeConversionParams();  // Three.jsへの変換パラメータを作成
                params.forceMediumpForMaterials = this.hasHighpDriverIssue;  // Highpドライバーの問題があればmediumpを強制
                let output = new ModelToThreeConversionOutput();  // Three.jsへの変換出力を作成
                ConvertModelToThreeObject(importResult.model, params, output, {
                    onTextureLoaded: () => {  // テクスチャの読み込み完了時のコールバック
                        callbacks.onTextureLoaded();
                    },
                    onModelLoaded: (threeObject) => {  // モデルの読み込み完了時のコールバック
                        this.defaultMaterials = output.defaultMaterials;  // デフォルトのマテリアルを更新
                        this.objectUrls = output.objectUrls;  // オブジェクトURLを更新
                        if (importResult.upVector === Direction.X) {  // Y軸が上方向の場合
                            let rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0.0, 0.0, 1.0), Math.PI / 2.0);  // X軸周りに90度回転
                            threeObject.quaternion.multiply(rotation);
                        } else if (importResult.upVector === Direction.Z) {  // Z軸が上方向の場合
                            let rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1.0, 0.0, 0.0), -Math.PI / 2.0);  // X軸周りに-90度回転
                            threeObject.quaternion.multiply(rotation);
                        }
                        callbacks.onModelFinished(importResult, threeObject);  // モデル読み込みの完了を通知
                        this.inProgress = false;  // 進行中のフラグを解除
                    }
                });
            },
            onImportError: (importError) => {  // インポートエラー時のコールバック
                callbacks.onLoadError(importError);  // エラーを通知
                this.inProgress = false;  // 進行中のフラグを解除
            }
        });
    }

    GetImporter() {
        return this.importer;  // インポーターを返す
    }

    GetDefaultMaterials() {
        return this.defaultMaterials;  // デフォルトのマテリアルを返す
    }

    ReplaceDefaultMaterialsColor(defaultColor, defaultLineColor) {
        if (this.defaultMaterials !== null) {  // デフォルトのマテリアルがあれば
            for (let defaultMaterial of this.defaultMaterials) {  // 全てのデフォルトのマテリアルに対して
                if (!defaultMaterial.vertexColors) {  // 頂点カラーがない場合
                    if (defaultMaterial.userData.source === MaterialSource.DefaultFace) {  // デフォルトのマテリアルがフェースの場合
                        defaultMaterial.color = ConvertColorToThreeColor(defaultColor);  // デフォルトのカラーを設定
                    } else if (defaultMaterial.userData.source === MaterialSource.DefaultLine) {  // デフォルトのマテリアルがラインの場合
                        defaultMaterial.color = ConvertColorToThreeColor(defaultLineColor);  // デフォルトのラインのカラーを設定
                    }
                }
            }
        }
    }

    RevokeObjectUrls() {
        if (this.objectUrls === null) {  // オブジェクトURLがなければ何もしない
            return;
        }
        for (let objectUrl of this.objectUrls) {  // 全てのオブジェクトURLに対して
            RevokeObjectUrl(objectUrl);  // URLを解放
        }
        this.objectUrls = null;  // オブジェクトURLのリストを初期化
    }

    Destroy() {
        this.RevokeObjectUrls();  // オブジェクトURLを解放
        this.importer = null;  // インポーターを破棄
    }
}
