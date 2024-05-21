import { Coord3D, CoordDistance3D, SubCoord3D } from '../geometry/coord3d.js';
import { DegRad, Direction, IsEqual } from '../geometry/geometry.js';
import { ColorComponentToFloat } from '../model/color.js';
import { CreateHighlightMaterials, ShadingType } from '../threejs/threeutils.js';
import { Camera, NavigationMode, ProjectionMode } from './camera.js';
import { GetDomElementInnerDimensions } from './domutils.js';
import { Navigation } from './navigation.js';
import { ShadingModel } from './shadingmodel.js';
import { ViewerModel, ViewerMainModel } from './viewermodel.js';

import * as THREE from 'three';

/**
 * 指定された方向に対するデフォルトのカメラを取得します。
 * @param {Direction} direction カメラの向きを指定する定数。
 * @returns {Camera} 指定された方向に対するデフォルトのカメラ。
 */
export function GetDefaultCamera(direction) {
    let fieldOfView = 45.0;
    if (direction === Direction.X) {
        return new Camera(
            new Coord3D(2.0, -3.0, 1.5),
            new Coord3D(0.0, 0.0, 0.0),
            new Coord3D(1.0, 0.0, 0.0),
            fieldOfView
        );
    } else if (direction === Direction.Y) {
        return new Camera(
            new Coord3D(-1.5, 2.0, 3.0),
            new Coord3D(0.0, 0.0, 0.0),
            new Coord3D(0.0, 1.0, 0.0),
            fieldOfView
        );
    } else if (direction === Direction.Z) {
        return new Camera(
            new Coord3D(-1.5, -3.0, 2.0),
            new Coord3D(0.0, 0.0, 0.0),
            new Coord3D(0.0, 0.0, 1.0),
            fieldOfView
        );
    }
    return null;
}

/**
 * オブジェクトを再帰的に処理します。
 * @param {THREE.Object3D} object 処理するオブジェクト。
 * @param {function} processor オブジェクトを処理する関数。
 * @returns {boolean} 処理が成功した場合はtrue、それ以外の場合はfalse。
 */
export function TraverseThreeObject(object, processor) {
    if (!processor(object)) {
        return false;
    }
    for (let child of object.children) {
        if (!TraverseThreeObject(child, processor)) {
            return false;
        }
    }
    return true;
}

/**
 * オブジェクトのシェーディングタイプを取得します。
 * @param {THREE.Object3D} mainObject シェーディングタイプを取得するオブジェクト。
 * @returns {ShadingType} シェーディングタイプ。
 */
export function GetShadingTypeOfObject(mainObject) {
    let shadingType = null;
    TraverseThreeObject(mainObject, (obj) => {
        if (obj.isMesh) {
            for (const material of obj.material) {
                if (material.type === 'MeshPhongMaterial') {
                    shadingType = ShadingType.Phong;
                } else if (material.type === 'MeshStandardMaterial') {
                    shadingType = ShadingType.Physical;
                }
                return false;
            }
        }
        return true;
    });
    return shadingType;
}

/**
 * カメラの検証を行うクラスです。
 */
export class CameraValidator {
    /**
     * カメラの検証オブジェクトを初期化します。
     */
    constructor() {
        this.eyeCenterDistance = 0.0;
        this.forceUpdate = true;
    }

    /**
     * カメラの強制更新を行います。
     */
    ForceUpdate() {
        this.forceUpdate = true;
    }

    /**
     * 透視投影カメラの検証を行います。
     * @returns {boolean} カメラが更新された場合はfalse、それ以外の場合はtrue。
     */
    ValidatePerspective() {
        if (this.forceUpdate) {
            this.forceUpdate = false;
            return false;
        }
        return true;
    }

    /**
     * 正射影カメラの検証を行います。
     * @param {number} eyeCenterDistance カメラの視点から中心までの距離。
     * @returns {boolean} カメラが更新された場合はfalse、それ以外の場合はtrue。
     */
    ValidateOrthographic(eyeCenterDistance) {
        if (this.forceUpdate || !IsEqual(this.eyeCenterDistance, eyeCenterDistance)) {
            this.eyeCenterDistance = eyeCenterDistance;
            this.forceUpdate = false;
            return false;
        }
        return true;
    }
}

/**
 * カメラの上方向を管理するクラスです。
 */
export class UpVector {
    /**
     * カメラの上方向オブジェクトを初期化します。
     */
    constructor() {
        this.direction = Direction.Y;
        this.isFixed = true;
        this.isFlipped = false;
    }

    /**
     * カメラの上方向を設定します。
     * @param {Direction} newDirection 新しい上方向を示す定数。
     * @param {Camera} oldCamera 古いカメラオブジェクト。
     * @returns {Camera} 新しいカメラオブジェクト。
     */
    SetDirection(newDirection, oldCamera) {
        this.direction = newDirection;
        this.isFlipped = false;

        let defaultCamera = GetDefaultCamera(this.direction);
        let defaultDir = SubCoord3D(defaultCamera.eye, defaultCamera.center);

        let distance = CoordDistance3D(oldCamera.center, oldCamera.eye);
        let newEye = oldCamera.center.Clone().Offset(defaultDir, distance);

        let newCamera = oldCamera.Clone();
        if (this.direction === Direction.X) {
            newCamera.up = new Coord3D(1.0, 0.0, 0.0);
            newCamera.eye = newEye;
        } else if (this.direction === Direction.Y) {
            newCamera.up = new Coord3D(0.0, 1.0, 0.0);
            newCamera.eye = newEye;
        } else if (this.direction === Direction.Z) {
            newCamera.up = new Coord3D(0.0, 0.0, 1.0);
            newCamera.eye = newEye;
        }
        return newCamera;
    }

    /**
     * カメラの上方向を固定または解除します。
     * @param {boolean} isFixed 上方向を固定するかどうかを示すフラグ。
     * @param {Camera} oldCamera 古いカメラオブジェクト。
     * @returns {Camera|null} 新しいカメラオブジェクト。上方向が固定されている場合はカメラオブジェクト、そうでない場合はnull。
     */
    SetFixed(isFixed, oldCamera) {
        this.isFixed = isFixed;
        if (this.isFixed) {
            return this.SetDirection(this.direction, oldCamera);
        }
        return null;
    }

    /**
     * カメラの上方向を反転します。
     * @param {Camera} oldCamera 古いカメラオブジェクト。
     * @returns {Camera} 新しいカメラオブジェクト。
     */
    Flip(oldCamera) {
        this.isFlipped = !this.isFlipped;
        let newCamera = oldCamera.Clone();
        newCamera.up.MultiplyScalar(-1.0);
        return newCamera;
    }
}

/**
 * Viewerクラスは3Dモデルの表示と操作を管理します。
 */
export class Viewer {
    /**
     * Viewerオブジェクトを初期化します。
     * @constructor
     */
    constructor() {
        // カラーマネージメントを無効にします。
        THREE.ColorManagement.enabled = false;

        // キャンバス要素
        this.canvas = null;
        // レンダラー
        this.renderer = null;
        // シーン
        this.scene = null;
        // メインモデル
        this.mainModel = null;
        // エクストラモデル
        this.extraModel = null;
        // カメラ
        this.camera = null;
        // 投影モード
        this.projectionMode = null;
        // カメラの検証器
        this.cameraValidator = null;
        // シェーディングモデル
        this.shadingModel = null;
        // ナビゲーション
        this.navigation = null;
        // 上方ベクトル
        this.upVector = null;
        // 設定
        this.settings = {
            animationSteps: 40
        };
    }

    /**
     * Viewerを初期化します。
     * @param {HTMLCanvasElement} canvas 3Dモデルを表示するキャンバス要素。
     */
    Init(canvas) {
        // キャンバスを設定
        this.canvas = canvas;
        this.canvas.id = 'viewer';

        // レンダラーパラメーター
        let parameters = {
            canvas: this.canvas,
            antialias: true
        };

        // レンダラーを初期化
        this.renderer = new THREE.WebGLRenderer(parameters);
        this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

        // デバイスピクセル比を考慮して設定
        if (window.devicePixelRatio) {
            this.renderer.setPixelRatio(window.devicePixelRatio);
        }
        // 背景色を設定
        this.renderer.setClearColor('#ffffff', 1.0);
        // サイズを設定
        this.renderer.setSize(this.canvas.width, this.canvas.height);

        // シーンを初期化
        this.scene = new THREE.Scene();
        // メインモデルを初期化
        this.mainModel = new ViewerMainModel(this.scene);
        // エクストラモデルを初期化
        this.extraModel = new ViewerModel(this.scene);

        // ナビゲーションとシェーディングを初期化
        this.InitNavigation();
        this.InitShading();

        // 初期描画
        this.Render();
    }

    /**
     * マウスクリックのイベントハンドラーを設定します。
     * @param {Function} onMouseClick マウスクリックのイベントハンドラー関数。
     */
    SetMouseClickHandler(onMouseClick) {
        this.navigation.SetMouseClickHandler(onMouseClick);
    }

    /**
     * マウス移動のイベントハンドラーを設定します。
     * @param {Function} onMouseMove マウス移動のイベントハンドラー関数。
     */
    SetMouseMoveHandler(onMouseMove) {
        this.navigation.SetMouseMoveHandler(onMouseMove);
    }

    /**
     * コンテキストメニューのイベントハンドラーを設定します。
     * @param {Function} onContext コンテキストメニューのイベントハンドラー関数。
     */
    SetContextMenuHandler(onContext) {
        this.navigation.SetContextMenuHandler(onContext);
    }

    /**
     * エッジの設定を更新します。
     * @param {EdgeSettings} edgeSettings 新しいエッジの設定。
     */
    SetEdgeSettings(edgeSettings) {
        // 新しいエッジの設定を複製します。
        let newEdgeSettings = edgeSettings.Clone();
        // メインモデルにエッジの設定を適用します。
        this.mainModel.SetEdgeSettings(newEdgeSettings);
        // 描画を更新します。
        this.Render();
    }

    /**
     * 環境マップの設定を更新します。
     * @param {EnvironmentSettings} environmentSettings 新しい環境マップの設定。
     */
    SetEnvironmentMapSettings(environmentSettings) {
        // 新しい環境マップの設定を複製します。
        let newEnvironmentSettings = environmentSettings.Clone();
        // シェーディングモデルに環境マップの設定を適用します。
        this.shadingModel.SetEnvironmentMapSettings(newEnvironmentSettings, () => {
            // 描画を更新します。
            this.Render();
        });
        // シェーディングを更新します。
        this.shadingModel.UpdateShading();
        // 描画を更新します。
        this.Render();
    }

    /**
     * 背景色を設定します。
     * @param {Color} color 新しい背景色。
     */
    SetBackgroundColor(color) {
        // 背景色をTHREE.Colorオブジェクトに変換します。
        let bgColor = new THREE.Color(
            ColorComponentToFloat(color.r),
            ColorComponentToFloat(color.g),
            ColorComponentToFloat(color.b)
        );
        // アルファ値を取得します。
        let alpha = ColorComponentToFloat(color.a);
        // レンダラーの背景色を設定します。
        this.renderer.setClearColor(bgColor, alpha);
        // 描画を更新します。
        this.Render();
    }

    /**
     * キャンバス要素を取得します。
     * @returns {HTMLCanvasElement} キャンバス要素。
     */
    GetCanvas() {
        return this.canvas;
    }

    /**
     * カメラを取得します。
     * @returns {Camera} カメラ。
     */
    GetCamera() {
        return this.navigation.GetCamera();
    }

    /**
     * 投影モードを取得します。
     * @returns {ProjectionMode} 投影モード。
     */
    GetProjectionMode() {
        return this.projectionMode;
    }

    /**
     * カメラを設定します。
     * @param {Camera} camera 新しいカメラ。
     */
    SetCamera(camera) {
        // カメラを設定します。
        this.navigation.SetCamera(camera);
        // カメラの検証を強制更新します。
        this.cameraValidator.ForceUpdate();
        // 描画を更新します。
        this.Render();
    }

    /**
     * 投影モードを設定します。
     * @param {ProjectionMode} projectionMode 新しい投影モード。
     */
    SetProjectionMode(projectionMode) {
        // 現在の投影モードと同じ場合は何もしません。
        if (this.projectionMode === projectionMode) {
            return;
        }

        // シーンから現在のカメラを削除します。
        this.scene.remove(this.camera);
        // 新しいカメラを作成します。
        if (projectionMode === ProjectionMode.Perspective) {
            this.camera = new THREE.PerspectiveCamera(45.0, 1.0, 0.1, 1000.0);
        } else if (projectionMode === ProjectionMode.Orthographic) {
            this.camera = new THREE.OrthographicCamera(-1.0, 1.0, 1.0, -1.0, 0.1, 1000.0);
        }
        // シーンに新しいカメラを追加します。
        this.scene.add(this.camera);

        // 投影モードを更新します。
        this.projectionMode = projectionMode;
        // シェーディングモデルに投影モードを設定します。
        this.shadingModel.SetProjectionMode(projectionMode);
        // カメラの検証を強制更新します。
        this.cameraValidator.ForceUpdate();

        // クリッピング平面を調整します。
        this.AdjustClippingPlanes();
        // 描画を更新します。
        this.Render();
    }


    /**
     * キャンバスのサイズを変更します。
     * @param {number} width 新しい幅。
     * @param {number} height 新しい高さ。
     */
    Resize(width, height) {
        // キャンバスの内部サイズを取得します。
        let innerSize = GetDomElementInnerDimensions(this.canvas, width, height);
        // レンダラーのサイズを変更します。
        this.ResizeRenderer(innerSize.width, innerSize.height);
    }

    /**
     * レンダラーのサイズを変更します。
     * @param {number} width 新しい幅。
     * @param {number} height 新しい高さ。
     */
    ResizeRenderer(width, height) {
        // デバイスピクセル比を考慮して設定します。
        if (window.devicePixelRatio) {
            this.renderer.setPixelRatio(window.devicePixelRatio);
        }
        // レンダラーのサイズを設定します。
        this.renderer.setSize(width, height);
        // カメラの検証を強制更新します。
        this.cameraValidator.ForceUpdate();
        // 描画を更新します。
        this.Render();
    }

    /**
     * 球体をウィンドウにフィットさせます。
     * @param {BoundingSphere} boundingSphere フィットさせる球体。
     * @param {boolean} animation アニメーションを適用するかどうか。
     */
    FitSphereToWindow(boundingSphere, animation) {
        // 球体が存在しない場合は何もしません。
        if (boundingSphere === null) {
            return;
        }
        // 球体の中心と半径を取得します。
        let center = new Coord3D(boundingSphere.center.x, boundingSphere.center.y, boundingSphere.center.z);
        let radius = boundingSphere.radius;

        // 球体にフィットする新しいカメラを取得します。
        let newCamera = this.navigation.GetFitToSphereCamera(center, radius);
        // カメラを移動します。
        this.navigation.MoveCamera(newCamera, animation ? this.settings.animationSteps : 0);
    }

    /**
     * クリッピング平面を調整します。
     */
    AdjustClippingPlanes() {
        // メッシュのバウンディングスフィアを取得します。
        let boundingSphere = this.GetBoundingSphere((meshUserData) => {
            return true;
        });
        // バウンディングスフィアに基づいてクリッピング平面を調整します。
        this.AdjustClippingPlanesToSphere(boundingSphere);
    }

    /**
     * クリッピング平面を指定した球体に合わせて調整します。
     * @param {BoundingSphere} boundingSphere 調整する球体。
     */
    AdjustClippingPlanesToSphere(boundingSphere) {
        // 球体が存在しない場合は何もしません。
        if (boundingSphere === null) {
            return;
        }
        // 球体の半径に応じてクリッピング平面を設定します。
        if (boundingSphere.radius < 10.0) {
            this.camera.near = 0.01;
            this.camera.far = 100.0;
        } else if (boundingSphere.radius < 100.0) {
            this.camera.near = 0.1;
            this.camera.far = 1000.0;
        } else if (boundingSphere.radius < 1000.0) {
            this.camera.near = 10.0;
            this.camera.far = 10000.0;
        } else {
            this.camera.near = 100.0;
            this.camera.far = 1000000.0;
        }

        // カメラの検証を強制更新します。
        this.cameraValidator.ForceUpdate();
        // 描画を更新します。
        this.Render();
    }

    /**
     * ナビゲーションモードを取得します。
     * @returns {NavigationMode} ナビゲーションモード。
     */
    GetNavigationMode() {
        return this.navigation.GetNavigationMode();
    }

    /**
     * ナビゲーションモードを設定します。
     * @param {NavigationMode} navigationMode 新しいナビゲーションモード。
     */
    SetNavigationMode(navigationMode) {
        // 現在のカメラを取得します。
        let oldCamera = this.navigation.GetCamera();
        // 新しいナビゲーションモードに基づいてカメラを調整します。
        let newCamera = this.upVector.SetFixed(navigationMode === NavigationMode.FixedUpVector, oldCamera);
        // ナビゲーションモードを設定します。
        this.navigation.SetNavigationMode(navigationMode);
        // 新しいカメラがある場合は移動します。
        if (newCamera !== null) {
            this.navigation.MoveCamera(newCamera, this.settings.animationSteps);
        }
        // 描画を更新します。
        this.Render();
    }

    /**
     * アップベクトルを設定します。
     * @param {Direction} upDirection 新しいアップベクトルの方向。
     * @param {boolean} animate アニメーションを適用するかどうか。
     */
    SetUpVector(upDirection, animate) {
        // 現在のカメラを取得します。
        let oldCamera = this.navigation.GetCamera();
        // 新しいアップベクトルに基づいてカメラを調整します。
        let newCamera = this.upVector.SetDirection(upDirection, oldCamera);
        // ベクトルを変更します。
        let animationSteps = animate ? this.settings.animationSteps : 0;
        // カメラを移動します。
        this.navigation.MoveCamera(newCamera, animationSteps);
        // 描画を更新します。
        this.Render();
    }

    /**
     * アップベクトルを反転させます。
     */
    FlipUpVector() {
        // 現在のカメラを取得します。
        let oldCamera = this.navigation.GetCamera();
        // アップベクトルを反転させた新しいカメラを取得します。
        let newCamera = this.upVector.Flip(oldCamera);
        // カメラを移動します。
        this.navigation.MoveCamera(newCamera, 0);
        // 描画を更新します。
        this.Render();
    }

    /**
     * シーンをレンダリングします。
     */
    Render() {
        // ナビゲーション用のカメラを取得します。
        let navigationCamera = this.navigation.GetCamera();

        // カメラの位置を設定します。
        this.camera.position.set(navigationCamera.eye.x, navigationCamera.eye.y, navigationCamera.eye.z);
        // カメラの上方向を設定します。
        this.camera.up.set(navigationCamera.up.x, navigationCamera.up.y, navigationCamera.up.z);
        // カメラの注視点を設定します。
        this.camera.lookAt(new THREE.Vector3(navigationCamera.center.x, navigationCamera.center.y, navigationCamera.center.z));

        // 透視投影モードの場合
        if (this.projectionMode === ProjectionMode.Perspective) {
            // 透視投影の妥当性を検証し、必要に応じて更新します。
            if (!this.cameraValidator.ValidatePerspective()) {
                this.camera.aspect = this.canvas.width / this.canvas.height;
                this.camera.fov = navigationCamera.fov;
                this.camera.updateProjectionMatrix();
            }
        }
        // 正射影モードの場合
        else if (this.projectionMode === ProjectionMode.Orthographic) {
            // カメラと注視点の距離を計算します。
            let eyeCenterDistance = CoordDistance3D(navigationCamera.eye, navigationCamera.center);
            // 正射影の妥当性を検証し、必要に応じて更新します。
            if (!this.cameraValidator.ValidateOrthographic(eyeCenterDistance)) {
                let aspect = this.canvas.width / this.canvas.height;
                let eyeCenterDistance = CoordDistance3D(navigationCamera.eye, navigationCamera.center);
                let frustumHalfHeight = eyeCenterDistance * Math.tan(0.5 * navigationCamera.fov * DegRad);
                this.camera.left = -frustumHalfHeight * aspect;
                this.camera.right = frustumHalfHeight * aspect;
                this.camera.top = frustumHalfHeight;
                this.camera.bottom = -frustumHalfHeight;
                this.camera.updateProjectionMatrix();
            }
        }

        // シェーディングモデルをカメラに応じて更新します。
        this.shadingModel.UpdateByCamera(navigationCamera);
        // シーンをレンダリングします。
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * メインオブジェクトを設定します。
     * @param {object} object メインオブジェクト
     */
    SetMainObject(object) {
        // シェーディングタイプをオブジェクトに応じて取得します。
        const shadingType = GetShadingTypeOfObject(object);
        // メインモデルにメインオブジェクトを設定します。
        this.mainModel.SetMainObject(object);
        // シェーディングタイプを設定します。
        this.shadingModel.SetShadingType(shadingType);

        // シーンをレンダリングします。
        this.Render();
    }

    /**
     * 追加オブジェクトを追加します。
     * @param {object} object 追加オブジェクト
     */
    AddExtraObject(object) {
        // 追加オブジェクトを追加モデルに追加します。
        this.extraModel.AddObject(object);
        // シーンをレンダリングします。
        this.Render();
    }

    /**
     * シーンをクリアします。
     */
    Clear() {
        // メインモデルと追加モデルをクリアします。
        this.mainModel.Clear();
        this.extraModel.Clear();
        // シーンをレンダリングします。
        this.Render();
    }

    /**
     * 追加モデルをクリアします。
     */
    ClearExtra() {
        // 追加モデルをクリアします。
        this.extraModel.Clear();
        // シーンをレンダリングします。
        this.Render();
    }

    /**
     * メッシュの表示を設定します。
     * @param {function} isVisible 表示状態を判断する関数
     */
    SetMeshesVisibility(isVisible) {
        // メッシュと線分を列挙し、表示を設定します。
        this.mainModel.EnumerateMeshesAndLines((mesh) => {
            let visible = isVisible(mesh.userData);
            if (mesh.visible !== visible) {
                mesh.visible = visible;
            }
        });
        // エッジを列挙し、表示を設定します。
        this.mainModel.EnumerateEdges((edge) => {
            let visible = isVisible(edge.userData);
            if (edge.visible !== visible) {
                edge.visible = visible;
            }
        });
        // シーンをレンダリングします。
        this.Render();
    }

    /**
     * メッシュのハイライトを設定します。
     * @param {THREE.Color} highlightColor ハイライトの色
     * @param {function} isHighlighted ハイライト状態を判断する関数
     */
    SetMeshesHighlight(highlightColor, isHighlighted) {
        // エッジや線分が存在するかどうかを確認します。
        let withPolygonOffset = this.mainModel.HasLinesOrEdges();
        // メッシュと線分を列挙し、ハイライトを設定します。
        this.mainModel.EnumerateMeshesAndLines((mesh) => {
            let highlighted = isHighlighted(mesh.userData);
            if (highlighted) {
                // ハイライトが必要な場合、元のマテリアルを保存し、ハイライトマテリアルに置き換えます。
                if (mesh.userData.threeMaterials === null) {
                    mesh.userData.threeMaterials = mesh.material;
                    mesh.material = CreateHighlightMaterials(mesh.userData.threeMaterials, highlightColor, withPolygonOffset);
                }
            } else {
                // ハイライトが不要な場合、元のマテリアルに戻します。
                if (mesh.userData.threeMaterials !== null) {
                    mesh.material = mesh.userData.threeMaterials;
                    mesh.userData.threeMaterials = null;
                }
            }
        });

        // シーンをレンダリングします。
        this.Render();
    }

    /**
     * マウスの下にあるメッシュのユーザーデータを取得します。
     * @param {string} intersectionMode 交差モード
     * @param {THREE.Vector2} mouseCoords マウスの座標
     * @returns {object} マウスの下にあるメッシュのユーザーデータ
     */
    GetMeshUserDataUnderMouse(intersectionMode, mouseCoords) {
        // マウスの下にあるメッシュの交差を取得します。
        let intersection = this.GetMeshIntersectionUnderMouse(intersectionMode, mouseCoords);
        // 交差がない場合は null を返します。
        if (intersection === null) {
            return null;
        }
        // メッシュのユーザーデータを返します。
        return intersection.object.userData;
    }

    /**
     * マウスの下にあるメッシュの交差を取得します。
     * @param {string} intersectionMode 交差モード
     * @param {THREE.Vector2} mouseCoords マウスの座標
     * @returns {object} マウスの下にあるメッシュの交差情報
     */
    GetMeshIntersectionUnderMouse(intersectionMode, mouseCoords) {
        // キャンバスのサイズを取得します。
        let canvasSize = this.GetCanvasSize();
        // マウスの下にあるメッシュの交差情報を取得します。
        let intersection = this.mainModel.GetMeshIntersectionUnderMouse(intersectionMode, mouseCoords, this.camera, canvasSize.width, canvasSize.height);
        // 交差情報がない場合は null を返します。
        if (intersection === null) {
            return null;
        }
        // 交差情報を返します。
        return intersection;
    }

    /**
     * バウンディングボックスを取得します。
     * @param {boolean} needToProcess 処理が必要かどうかを示すフラグ
     * @returns {object} バウンディングボックス
     */
    GetBoundingBox(needToProcess) {
        // バウンディングボックスを取得して返します。
        return this.mainModel.GetBoundingBox(needToProcess);
    }

    /**
     * バウンディングスフィアを取得します。
     * @param {boolean} needToProcess 処理が必要かどうかを示すフラグ
     * @returns {object} バウンディングスフィア
     */
    GetBoundingSphere(needToProcess) {
        // バウンディングスフィアを取得して返します。
        return this.mainModel.GetBoundingSphere(needToProcess);
    }

    /**
     * メッシュと線分のユーザーデータを列挙します。
     * @param {function} enumerator 列挙する関数
     */
    EnumerateMeshesAndLinesUserData(enumerator) {
        // メッシュと線分を列挙し、ユーザーデータを渡します。
        this.mainModel.EnumerateMeshesAndLines((mesh) => {
            enumerator(mesh.userData);
        });
    }

    /**
     * ナビゲーションを初期化します。
     */
    InitNavigation() {
        // デフォルトのカメラを取得します。
        let camera = GetDefaultCamera(Direction.Y);
        // 透視投影カメラを作成します。
        this.camera = new THREE.PerspectiveCamera(45.0, 1.0, 0.1, 1000.0);
        // プロジェクションモードを透視投影に設定します。
        this.projectionMode = ProjectionMode.Perspective;
        // カメラのバリデータを初期化します。
        this.cameraValidator = new CameraValidator();
        // カメラをシーンに追加します。
        this.scene.add(this.camera);

        // キャンバス要素を取得します。
        let canvasElem = this.renderer.domElement;
        // ナビゲーションを初期化します。
        this.navigation = new Navigation(canvasElem, camera, {
            onUpdate: () => {
                this.Render();
            }
        });

        // 上方向ベクトルを初期化します。
        this.upVector = new UpVector();
    }

    /**
     * シェーディングを初期化します。
     */
    InitShading() {
        // シェーディングモデルを初期化します。
        this.shadingModel = new ShadingModel(this.scene);
    }

    /**
     * シェーディングのタイプを取得します。
     * @returns {string} シェーディングのタイプ
     */
    GetShadingType() {
        // シェーディングのタイプを返します。
        return this.shadingModel.type;
    }

    /**
     * 画像のサイズを取得します。
     * @returns {object} 画像の幅と高さ
     */
    GetImageSize() {
        // オリジナルのサイズを取得します。
        let originalSize = new THREE.Vector2();
        this.renderer.getSize(originalSize);
        // 幅と高さを整数値に変換して返します。
        return {
            width: parseInt(originalSize.x, 10),
            height: parseInt(originalSize.y, 10)
        };
    }

    /**
     * キャンバスのサイズを取得します。
     * @returns {object} キャンバスの幅と高さ
     */
    GetCanvasSize() {
        // キャンバスの幅と高さを取得します。
        let width = this.canvas.width;
        let height = this.canvas.height;
        // ウィンドウのデバイスピクセル比を考慮してサイズを調整します。
        if (window.devicePixelRatio) {
            width /= window.devicePixelRatio;
            height /= window.devicePixelRatio;
        }
        // 幅と高さをオブジェクトとして返します。
        return {
            width: width,
            height: height
        };
    }

    /**
     * 指定された幅と高さでキャンバスの画像データURLを取得します。
     * @param {number} width - 画像の幅
     * @param {number} height - 画像の高さ
     * @param {boolean} isTransparent - 透明かどうか
     * @returns {string} 画像データURL
     */
    GetImageAsDataUrl(width, height, isTransparent) {
        // オリジナルの画像サイズを取得します。
        let originalSize = this.GetImageSize();
        // レンダリング用の幅と高さを計算します。
        let renderWidth = width;
        let renderHeight = height;
        if (window.devicePixelRatio) {
            renderWidth /= window.devicePixelRatio;
            renderHeight /= window.devicePixelRatio;
        }
        // 透明な場合、クリアアルファを設定します。
        let clearAlpha = this.renderer.getClearAlpha();
        if (isTransparent) {
            this.renderer.setClearAlpha(0.0);
        }
        // レンダラーをリサイズして再レンダリングします。
        this.ResizeRenderer(renderWidth, renderHeight);
        this.Render();
        // 画像のデータURLを取得します。
        let url = this.renderer.domElement.toDataURL();
        // リサイズを元のサイズに戻します。
        this.ResizeRenderer(originalSize.width, originalSize.height);
        // クリアアルファを元に戻します。
        this.renderer.setClearAlpha(clearAlpha);
        // 画像データURLを返します。
        return url;
    }

    /**
     * Viewerを破棄します。
     */
    Destroy() {
        // クリアしてレンダラーを破棄します。
        this.Clear();
        this.renderer.dispose();
    }
}
