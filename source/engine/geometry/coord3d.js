import { IsEqual } from './geometry.js';

// Coord3Dクラスは3次元座標を表すクラスです
export class Coord3D {
	// コンストラクタ: x, y, zの3つの座標値を受け取り、Coord3Dオブジェクトを生成します
	constructor(x, y, z) {
		this.x = x; // x座標
		this.y = y; // y座標
		this.z = z; // z座標
	}

	// 3次元座標の長さを計算するメソッドです
	Length() {
		return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
	}

	// 3次元座標にスカラー値を乗算するメソッドです
	MultiplyScalar(scalar) {
		this.x *= scalar;
		this.y *= scalar;
		this.z *= scalar;
		return this;
	}

	// 3次元座標を正規化するメソッドです
	Normalize() {
		let length = this.Length();
		if (length > 0.0) {
			this.MultiplyScalar(1.0 / length);
		}
		return this;
	}

	// 3次元座標を指定した方向と距離だけオフセットするメソッドです
	Offset(direction, distance) {
		let normal = direction.Clone().Normalize();
		this.x += normal.x * distance;
		this.y += normal.y * distance;
		this.z += normal.z * distance;
		return this;
	}

	// 3次元座標を指定した軸と角度、原点を中心に回転するメソッドです
	Rotate(axis, angle, origo) {
		// 回転軸を正規化したベクトルを取得します
		let normal = axis.Clone().Normalize();

		// 回転軸の各成分を変数に代入します
		let u = normal.x;
		let v = normal.y;
		let w = normal.z;

		// 座標を原点を中心に移動させます
		let x = this.x - origo.x;
		let y = this.y - origo.y;
		let z = this.z - origo.z;

		// sinとcosの値を計算します
		let si = Math.sin(angle);
		let co = Math.cos(angle);

		// 座標を回転させます
		// 回転行列の計算式を使って、x, y, zの新しい値を計算します
		this.x = - u * (- u * x - v * y - w * z) * (1.0 - co) + x * co + (- w * y + v * z) * si;
		this.y = - v * (- u * x - v * y - w * z) * (1.0 - co) + y * co + (w * x - u * z) * si;
		this.z = - w * (- u * x - v * y - w * z) * (1.0 - co) + z * co + (- v * x + u * y) * si;

		// 座標を元の位置に戻します
		this.x += origo.x;
		this.y += origo.y;
		this.z += origo.z;
		return this;
	}


	// 3次元座標のクローンを生成するメソッドです
	Clone() {
		return new Coord3D(this.x, this.y, this.z);
	}
}

// 2つの3次元座標が等しいかどうかを判定する関数です
export function CoordIsEqual3D(a, b) {
	return IsEqual(a.x, b.x) && IsEqual(a.y, b.y) && IsEqual(a.z, b.z);
}

// 2つの3次元座標を加算する関数です
export function AddCoord3D(a, b) {
	return new Coord3D(a.x + b.x, a.y + b.y, a.z + b.z);
}

// 2つの3次元座標を減算する関数です
export function SubCoord3D(a, b) {
	return new Coord3D(a.x - b.x, a.y - b.y, a.z - b.z);
}

// 2つの3次元座標間の距離を計算する関数です
export function CoordDistance3D(a, b) {
	return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y) + (a.z - b.z) * (a.z - b.z));
}

// 2つの3次元ベクトルの内積を計算する関数です
export function DotVector3D(a, b) {
	return a.x * b.x + a.y * b.y + a.z * b.z;
}

// 2つの3次元ベクトルの角度を計算する関数です
export function VectorAngle3D(a, b) {
	let aDirection = a.Clone().Normalize();
	let bDirection = b.Clone().Normalize();
	if (CoordIsEqual3D(aDirection, bDirection)) {
		return 0.0;
	}
	let product = DotVector3D(aDirection, bDirection);
	return Math.acos(product);
}

// 2つの3次元ベクトルの外積を計算する関数です
export function CrossVector3D(a, b) {
	let result = new Coord3D(0.0, 0.0, 0.0);
	result.x = a.y * b.z - a.z * b.y;
	result.y = a.z * b.x - a.x * b.z;
	result.z = a.x * b.y - a.y * b.x;
	return result;
}

// 3次元ベクトルの長さを計算する関数です
export function VectorLength3D(x, y, z) {
	return Math.sqrt(x * x + y * y + z * z);
}

// 配列を3次元座標に変換する関数です
export function ArrayToCoord3D(arr) {
	return new Coord3D(arr[0], arr[1], arr[2]);
}
