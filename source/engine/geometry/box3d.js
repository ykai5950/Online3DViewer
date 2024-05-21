// coord3d.jsからCoord3Dクラスをインポート
import { Coord3D } from './coord3d.js';

// 3次元ボックスを表すBox3Dクラス
export class Box3D {
    // 最小座標と最大座標を持つBox3Dオブジェクトを作成するコンストラクタ
    constructor(min, max) {
        this.min = min;
        this.max = max;
    }

    // 最小座標を取得するメソッド
    GetMin() {
        return this.min;
    }

    // 最大座標を取得するメソッド
    GetMax() {
        return this.max;
    }

    // ボックスの中心座標を取得するメソッド
    GetCenter() {
        return new Coord3D(
            (this.min.x + this.max.x) / 2.0,
            (this.min.y + this.max.y) / 2.0,
            (this.min.z + this.max.z) / 2.0
        );
    }
}

// 3次元バウンディングボックスを計算するためのBoundingBoxCalculator3Dクラス
export class BoundingBoxCalculator3D {
    // コンストラクタ
    constructor() {
        // ボックスの初期値を設定
        this.box = new Box3D(
            new Coord3D(Infinity, Infinity, Infinity),
            new Coord3D(-Infinity, -Infinity, -Infinity)
        );
        this.isValid = false; // ボックスが有効かどうかを示すフラグ
    }

    // ボックスを取得するメソッド
    GetBox() {
        if (!this.isValid) {
            return null; // ボックスが無効な場合はnullを返す
        }
        return this.box;
    }

    // 点を追加してボックスを更新するメソッド
    AddPoint(point) {
        // ボックスの最小座標と最大座標を更新
        this.box.min.x = Math.min(this.box.min.x, point.x);
        this.box.min.y = Math.min(this.box.min.y, point.y);
        this.box.min.z = Math.min(this.box.min.z, point.z);
        this.box.max.x = Math.max(this.box.max.x, point.x);
        this.box.max.y = Math.max(this.box.max.y, point.y);
        this.box.max.z = Math.max(this.box.max.z, point.z);
        this.isValid = true; // ボックスを有効にする
    }
}
