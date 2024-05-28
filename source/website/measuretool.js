// three.jsライブラリから幾何学的な定数をインポートする
import { BigEps, IsEqualEps, NearyCoord } from '../engine/geometry/geometry.js';
// import { BigEps, IsEqualEps, NearyCoord, RadDeg } from '../engine/geometry/geometry.js';
// DOMユーティリティ関数をインポートする
import { AddDiv, ClearDomElement } from '../engine/viewer/domutils.js';
// ユーティリティ関数をインポートする
import { AddSvgIconElement, IsDarkTextNeededForColor } from './utils.js';
// ローカリゼーション機能をインポートする
import { Loc } from '../engine/core/localization.js';
import { CalculateArea3D } from '../engine/geometry/coord3d.js';
// three.jsライブラリの主要なオブジェクトをインポートする
import * as THREE from 'three';
// 色関連の機能をインポートする
import { ColorComponentToFloat, RGBColor } from '../engine/model/color.js';
// 交差モードの定数をインポートする
import { IntersectionMode } from '../engine/viewer/viewermodel.js';

// 交差点の面の法線ベクトルを取得する関数
function GetFaceWorldNormal(intersection) {
    // 法線行列を作成する
    let normalMatrix = new THREE.Matrix4();
    // オブジェクトのワールド行列を更新する
    intersection.object.updateWorldMatrix(true, false);
    // ワールド行列から法線行列を抽出する
    normalMatrix.extractRotation(intersection.object.matrixWorld);
    // 面の法線ベクトルをクローンする
    let faceNormal = intersection.face.normal.clone();
    // 法線ベクトルに法線行列を適用する
    faceNormal.applyMatrix4(normalMatrix);
    // ワールド空間の面の法線ベクトルを返す
    return faceNormal;
}

// マーカー用の材質を作成する関数
function CreateMaterial() {
    // LineBasicMaterialを作成して返す
    return new THREE.LineBasicMaterial({
        color: 0xff0000, // 線の色を設定
        depthTest: false // 深度テストを無効化
    });
}

// 点の配列から線を作成する関数
function CreateLineFromPoints(points, material) {
    // BufferGeometryを作成し、点の配列を設定する
    let geometry = new THREE.BufferGeometry().setFromPoints(points);
    // 線オブジェクトを作成して返す
    return new THREE.Line(geometry, material);
}

// マーカークラスの定義
class Marker {
    // コンストラクタ
    // constructor(intersection, radius) {
    //     // 交差点情報を初期化する
    //     this.intersection = null;
    //     // マーカーオブジェクトを作成する
    //     this.markerObject = new THREE.Object3D();

    //     // マーカー用の材質を作成する
    //     let material = CreateMaterial();
    //     // 円形のカーブを作成する
    //     let circleCurve = new THREE.EllipseCurve(0.0, 0.0, radius, radius, 0.0, 2.0 * Math.PI, false, 0.0);
    //     // 円形の線を作成してマーカーオブジェクトに追加する
    //     this.markerObject.add(CreateLineFromPoints(circleCurve.getPoints(50), material));
    //     // X軸の線を作成してマーカーオブジェクトに追加する
    //     this.markerObject.add(CreateLineFromPoints([new THREE.Vector3(-radius, 0.0, 0.0), new THREE.Vector3(radius, 0.0, 0.0)], material));
    //     // Y軸の線を作成してマーカーオブジェクトに追加する
    //     this.markerObject.add(CreateLineFromPoints([new THREE.Vector3(0.0, -radius, 0.0), new THREE.Vector3(0.0, radius, 0.0)], material));

    //     // マーカーの位置を初期化する
    //     this.UpdatePosition(intersection);
    // }

    // 赤丸に変更
    constructor(intersection, radius) {
        // 交差点情報を初期化する
        this.intersection = null;
        // マーカーオブジェクトを作成する
        this.markerObject = new THREE.Mesh(
            new THREE.SphereGeometry(radius, 16, 16), // 球体のジオメトリを作成
            new THREE.MeshBasicMaterial({ color: 0xff0000 }) // 赤い材質を作成
        );

        // マーカーの位置を初期化する
        this.UpdatePosition(intersection);
    }
    // マーカーの位置を更新する
    UpdatePosition(intersection) {
        // 交差点情報を設定する
        this.intersection = intersection;
        // 面の法線ベクトルを取得する
        let faceNormal = GetFaceWorldNormal(this.intersection);
        // マーカーオブジェクトのワールド行列を更新する
        this.markerObject.updateMatrixWorld(true);
        // マーカーオブジェクトの位置を初期化する
        this.markerObject.position.set(0.0, 0.0, 0.0);
        // マーカーオブジェクトを法線ベクトルに向ける
        this.markerObject.lookAt(faceNormal);
        // マーカーオブジェクトの位置を交差点の位置に設定する
        this.markerObject.position.set(this.intersection.point.x, this.intersection.point.y, this.intersection.point.z);
    }

    // マーカーの表示/非表示を切り替える
    Show(show) {
        // マーカーオブジェクトの可視性を設定する
        this.markerObject.visible = show;
    }

    // 交差点情報を取得する
    GetIntersection() {
        // 交差点情報を返す
        return this.intersection;
    }

    // マーカーオブジェクトを取得する
    GetObject() {
        // マーカーオブジェクトを返す
        return this.markerObject;
    }
}

// 2つのマーカーの値を計算する関数
function CalculateMarkerValues(aMarker, bMarker) {
    // マーカーの交差点情報を取得する
    const aIntersection = aMarker.GetIntersection();
    const bIntersection = bMarker.GetIntersection();
    // 結果を格納するオブジェクトを初期化する
    let result = {
        pointsDistance: null,
        parallelFacesDistance: null,
        facesAngle: null
    };

    // 面の法線ベクトルを取得する
    const aNormal = GetFaceWorldNormal(aIntersection);
    const bNormal = GetFaceWorldNormal(bIntersection);
    // 2点間の距離を計算する
    // 法線ベクトルの原点(aIntersection.point)
    result.pointsDistance = aIntersection.point.distanceTo(bIntersection.point);
    // 2つの面の角度を計算する
    result.facesAngle = aNormal.angleTo(bNormal);
    // 面が平行な場合
    if (IsEqualEps(result.facesAngle, 0.0, BigEps) || IsEqualEps(result.facesAngle, Math.PI, BigEps)) {
        // 平面を作成する
        let aPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(aNormal, aIntersection.point);
        // 平行な面間の距離を計算する
        result.parallelFacesDistance = Math.abs(aPlane.distanceToPoint(bIntersection.point));
    }
    // 結果を返す
    return result;
}

// MeasureToolクラスの定義
export class MeasureTool {
    // コンストラクタ
    constructor(viewer, settings) {
        // viewerオブジェクトを設定する
        this.viewer = viewer;
        // 設定オブジェクトを設定する
        this.settings = settings;
        // ツールの初期状態はアクティブでない
        this.isActive = false;
        // マーカーの配列を初期化する
        this.markers = [];
        // 一時的なマーカーを初期化する
        this.tempMarker = null;

        // パネルを初期化する
        this.panel = null;
        // ボタンを初期化する
        this.button = null;
    }

    // モードをセットする
    SetMode(mode) {
        // モードをセットする
        this.mode = mode;
    }

    // ボタンを設定する
    SetButton(button) {
        // ボタンオブジェクトを設定する
        this.button = button;
    }

    // ツールがアクティブかどうかを取得する
    IsActive() {
        // ツールのアクティブ状態を返す
        return this.isActive;
    }

    // ツールのアクティブ状態を切り替える
    SetActive(isActive) {
        // アクティブ状態が変更されていない場合は何もしない
        if (this.isActive === isActive) {
            return;
        }
        // アクティブ状態を更新する
        this.isActive = isActive;
        // ボタンの選択状態を更新する
        this.button.SetSelected(isActive);
        // アクティブ状態でパネルを作成し、リサイズする
        if (this.isActive) {
            this.panel = AddDiv(document.body, 'ov_measure_panel');
            this.UpdatePanel();
            this.Resize();
            // 非アクティブ状態でマーカーをクリアし、パネルを削除する
        } else {
            this.ClearMarkers();
            this.panel.remove();
        }
    }

    // クリックイベントハンドラ
    Click(mouseCoordinates) {
        // マウス位置とメッシュの交差点を取得する
        let intersection = this.viewer.GetMeshIntersectionUnderMouse(IntersectionMode.MeshOnly, mouseCoordinates);
        // 交差点がない場合はマーカーをクリアし、パネルを更新する
        if (intersection === null) {
            this.ClearMarkers();
            this.UpdatePanel();
            return;
        }
        // マーカー取得
        let marker = this.GenerateMarker(intersection).GetIntersection();
        // 既に選択されたマーカーと同じ座標の場合
        if (this.markers.some(existMarker => IsEqualEps(existMarker.GetIntersection().point.x, marker.point.x, NearyCoord) && IsEqualEps(existMarker.GetIntersection().point.y, marker.point.y, NearyCoord) && IsEqualEps(existMarker.GetIntersection().point.z, marker.point.z, NearyCoord))) {
            this.ClearMarkers();
            this.UpdatePanel();
            return;
        }

        // 長さ測定の場合
        if (this.mode === measureMode.Length) {

            // マーカーが2つある場合
            if (this.markers.length === 2) {

                // ここには1つの計測として保存する処理が入る想定

                // 長さを測る処理

                // 測定結果を描画する処理

                // マーカーをクリアする
                this.ClearMarkers();
            }

            // マーカーを追加する
            this.AddMarker(intersection);
        }
        // 面積測定の場合
        if (this.mode === measureMode.Area) {
            // マーカーを追加する
            this.AddAnyMarker(intersection);

            // 面積を計算する
            CalculateArea3D(intersection);
        }
        // パネルを更新する
        this.UpdatePanel();
    }

    // マウス移動イベントハンドラ
    MouseMove(mouseCoordinates) {
        // マウス位置とメッシュの交差点を取得する
        let intersection = this.viewer.GetMeshIntersectionUnderMouse(IntersectionMode.MeshOnly, mouseCoordinates);
        // 交差点がない場合、一時的なマーカーを非表示にする
        if (intersection === null) {
            if (this.tempMarker !== null) {
                this.tempMarker.Show(false);
                this.viewer.Render();
            }
            return;
        }
        // 一時的なマーカーがない場合は新しく作成する
        if (this.tempMarker === null) {
            this.tempMarker = this.GenerateMarker(intersection);
        }
        // 一時的なマーカーの位置を更新する
        this.tempMarker.UpdatePosition(intersection);
        // 一時的なマーカーを表示する
        this.tempMarker.Show(true);
        // ビューアーを再描画する
        this.viewer.Render();
    }

    // マーカーを追加する
    AddMarker(intersection) {
        // 新しいマーカーを作成する
        let marker = this.GenerateMarker(intersection);
        // マーカーを配列に追加する
        this.markers.push(marker);
        // マーカーが2つある場合は2点を結ぶ線を追加する
        if (this.markers.length === 2) {
            let material = CreateMaterial();
            let aPoint = this.markers[0].GetIntersection().point;
            let bPoint = this.markers[1].GetIntersection().point;
            this.viewer.AddExtraObject(CreateLineFromPoints([aPoint, bPoint], material));
        }
    }

    // 複数のマーカーを追加する
    AddAnyMarker(intersection) {
        // 新しいマーカーを作成する
        let marker = this.GenerateMarker(intersection);
        // マーカーを配列に追加する
        this.markers.push(marker);
        // マーカーの数を取得
        const markerLength = this.markers.length;
        // マーカーが2つある場合は2点を結ぶ線を追加する
        if (markerLength >= 2) {
            let material = CreateMaterial();
            let aPoint = this.markers[markerLength - 2].GetIntersection().point;
            let bPoint = this.markers[markerLength - 1].GetIntersection().point;
            this.viewer.AddExtraObject(CreateLineFromPoints([aPoint, bPoint], material));
        }
    }

    // マーカーを生成する
    GenerateMarker(intersection) {
        // バウンディングスフェアを取得する
        let boundingSphere = this.viewer.GetBoundingSphere((meshUserData) => {
            return true;
        });

        // マーカーの半径を設定する
        let radius = boundingSphere.radius / 200.0;

        // 新しいマーカーを作成する
        let marker = new Marker(intersection, radius);
        // ビューアーにマーカーオブジェクトを追加する
        this.viewer.AddExtraObject(marker.GetObject());
        // マーカーを返す
        return marker;
    }

    // パネルを更新する
    UpdatePanel() {
        // ページの背景色とマーカーの背景色をブレンドする関数
        function BlendBackgroundWithPageBackground(backgroundColor) {
            // ページの背景色を取得する
            let bodyStyle = window.getComputedStyle(document.body, null);
            let bgColors = bodyStyle.backgroundColor.match(/\d+/g);
            // 背景色が取得できない場合はマーカーの背景色を返す
            if (bgColors.length < 3) {
                return new RGBColor(backgroundColor.r, backgroundColor.g, backgroundColor.b);
            }
            // アルファ値を取得する
            let alpha = ColorComponentToFloat(backgroundColor.a);
            // ページの背景色とマーカーの背景色をブレンドする
            return new RGBColor(
                parseInt(bgColors[0], 10) * (1.0 - alpha) + backgroundColor.r * alpha,
                parseInt(bgColors[1], 10) * (1.0 - alpha) + backgroundColor.g * alpha,
                parseInt(bgColors[2], 10) * (1.0 - alpha) + backgroundColor.b * alpha
            );
        }

        // パネルに値を追加する関数
        function AddValue(panel, icon, title, value) {
            // SVGアイコンを追加する
            let svgIcon = AddSvgIconElement(panel, icon, 'left_inline');
            svgIcon.title = title;
            // 値を追加する
            AddDiv(panel, 'ov_measure_value', value);
        }

        // パネルをクリアする
        ClearDomElement(this.panel);
        // パネルの背景色と文字色を設定する
        if (this.settings.backgroundIsEnvMap) {
            this.panel.style.color = '#ffffff';
            this.panel.style.backgroundColor = 'rgba(0,0,0,0.5)';
        } else {
            let blendedColor = BlendBackgroundWithPageBackground(this.settings.backgroundColor);
            if (IsDarkTextNeededForColor(blendedColor)) {
                this.panel.style.color = '#000000';
            } else {
                this.panel.style.color = '#ffffff';
            }
            this.panel.style.backgroundColor = 'transparent';
        }
        // パネルの内容を設定する
        if (this.markers.length === 0) {
            // マーカーがない場合の表示
            this.panel.innerHTML = Loc('Select a point.');
        } else if (this.markers.length === 1) {
            // 1つのマーカーがある場合の表示
            this.panel.innerHTML = Loc('Select another point.');
        } else {
            // 2つのマーカーがある場合
            let calcResult = CalculateMarkerValues(this.markers[0], this.markers[1]);
            // 2点間の距離を表示する
            if (calcResult.pointsDistance !== null) {
                AddValue(this.panel, 'measure_distance', 'Distance of points', calcResult.pointsDistance.toFixed(3));
            }
            // 平行な面間の距離を表示する
            if (calcResult.parallelFacesDistance !== null) {
                AddValue(this.panel, 'measure_distance_parallel', 'Distance of parallel faces', calcResult.parallelFacesDistance.toFixed(3));
            }
            // 2つの面の角度を表示する
            if (calcResult.facesAngle !== null) {
                let degreeValue = calcResult.facesAngle * RadDeg;
                AddValue(this.panel, 'measure_angle', 'Angle of faces', degreeValue.toFixed(1) + '\xB0');
            }
        }
        // パネルのサイズと位置を調整する
        this.Resize();
    }

    // パネルのサイズと位置を調整する
    Resize() {
        // ツールが非アクティブの場合は何もしない
        if (!this.isActive) {
            return;
        }
        // キャンバスを取得する
        let canvas = this.viewer.GetCanvas();
        // キャンバスの境界矩形を取得する
        let canvasRect = canvas.getBoundingClientRect();
        // パネルの境界矩形を取得する
        let panelRect = this.panel.getBoundingClientRect();
        // キャンバスの幅を計算する
        let canvasWidth = canvasRect.right - canvasRect.left;
        // パネルの幅を計算する
        let panelWidth = panelRect.right - panelRect.left;
        // パネルの位置を設定する
        this.panel.style.left = (canvasRect.left + (canvasWidth - panelWidth) / 2) + 'px';
        this.panel.style.top = (canvasRect.top + 10) + 'px';
    }

    // マーカーをクリアする
    ClearMarkers() {
        // ビューアーの追加オブジェクトをクリアする
        this.viewer.ClearExtra();
        // マーカーの配列を空にする
        this.markers = [];
        // 一時的なマーカーをクリアする
        this.tempMarker = null;
    }
}
