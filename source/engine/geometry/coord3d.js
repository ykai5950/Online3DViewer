import { IsEqual } from './geometry.js';
import { eigs, re } from 'mathjs';
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

// 平均を計算する関数
function Mean(points) {
	let sum = points.reduce((acc, point) => {
		// 各座標の合計を計算
		acc.x += point.x;
		acc.y += point.y;
		acc.z += point.z;
		return acc;
	}, { x: 0, y: 0, z: 0 });  // 合計を初期化

	let n = points.length;  // ポイントの数を取得
	return { x: sum.x / n, y: sum.y / n, z: sum.z / n };  // 各座標の平均を返す
}

// 共分散行列を計算する関数
function CovarianceMatrix(points, mean) {
	let matrix = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];  // 共分散行列を初期化
	points.forEach(point => {
		let dx = point.x - mean.x;
		let dy = point.y - mean.y;
		let dz = point.z - mean.z;

		// 共分散行列の要素を計算
		matrix[0][0] += dx * dx;
		matrix[0][1] += dx * dy;
		matrix[0][2] += dx * dz;
		matrix[1][1] += dy * dy;
		matrix[1][2] += dy * dz;
		matrix[2][2] += dz * dz;
	});

	let n = points.length;  // ポイントの数を取得
	// 共分散行列の各要素を平均値で割る
	matrix[0][0] /= n;
	matrix[0][1] /= n;
	matrix[0][2] /= n;
	matrix[1][1] /= n;
	matrix[1][2] /= n;
	matrix[2][2] /= n;
	// 共分散行列は対称行列なので、対角線上の要素をコピーする
	matrix[1][0] = matrix[0][1];
	matrix[2][0] = matrix[0][2];
	matrix[2][1] = matrix[1][2];

	return matrix;  // 共分散行列を返す
}

// 固有値と固有ベクトルを計算する関数
function Eig(matrix) {
	// math.js の機能を使用して固有値と固有ベクトルを計算
	const eigResult = eigs(matrix);

	// math.js は複素数も扱えるため、実部のみを取得
	const eigenvalues = eigResult.values.map(value => re(value));
	const eigenvectors = eigResult.vectors.toArray(); // 固有ベクトルは math.js の行列形式から通常の配列に変換

	return {
		values: eigenvalues,
		vectors: eigenvectors
	};
}

// 3つの点から平面を計算する関数
function PlaneFromPoints(points) {
	let avg = Mean(points);  // ポイントの平均を計算
	let covMatrix = CovarianceMatrix(points, avg);  // 共分散行列を計算
	let eigen = Eig(covMatrix);  // 固有値と固有ベクトルを計算

	let normal = eigen.vectors[0];  // 最小の固有値に対応する最初の固有ベクトルを法線として使用
	return { normal: normal, point: avg };  // 平面の法線と点を返す
}

// 点を平面に投影する関数
function ProjectPointOntoPlane(point, plane) {
	let { normal, point: planePoint } = plane;  // 平面の法線と点を取得
	let diff = {
		x: point.x - planePoint.x,
		y: point.y - planePoint.y,
		z: point.z - planePoint.z
	};

	// 平面への距離を計算
	let dist = diff.x * normal[0] + diff.y * normal[1] + diff.z * normal[2];
	// 平面上への点の投影を計算
	return {
		x: point.x - dist * normal[0],
		y: point.y - dist * normal[1],
		z: point.z - dist * normal[2]
	};
}

// 点群を2D平面に射影する関数
function ProjectPointsOnto2D(points, plane) {
	let { normal, point: planePoint } = plane;  // 平面の法線と点を取得
	let basis = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];  // 単純な直交基底

	return points.map(point => {
		let projected = ProjectPointOntoPlane(point, plane);  // 平面への点の投影を計算
		return {
			x: projected.x - planePoint.x,
			y: projected.y - planePoint.y
		};
	});
}

// 2D平面上の面積を計算する関数
function CalculateArea2D(points) {
	let n = points.length;  // ポイントの数を取得
	let area = 0;

	for (let i = 0; i < n; i++) {
		let j = (i + 1) % n;
		// 多角形の面積を計算
		area += points[i].x * points[j].y;
		area -= points[i].y * points[j].x;
	}

	area = Math.abs(area) / 2.0;  // 面積を正の値にする
	return area;  // 面積を返す
}

// 3D空間の面積を計算する関数
export function CalculateArea3D(points) {
	let plane = PlaneFromPoints(points);  // 3つの点から平面を計算
	let projectedPoints = ProjectPointsOnto2D(points, plane);  // 点群を2D平面に射影
	return CalculateArea2D(projectedPoints);  // 2D平面上の面積を計算
}
