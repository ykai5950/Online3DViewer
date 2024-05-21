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
