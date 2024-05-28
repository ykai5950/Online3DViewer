// geometry.jsからIsEqual関数をインポート
import { IsEqual } from './geometry.js';

// 2次元座標を表すCoord2Dクラス
export class Coord2D {
	// x座標とy座標を持つCoord2Dオブジェクトを作成するコンストラクタ
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}

	// Coord2Dオブジェクトのクローンを作成するメソッド
	Clone() {
		return new Coord2D(this.x, this.y);
	}
}

// 2次元に射影した3次元座標で囲まれた面積を求めるメソッド
export function Area(points) {
	// 3点以上ない場合
	if (points.length < 3) {
		return 0;
	}

	// 面積を格納する変数を定義
	let area = 0;

	// 面積を加算
	for (let i = 0; i < points.length; i++) {
		if (i < points.length - 1) {
			area += (points[i].x - points[i + 1].x) * (points[i].y + points[i + 1].y);
		} else {
			area += (points[i].x - points[0].x) * (points[i].y + points[0].y);
		}
	}

	return area / 2;
}

// 2つのCoord2Dオブジェクトが等しいかどうかを判定する関数
export function CoordIsEqual2D(a, b) {
	// 2つのCoord2Dオブジェクトのx座標とy座標が等しいかどうかを判定する
	return IsEqual(a.x, b.x) && IsEqual(a.y, b.y);
}

// 2つのCoord2Dオブジェクトを加算する関数
export function AddCoord2D(a, b) {
	// 2つのCoord2Dオブジェクトのx座標とy座標を加算して新しいCoord2Dオブジェクトを返す
	return new Coord2D(a.x + b.x, a.y + b.y);
}

// 2つのCoord2Dオブジェクトを減算する関数
export function SubCoord2D(a, b) {
	// 2つのCoord2Dオブジェクトのx座標とy座標を減算して新しいCoord2Dオブジェクトを返す
	return new Coord2D(a.x - b.x, a.y - b.y);
}

// 2つのCoord2Dオブジェクト間の距離を計算する関数
export function CoordDistance2D(a, b) {
	// 2つのCoord2Dオブジェクト間の距離を計算して返す
	return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
}

// 2つのベクトルの内積を計算する関数
export function DotVector2D(a, b) {
	// 2つのCoord2Dオブジェクトのx座標とy座標の積を計算して返す
	return a.x * b.x + a.y * b.y;
}
