import { RGBColor } from '../model/color.js';
import { ConvertColorToThreeColor, DisposeThreeObjects, GetLineSegmentsProjectedDistance } from '../threejs/threeutils.js';

import * as THREE from 'three';

// ラインのしきい値（ピクセル単位）の定数
const LineThresholdInPixels = 10.0;

// 交差判定モードの定数オブジェクト
export const IntersectionMode =
{
    MeshOnly: 1, // メッシュのみ
    MeshAndLine: 2 // メッシュとライン
};

// Three.jsのメッシュにポリゴンオフセットを設定する関数
export function SetThreeMeshPolygonOffset(mesh, offset) {
    // マテリアルにポリゴンオフセットを設定する内部関数
    function SetMaterialsPolygonOffset(materials, offset) {
        for (let material of materials) {
            material.polygonOffset = offset;
            material.polygonOffsetUnit = 1;
            material.polygonOffsetFactor = 1;
        }
    }

    // メッシュのマテリアルにポリゴンオフセットを設定
    SetMaterialsPolygonOffset(mesh.material, offset);
    // ユーザーデータにマテリアルが格納されていれば、それにもポリゴンオフセットを設定
    if (mesh.userData.threeMaterials) {
        SetMaterialsPolygonOffset(mesh.userData.threeMaterials, offset);
    }
}

// ビューアモデルクラス
export class ViewerModel {
    constructor(scene) {
        this.scene = scene;
        this.rootObject = null; // ルートオブジェクト
    }

    // モデルが空かどうかを判定する
    IsEmpty() {
        return this.rootObject === null;
    }

    // ルートオブジェクトを設定する
    SetRootObject(rootObject) {
        // ルートオブジェクトが既に存在する場合はクリア
        if (this.rootObject !== null) {
            this.Clear();
        }
        this.rootObject = rootObject; // ルートオブジェクトを設定
        this.scene.add(this.rootObject); // シーンに追加
    }

    // ルートオブジェクトを取得する
    GetRootObject() {
        return this.rootObject;
    }

    // オブジェクトを追加する
    AddObject(object) {
        // ルートオブジェクトが存在しない場合は新しいオブジェクトをルートにする
        if (this.rootObject === null) {
            let newRootObject = new THREE.Object3D();
            this.SetRootObject(newRootObject);
        }
        this.rootObject.add(object); // オブジェクトを追加
    }

    // オブジェクトをトラバースする
    Traverse(enumerator) {
        if (this.rootObject === null) {
            return;
        }
        this.rootObject.traverse((obj) => {
            enumerator(obj);
        });
    }

    // ワールド行列を更新する
    UpdateWorldMatrix() {
        if (this.rootObject !== null) {
            this.rootObject.updateWorldMatrix(true, true);
        }
    }

    // モデルをクリアする
    Clear() {
        DisposeThreeObjects(this.rootObject); // オブジェクトの解放
        this.scene.remove(this.rootObject); // シーンから削除
        this.rootObject = null; // ルートオブジェクトを空にする
    }
}

/**
 * エッジ設定オブジェクト。
 */
export class EdgeSettings {
    /**
     * エッジ設定オブジェクトのコンストラクタ。
     * @param {boolean} showEdges エッジを表示するかどうか。
     * @param {RGBColor} edgeColor エッジの色。
     * @param {number} edgeThreshold エッジを表示するための面間の最小角度。
     * 単位は度で指定する必要があります。
     */
    constructor(showEdges, edgeColor, edgeThreshold) {
        this.showEdges = showEdges; // エッジを表示するかどうか
        this.edgeColor = edgeColor; // エッジの色
        this.edgeThreshold = edgeThreshold; // エッジを表示するための面間の最小角度
    }

    /**
     * オブジェクトのクローンを作成します。
     * @returns {EdgeSettings} クローンされたエッジ設定オブジェクト。
     */
    Clone() {
        return new EdgeSettings(this.showEdges, this.edgeColor.Clone(), this.edgeThreshold);
    }
}

export class ViewerMainModel {
    /**
     * ViewerMainModelのコンストラクタ。
     * @param {THREE.Scene} scene メインモデルのシーン。
     */
    constructor(scene) {
        this.scene = scene; // シーン

        this.mainModel = new ViewerModel(this.scene); // メインモデル
        this.edgeModel = new ViewerModel(this.scene); // エッジモデル

        this.edgeSettings = new EdgeSettings(false, new RGBColor(0, 0, 0), 1); // エッジ設定
        this.hasLines = false; // ラインを持っているかどうか
        this.hasPolygonOffset = false; // ポリゴンオフセットを持っているかどうか
    }

    /**
     * メインオブジェクトを設定します。
     * @param {THREE.Object3D} mainObject メインオブジェクト。
     */
    SetMainObject(mainObject) {
        this.mainModel.SetRootObject(mainObject); // メインオブジェクトを設定
        this.hasLines = false; // ラインを初期化
        this.hasPolygonOffset = false; // ポリゴンオフセットを初期化

        // ラインが存在するか確認
        this.EnumerateLines((line) => {
            this.hasLines = true; // ラインが存在する場合はフラグを立てる
        });

        // エッジを表示する場合はエッジモデルを生成
        if (this.edgeSettings.showEdges) {
            this.GenerateEdgeModel();
        }
        this.UpdatePolygonOffset(); // ポリゴンオフセットを更新
    }


    /**
 * メインモデルとエッジモデルのワールド行列を更新します。
 */
    UpdateWorldMatrix() {
        this.mainModel.UpdateWorldMatrix(); // メインモデルのワールド行列を更新
        this.edgeModel.UpdateWorldMatrix(); // エッジモデルのワールド行列を更新
    }

    /**
     * エッジの設定を更新します。
     * @param {EdgeSettings} edgeSettings 新しいエッジの設定。
     */
    SetEdgeSettings(edgeSettings) {
        let needToGenerate = false;
        if (edgeSettings.showEdges && (!this.edgeSettings.showEdges || this.edgeSettings.edgeThreshold !== edgeSettings.edgeThreshold)) {
            needToGenerate = true;
        }

        this.edgeSettings = edgeSettings; // エッジの設定を更新

        if (this.mainModel.IsEmpty()) {
            return;
        }

        if (this.edgeSettings.showEdges) {
            if (needToGenerate) {
                this.ClearEdgeModel(); // エッジモデルをクリア
                this.GenerateEdgeModel(); // エッジモデルを生成
            } else {
                let edgeColor = ConvertColorToThreeColor(this.edgeSettings.edgeColor);
                this.EnumerateEdges((edge) => {
                    edge.material.color = edgeColor;
                });
            }
        } else {
            this.ClearEdgeModel(); // エッジモデルをクリア
        }
    }

    /**
     * エッジモデルを生成します。
     */
    GenerateEdgeModel() {
        let edgeColor = ConvertColorToThreeColor(this.edgeSettings.edgeColor);

        this.UpdateWorldMatrix(); // ワールド行列を更新
        this.EnumerateMeshes((mesh) => {
            let edges = new THREE.EdgesGeometry(mesh.geometry, this.edgeSettings.edgeThreshold); // エッジのジオメトリを取得
            let line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
                color: edgeColor
            }));
            line.applyMatrix4(mesh.matrixWorld); // ワールド行列を適用
            line.userData = mesh.userData;
            line.visible = mesh.visible;
            this.edgeModel.AddObject(line); // エッジモデルに追加
        });

        this.UpdatePolygonOffset(); // ポリゴンオフセットを更新
    }

    /**
     * 指定された条件でメッシュとラインの境界ボックスを取得します。
     * @param {Function} needToProcess 処理する必要があるかどうかを判定する関数。
     * @returns {THREE.Box3} 境界ボックス。
     */
    GetBoundingBox(needToProcess) {
        let hasMesh = false; // メッシュが存在するかどうかのフラグ
        let boundingBox = new THREE.Box3(); // 境界ボックス
        this.EnumerateMeshesAndLines((mesh) => {
            if (needToProcess(mesh.userData)) { // 処理する必要がある場合
                boundingBox.union(new THREE.Box3().setFromObject(mesh)); // メッシュの境界ボックスを取得して統合
                hasMesh = true; // メッシュが存在することを示すフラグを立てる
            }
        });
        if (!hasMesh) {
            return null; // メッシュが存在しない場合はnullを返す
        }
        return boundingBox; // 境界ボックスを返す
    }


    /**
 * 指定された条件でメッシュとラインの境界球を取得します。
 * @param {Function} needToProcess 処理する必要があるかどうかを判定する関数。
 * @returns {THREE.Sphere} 境界球。
 */
    GetBoundingSphere(needToProcess) {
        let boundingBox = this.GetBoundingBox(needToProcess); // 境界ボックスを取得
        if (boundingBox === null) {
            return null; // 境界ボックスが存在しない場合はnullを返す
        }

        let boundingSphere = new THREE.Sphere(); // 境界球を作成
        boundingBox.getBoundingSphere(boundingSphere); // 境界ボックスから境界球を取得
        return boundingSphere; // 境界球を返す
    }

    /**
     * モデルをクリアします。
     */
    Clear() {
        this.mainModel.Clear(); // メインモデルをクリア
        this.ClearEdgeModel(); // エッジモデルをクリア
    }

    /**
     * エッジモデルをクリアします。
     */
    ClearEdgeModel() {
        if (this.edgeModel.IsEmpty()) {
            return; // エッジモデルが空の場合は何もしない
        }

        this.UpdatePolygonOffset(); // ポリゴンオフセットを更新
        this.edgeModel.Clear(); // エッジモデルをクリア
    }

    /**
     * メッシュを列挙します。
     * @param {Function} enumerator 列挙関数。
     */
    EnumerateMeshes(enumerator) {
        this.mainModel.Traverse((obj) => { // メインモデルをトラバース
            if (obj.isMesh) {
                enumerator(obj); // メッシュの場合は列挙関数を呼び出す
            }
        });
    }

    /**
     * ラインを列挙します。
     * @param {Function} enumerator 列挙関数。
     */
    EnumerateLines(enumerator) {
        this.mainModel.Traverse((obj) => { // メインモデルをトラバース
            if (obj.isLineSegments) {
                enumerator(obj); // ラインセグメントの場合は列挙関数を呼び出す
            }
        });
    }

    /**
     * メッシュとラインを列挙します。
     * @param {Function} enumerator 列挙関数。
     */
    EnumerateMeshesAndLines(enumerator) {
        this.mainModel.Traverse((obj) => { // メインモデルをトラバース
            if (obj.isMesh) {
                enumerator(obj); // メッシュの場合は列挙関数を呼び出す
            } else if (obj.isLineSegments) {
                enumerator(obj); // ラインセグメントの場合は列挙関数を呼び出す
            }
        });
    }

    /**
     * エッジを列挙します。
     * @param {Function} enumerator 列挙関数。
     */
    EnumerateEdges(enumerator) {
        this.edgeModel.Traverse((obj) => { // エッジモデルをトラバース
            if (obj.isLineSegments) {
                enumerator(obj); // ラインセグメントの場合は列挙関数を呼び出す
            }
        });
    }

    HasLinesOrEdges() {
        return this.hasLines || this.edgeSettings.showEdges;
    }

    UpdatePolygonOffset() {
        let needPolygonOffset = this.HasLinesOrEdges();
        if (needPolygonOffset !== this.hasPolygonOffset) {
            this.EnumerateMeshes((mesh) => {
                SetThreeMeshPolygonOffset(mesh, needPolygonOffset);
            });
            this.hasPolygonOffset = needPolygonOffset;
        }
    }

    GetMeshIntersectionUnderMouse(intersectionMode, mouseCoords, camera, width, height) {
        // メインモデルが空の場合はnullを返す
        if (this.mainModel.IsEmpty()) {
            return null;
        }

        // マウス座標がウィンドウの範囲外の場合はnullを返す
        if (mouseCoords.x < 0.0 || mouseCoords.x > width || mouseCoords.y < 0.0 || mouseCoords.y > height) {
            return null;
        }

        // マウス座標を正規化デバイス座標系に変換
        let mousePos = new THREE.Vector2();
        mousePos.x = (mouseCoords.x / width) * 2 - 1;
        mousePos.y = -(mouseCoords.y / height) * 2 + 1;

        // レイキャスターを作成し、カメラに対してマウス座標からのレイを設定
        let raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mousePos, camera);
        raycaster.params.Line.threshold = 10.0; // レイのしきい値を設定

        // メインモデルのルートオブジェクトとの交差を取得
        let iSectObjects = raycaster.intersectObject(this.mainModel.GetRootObject(), true);

        // 交差したオブジェクトをループで処理
        for (let i = 0; i < iSectObjects.length; i++) {
            let iSectObject = iSectObjects[i];
            // オブジェクトが非表示の場合は次のオブジェクトへ
            if (!iSectObject.object.visible) {
                continue;
            }
            // 交差したオブジェクトがメッシュの場合
            if (iSectObject.object.isMesh) {
                return iSectObject; // 交差したオブジェクトを返す
            }
            // 交差したオブジェクトがラインセグメントの場合
            else if (iSectObject.object.isLineSegments) {
                // 交差モードがメッシュのみの場合は次のオブジェクトへ
                if (intersectionMode === IntersectionMode.MeshOnly) {
                    continue;
                }
                // カメラからラインセグメントまでの距離を計算し、しきい値より小さい場合は交差したオブジェクトを返す
                let distance = GetLineSegmentsProjectedDistance(camera, width, height, iSectObject.object, mouseCoords);
                if (distance > LineThresholdInPixels) {
                    continue;
                }
                return iSectObject;
            }
        }

        return null; // 交差したオブジェクトがない場合はnullを返す
    }
}
