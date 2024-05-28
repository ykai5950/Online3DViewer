import { Coord2D, CoordDistance2D, SubCoord2D } from '../geometry/coord2d.js';
import { CoordDistance3D, CrossVector3D, SubCoord3D, VectorAngle3D } from '../geometry/coord3d.js';
import { DegRad, IsGreater, IsLower, IsZero } from '../geometry/geometry.js';
import { ParabolicTweenFunction, TweenCoord3D } from '../geometry/tween.js';
import { CameraIsEqual3D, NavigationMode } from './camera.js';
import { GetDomElementClientCoordinates } from './domutils.js';

// マウスインタラクションを管理するMouseInteractionクラスの定義
export class MouseInteraction {
	// コンストラクタ: prev、curr、diff、buttonsプロパティを初期化する
	constructor() {
		this.prev = new Coord2D(0.0, 0.0); // 直前のマウス位置
		this.curr = new Coord2D(0.0, 0.0); // 現在のマウス位置
		this.diff = new Coord2D(0.0, 0.0); // 直前の位置からの変位
		this.buttons = []; // 押されているマウスボタンの配列
	}

	// マウスボタンが押されたときの処理
	Down(canvas, ev) {
		this.buttons.push(ev.which); // ボタンが押されたマウスボタンの追加
		this.curr = this.GetPositionFromEvent(canvas, ev); // イベントから現在の位置の取得
		this.prev = this.curr.Clone(); // 直前の位置の更新
	}

	// マウスが移動したときの処理
	Move(canvas, ev) {
		this.curr = this.GetPositionFromEvent(canvas, ev); // イベントから現在の位置の取得
		this.diff = SubCoord2D(this.curr, this.prev); // 直前の位置からの変位の計算
		this.prev = this.curr.Clone(); // 直前の位置の更新
	}

	// マウスボタンが離されたときの処理
	Up(canvas, ev) {
		let buttonIndex = this.buttons.indexOf(ev.which); // 離されたボタンのインデックスを取得
		if (buttonIndex !== -1) {
			this.buttons.splice(buttonIndex, 1); // ボタンの削除
		}
		this.curr = this.GetPositionFromEvent(canvas, ev); // イベントから現在の位置の取得
	}

	// キャンバスからマウスが離れたときの処理
	Leave(canvas, ev) {
		this.buttons = []; // 全てのボタンをクリア
		this.curr = this.GetPositionFromEvent(canvas, ev); // イベントから現在の位置の取得
	}

	// マウスボタンが押されているかどうかを返す
	IsButtonDown() {
		return this.buttons.length > 0;
	}

	// 最後に押されたマウスボタンを返す
	GetButton() {
		let length = this.buttons.length;
		if (length === 0) {
			return 0;
		}
		return this.buttons[length - 1];
	}

	// 現在のマウス位置を返す
	GetPosition() {
		return this.curr;
	}

	// 直前の位置からの変位を返す
	GetMoveDiff() {
		return this.diff;
	}

	// イベントから座標を取得して返す
	GetPositionFromEvent(canvas, ev) {
		return GetDomElementClientCoordinates(canvas, ev.clientX, ev.clientY); // DOM要素の座標系から座標を取得
	}
}


// タッチ操作を管理するTouchInteractionクラスの定義
export class TouchInteraction {
	// コンストラクタ: 初期化
	constructor() {
		this.prevPos = new Coord2D(0.0, 0.0); // 直前のタッチ位置
		this.currPos = new Coord2D(0.0, 0.0); // 現在のタッチ位置
		this.diffPos = new Coord2D(0.0, 0.0); // 直前の位置からの変位
		this.prevDist = 0.0; // 直前のタッチ距離
		this.currDist = 0.0; // 現在のタッチ距離
		this.diffDist = 0.0; // 直前の距離からの変位
		this.fingers = 0; // タッチされた指の数
	}

	// タッチが開始されたときの処理
	Start(canvas, ev) {
		if (ev.touches.length === 0) {
			return;
		}

		this.fingers = ev.touches.length; // タッチされた指の数の取得

		this.currPos = this.GetPositionFromEvent(canvas, ev); // イベントから現在の位置の取得
		this.prevPos = this.currPos.Clone(); // 直前の位置の更新

		this.currDist = this.GetTouchDistanceFromEvent(canvas, ev); // タッチ距離の取得
		this.prevDist = this.currDist;
	}

	// タッチが移動したときの処理
	Move(canvas, ev) {
		if (ev.touches.length === 0) {
			return;
		}

		this.currPos = this.GetPositionFromEvent(canvas, ev); // イベントから現在の位置の取得
		this.diffPos = SubCoord2D(this.currPos, this.prevPos); // 直前の位置からの変位の計算
		this.prevPos = this.currPos.Clone(); // 直前の位置の更新

		this.currDist = this.GetTouchDistanceFromEvent(canvas, ev); // タッチ距離の取得
		this.diffDist = this.currDist - this.prevDist; // 直前の距離からの変位の計算
		this.prevDist = this.currDist;
	}

	// タッチが終了したときの処理
	End(canvas, ev) {
		if (ev.touches.length === 0) {
			return;
		}

		this.fingers = 0; // タッチされた指の数のクリア
		this.currPos = this.GetPositionFromEvent(canvas, ev); // イベントから現在の位置の取得
		this.currDist = this.GetTouchDistanceFromEvent(canvas, ev); // タッチ距離の取得
	}

	// タッチされた指があるかどうかを返す
	IsFingerDown() {
		return this.fingers !== 0;
	}

	// タッチされた指の数を返す
	GetFingerCount() {
		return this.fingers;
	}

	// 現在のタッチ位置を返す
	GetPosition() {
		return this.currPos;
	}

	// タッチ位置の変位を返す
	GetMoveDiff() {
		return this.diffPos;
	}

	// タッチ距離の変位を返す
	GetDistanceDiff() {
		return this.diffDist;
	}

	// イベントから座標を取得して返す
	GetPositionFromEvent(canvas, ev) {
		let coord = null;
		if (ev.touches.length !== 0) {
			let touchEv = ev.touches[0];
			coord = GetDomElementClientCoordinates(canvas, touchEv.pageX, touchEv.pageY);
		}
		return coord;
	}

	// イベントからタッチ距離を計算して返す
	GetTouchDistanceFromEvent(canvas, ev) {
		if (ev.touches.length !== 2) {
			return 0.0;
		}
		let touchEv1 = ev.touches[0];
		let touchEv2 = ev.touches[1];
		let distance = CoordDistance2D(
			GetDomElementClientCoordinates(canvas, touchEv1.pageX, touchEv1.pageY),
			GetDomElementClientCoordinates(canvas, touchEv2.pageX, touchEv2.pageY)
		);
		return distance;
	}
}

// クリックを検出するClickDetectorクラスの定義
export class ClickDetector {
	constructor() {
		this.isClick = false; // クリックが検出されたかどうかのフラグ
		this.startPosition = null; // クリックの開始位置
	}

	// クリックの開始処理
	Start(startPosition) {
		this.isClick = true; // クリックが開始されたことを示すフラグを立てる
		this.startPosition = startPosition; // クリックの開始位置を設定する
	}

	// マウス移動時の処理
	Move(currentPosition) {
		if (!this.isClick) { // クリックが開始されていない場合は処理を行わない
			return;
		}

		if (this.startPosition !== null) {
			const maxClickDistance = 3.0; // クリックとして認識する最大距離
			const currentDistance = CoordDistance2D(this.startPosition, currentPosition); // 現在位置とクリック開始位置の距離を計算
			if (currentDistance > maxClickDistance) { // 距離が最大クリック距離よりも大きい場合はクリックをキャンセルする
				this.Cancel();
			}
		} else {
			this.Cancel(); // クリック開始位置がnullの場合はクリックをキャンセルする
		}
	}

	// クリックの終了処理
	End() {
		this.startPosition = null; // クリック開始位置をnullに設定する
	}

	// クリックをキャンセルする処理
	Cancel() {
		this.isClick = false; // クリックフラグをfalseに設定する
		this.startPosition = null; // クリック開始位置をnullに設定する
	}

	// クリックが検出されたかどうかを返す
	IsClick() {
		return this.isClick; // クリックフラグの値を返す
	}
}


export const NavigationType =
{
	None: 0,
	Orbit: 1,
	Pan: 2,
	Zoom: 3
};

// マウスとタッチのインタラクションを処理するクラス
export class Navigation {
	constructor(canvas, camera, callbacks) {
		this.canvas = canvas; // 対象のキャンバス要素
		this.camera = camera; // カメラオブジェクト
		this.callbacks = callbacks; // コールバック関数のセット
		this.navigationMode = NavigationMode.FixedUpVector; // ナビゲーションモードの初期設定

		// マウス、タッチ、クリックのインタラクションオブジェクトの初期化
		this.mouse = new MouseInteraction();
		this.touch = new TouchInteraction();
		this.clickDetector = new ClickDetector();

		// イベントリスナーの設定
		if (this.canvas.addEventListener) {
			this.canvas.addEventListener('mousedown', this.OnMouseDown.bind(this));
			this.canvas.addEventListener('wheel', this.OnMouseWheel.bind(this));
			this.canvas.addEventListener('touchstart', this.OnTouchStart.bind(this));
			this.canvas.addEventListener('touchmove', this.OnTouchMove.bind(this));
			this.canvas.addEventListener('touchcancel', this.OnTouchEnd.bind(this));
			this.canvas.addEventListener('touchend', this.OnTouchEnd.bind(this));
			this.canvas.addEventListener('contextmenu', this.OnContextMenu.bind(this));
		}
		if (document.addEventListener) {
			document.addEventListener('mousemove', this.OnMouseMove.bind(this));
			document.addEventListener('mouseup', this.OnMouseUp.bind(this));
			document.addEventListener('mouseleave', this.OnMouseLeave.bind(this));
		}
	}

	// マウスクリック時のハンドラを設定するメソッド
	SetMouseClickHandler(onMouseClick) {
		this.onMouseClick = onMouseClick;
	}

	// マウス移動時のハンドラを設定するメソッド
	SetMouseMoveHandler(onMouseMove) {
		this.onMouseMove = onMouseMove;
	}

	// コンテキストメニュー表示時のハンドラを設定するメソッド
	SetContextMenuHandler(onContext) {
		this.onContext = onContext;
	}

	// ナビゲーションモードを取得するメソッド
	GetNavigationMode() {
		return this.navigationMode;
	}

	// ナビゲーションモードを設定するメソッド
	SetNavigationMode(navigationMode) {
		this.navigationMode = navigationMode;
	}

	// カメラオブジェクトを取得するメソッド
	GetCamera() {
		return this.camera;
	}

	// カメラオブジェクトを設定するメソッド
	SetCamera(camera) {
		this.camera = camera;
	}

	// カメラを移動させるメソッド
	MoveCamera(newCamera, stepCount) {
		// カメラを移動させる内部メソッド
		function Step(obj, steps, count, index) {
			obj.camera.eye = steps.eye[index];
			obj.camera.center = steps.center[index];
			obj.camera.up = steps.up[index];
			obj.Update();

			if (index < count - 1) {
				requestAnimationFrame(() => {
					Step(obj, steps, count, index + 1);
				});
			}
		}

		if (newCamera === null) {
			return;
		}

		// ステップ数が0またはカメラが同じ場合は即座にカメラを設定する
		if (stepCount === 0 || CameraIsEqual3D(this.camera, newCamera)) {
			this.camera = newCamera;
		} else {
			let tweenFunc = ParabolicTweenFunction; // ツイーン関数の選択
			let steps = {
				eye: TweenCoord3D(this.camera.eye, newCamera.eye, stepCount, tweenFunc), // eye座標のツイーン
				center: TweenCoord3D(this.camera.center, newCamera.center, stepCount, tweenFunc), // center座標のツイーン
				up: TweenCoord3D(this.camera.up, newCamera.up, stepCount, tweenFunc) // up座標のツイーン
			};
			requestAnimationFrame(() => {
				Step(this, steps, stepCount, 0);
			});
		}

		this.Update(); // カメラの変更を反映する
	}


	// 球にフィットするカメラを取得するメソッド
	GetFitToSphereCamera(center, radius) {
		// 半径がゼロの場合はnullを返す
		if (IsZero(radius)) {
			return null;
		}

		// カメラのクローンを作成
		let fitCamera = this.camera.Clone();

		// 中心から原点へのオフセットを計算
		let offsetToOrigo = SubCoord3D(fitCamera.center, center);
		fitCamera.eye = SubCoord3D(fitCamera.eye, offsetToOrigo);
		fitCamera.center = center.Clone();

		// 中心から視点までの方向ベクトルを取得し、正規化する
		let centerEyeDirection = SubCoord3D(fitCamera.eye, fitCamera.center).Normalize();

		// 画角を計算
		let fieldOfView = this.camera.fov / 2.0;
		if (this.canvas.width < this.canvas.height) {
			fieldOfView = fieldOfView * this.canvas.width / this.canvas.height;
		}

		// 距離を計算
		let distance = radius / Math.sin(fieldOfView * DegRad);

		// カメラの位置を調整して球にフィットさせる
		fitCamera.eye = fitCamera.center.Clone().Offset(centerEyeDirection, distance);

		return fitCamera;
	}

	// マウスダウン時のイベントハンドラ
	OnMouseDown(ev) {
		ev.preventDefault();

		// マウスのダウンイベントを処理
		this.mouse.Down(this.canvas, ev);
		this.clickDetector.Start(this.mouse.GetPosition());
	}

	// マウス移動時のイベントハンドラ
	OnMouseMove(ev) {
		// マウスの移動イベントを処理
		this.mouse.Move(this.canvas, ev);
		this.clickDetector.Move(this.mouse.GetPosition());

		// マウス移動ハンドラが設定されている場合、座標を取得して処理を実行
		if (this.onMouseMove) {
			let mouseCoords = GetDomElementClientCoordinates(this.canvas, ev.clientX, ev.clientY);
			this.onMouseMove(mouseCoords);
		}

		// マウスがボタンを押しているかどうかを確認し、適切なナビゲーションを実行
		if (!this.mouse.IsButtonDown()) {
			return;
		}

		// マウスボタンの種類に応じたナビゲーションを実行
		let moveDiff = this.mouse.GetMoveDiff();
		let mouseButton = this.mouse.GetButton();
		let navigationType = NavigationType.None;

		// マウスボタンによるナビゲーションタイプを設定
		if (mouseButton === 1) {
			if (ev.ctrlKey) {
				navigationType = NavigationType.Zoom;
			} else if (ev.shiftKey) {
				navigationType = NavigationType.Pan;
			} else {
				navigationType = NavigationType.Orbit;
			}
		} else if (mouseButton === 2 || mouseButton === 3) {
			navigationType = NavigationType.Pan;
		}

		// ナビゲーションを実行
		if (navigationType === NavigationType.Orbit) {
			let orbitRatio = 0.1;
			this.Orbit(moveDiff.x * orbitRatio, moveDiff.y * orbitRatio);
		} else if (navigationType === NavigationType.Pan) {
			let eyeCenterDistance = CoordDistance3D(this.camera.eye, this.camera.center);
			let panRatio = 0.001 * eyeCenterDistance;
			this.Pan(moveDiff.x * panRatio, moveDiff.y * panRatio);
		} else if (navigationType === NavigationType.Zoom) {
			let zoomRatio = 0.005;
			this.Zoom(-moveDiff.y * zoomRatio);
		}

		// カメラの変更を反映する
		this.Update();
	}

	// マウスアップ時のイベントハンドラ
	OnMouseUp(ev) {
		// マウスのアップイベントを処理
		this.mouse.Up(this.canvas, ev);
		this.clickDetector.End();

		// クリックを検出し、クリックイベントを実行
		if (this.clickDetector.IsClick()) {
			let mouseCoords = this.mouse.GetPosition();
			this.Click(ev.which, mouseCoords);
		}
	}

	// マウス離脱時のイベントハンドラ
	OnMouseLeave(ev) {
		// マウスの離脱イベントを処理
		this.mouse.Leave(this.canvas, ev);
		this.clickDetector.Cancel();
	}

	// タッチ開始時のイベントハンドラ
	OnTouchStart(ev) {
		ev.preventDefault();

		// タッチの開始イベントを処理
		this.touch.Start(this.canvas, ev);
		this.clickDetector.Start(this.touch.GetPosition());
	}

	// タッチ移動時のイベントハンドラ
	OnTouchMove(ev) {
		ev.preventDefault();

		// タッチの移動イベントを処理
		this.touch.Move(this.canvas, ev);
		this.clickDetector.Move(this.touch.GetPosition());

		// 指が触れているかどうかを確認し、適切なナビゲーションを実行
		if (!this.touch.IsFingerDown()) {
			return;
		}

		// 移動量と距離の変化を取得
		let moveDiff = this.touch.GetMoveDiff();
		let distanceDiff = this.touch.GetDistanceDiff();
		let fingerCount = this.touch.GetFingerCount();

		// ナビゲーションタイプを設定
		let navigationType = NavigationType.None;
		if (fingerCount === 1) {
			navigationType = NavigationType.Orbit;
		} else if (fingerCount === 2) {
			navigationType = NavigationType.Pan;
		}

		// ナビゲーションを実行
		if (navigationType === NavigationType.Orbit) {
			// オービット操作の割合を設定して実行
			let orbitRatio = 0.5;
			this.Orbit(moveDiff.x * orbitRatio, moveDiff.y * orbitRatio);
		} else if (navigationType === NavigationType.Pan) {
			// ズームとパンの割合を設定して実行
			let zoomRatio = 0.005;
			this.Zoom(distanceDiff * zoomRatio);
			let panRatio = 0.001 * CoordDistance3D(this.camera.eye, this.camera.center);
			this.Pan(moveDiff.x * panRatio, moveDiff.y * panRatio);
		}

		// カメラの更新を反映する
		this.Update();
	}

	// タッチ終了時のイベントハンドラ
	OnTouchEnd(ev) {
		ev.preventDefault();

		// タッチの終了イベントを処理
		this.touch.End(this.canvas, ev);
		this.clickDetector.End();

		// クリックを検出し、クリックイベントを実行
		if (this.clickDetector.IsClick()) {
			let touchCoords = this.touch.GetPosition();
			if (this.touch.GetFingerCount() === 1) {
				this.Click(1, touchCoords);
			}
		}
	}

	// マウスホイール時のイベントハンドラ
	OnMouseWheel(ev) {
		let params = ev || window.event;
		params.preventDefault();

		// ホイールの移動量を取得し、ズーム倍率を設定してズームする
		let delta = -params.deltaY / 40;
		let ratio = 0.1;
		if (delta < 0) {
			ratio = ratio * -1.0;
		}
		this.Zoom(ratio);

		// カメラの更新を反映する
		this.Update();
	}

	// コンテキストメニュー時のイベントハンドラ
	OnContextMenu(ev) {
		ev.preventDefault();

		// クリックを検出し、コンテキストメニューイベントを実行
		if (this.clickDetector.IsClick()) {
			this.Context(ev.clientX, ev.clientY);
			this.clickDetector.Cancel();
		}
	}

	// カメラをオービットさせるメソッド
	Orbit(angleX, angleY) {
		// 角度をラジアンに変換
		let radAngleX = angleX * DegRad;
		let radAngleY = angleY * DegRad;

		// 視線の方向ベクトルと水平方向ベクトルを取得して正規化
		let viewDirection = SubCoord3D(this.camera.center, this.camera.eye).Normalize();
		let horizontalDirection = CrossVector3D(viewDirection, this.camera.up).Normalize();

		// ナビゲーションモードによって処理を分岐
		if (this.navigationMode === NavigationMode.FixedUpVector) {
			// 視線と上方向の角度を調整し、新しい角度を計算
			let originalAngle = VectorAngle3D(viewDirection, this.camera.up);
			let newAngle = originalAngle + radAngleY;

			// 新しい角度が0からπの範囲内にある場合、水平方向による回転を適用
			if (IsGreater(newAngle, 0.0) && IsLower(newAngle, Math.PI)) {
				this.camera.eye.Rotate(horizontalDirection, -radAngleY, this.camera.center);
			}
			// 水平方向と上方向による回転を適用
			this.camera.eye.Rotate(this.camera.up, -radAngleX, this.camera.center);
		} else if (this.navigationMode === NavigationMode.FreeOrbit) {
			// 自由なオービットモードの場合、垂直方向ベクトルを計算して正規化し、回転を適用
			let verticalDirection = CrossVector3D(horizontalDirection, viewDirection).Normalize();
			this.camera.eye.Rotate(horizontalDirection, -radAngleY, this.camera.center);
			this.camera.eye.Rotate(verticalDirection, -radAngleX, this.camera.center);
			this.camera.up = verticalDirection;
		}
	}

	// カメラをパンさせるメソッド
	Pan(moveX, moveY) {
		// 視線の方向ベクトルと水平・垂直方向ベクトルを取得して正規化
		let viewDirection = SubCoord3D(this.camera.center, this.camera.eye).Normalize();
		let horizontalDirection = CrossVector3D(viewDirection, this.camera.up).Normalize();
		let verticalDirection = CrossVector3D(horizontalDirection, viewDirection).Normalize();

		// 水平方向に移動してカメラをパンさせる
		this.camera.eye.Offset(horizontalDirection, -moveX);
		this.camera.center.Offset(horizontalDirection, -moveX);

		// 垂直方向に移動してカメラをパンさせる
		this.camera.eye.Offset(verticalDirection, moveY);
		this.camera.center.Offset(verticalDirection, moveY);
	}

	// カメラをズームさせるメソッド
	Zoom(ratio) {
		// 視線の方向ベクトルと距離を取得
		let direction = SubCoord3D(this.camera.center, this.camera.eye);
		let distance = direction.Length();

		// 移動量を計算してカメラをズームさせる
		let move = distance * ratio;
		this.camera.eye.Offset(direction, move);
	}

	// カメラの更新を実行するメソッド
	Update() {
		// コールバック関数を実行してカメラの更新を反映
		this.callbacks.onUpdate();
	}

	// マウスクリックを処理するメソッド
	Click(button, mouseCoords) {
		// マウスクリックイベントが登録されている場合、それを実行
		if (this.onMouseClick) {
			this.onMouseClick(button, mouseCoords);
		}
	}

	// コンテキストメニューを処理するメソッド
	Context(clientX, clientY) {
		// コンテキストメニューイベントが登録されている場合、グローバル座標とローカル座標を取得して実行
		if (this.onContext) {
			let globalCoords = {
				x: clientX,
				y: clientY
			};
			let localCoords = GetDomElementClientCoordinates(this.canvas, clientX, clientY);
			this.onContext(globalCoords, localCoords);
		}
	}
}
