import { IsEqual } from './geometry.js'; // 座標が等しいかを確認する関数をインポート

// Quaternionクラスの定義
export class Quaternion {
	// コンストラクタ
	constructor(x, y, z, w) {
		this.x = x; // クォータニオンのx成分
		this.y = y; // クォータニオンのy成分
		this.z = z; // クォータニオンのz成分
		this.w = w; // クォータニオンのw成分
	}
}

// クォータニオンが等しいかを確認する関数
export function QuaternionIsEqual(a, b) {
	return IsEqual(a.x, b.x) && IsEqual(a.y, b.y) && IsEqual(a.z, b.z) && IsEqual(a.w, b.w);
	// 各成分がすべて等しい場合にtrueを返す
}

// 配列をクォータニオンに変換する関数
export function ArrayToQuaternion(arr) {
	return new Quaternion(arr[0], arr[1], arr[2], arr[3]); // 配列の要素を使用してクォータニオンを作成
}

// 軸と角度からクォータニオンを生成する関数
export function QuaternionFromAxisAngle(axis, angle) {
	const a = angle / 2.0; // 角度の半分
	const s = Math.sin(a); // 半角のサイン

	return new Quaternion(
		axis.x * s, // x成分
		axis.y * s, // y成分
		axis.z * s, // z成分
		Math.cos(a) // w成分
	);
}

// XYZ回転角からクォータニオンを生成する関数
export function QuaternionFromXYZ(x, y, z, mode) {

	const c1 = Math.cos(x / 2.0); // x回転角のコサイン
	const c2 = Math.cos(y / 2.0); // y回転角のコサイン
	const c3 = Math.cos(z / 2.0); // z回転角のコサイン

	const s1 = Math.sin(x / 2.0); // x回転角のサイン
	const s2 = Math.sin(y / 2.0); // y回転角のサイン
	const s3 = Math.sin(z / 2.0); // z回転角のサイン

	let quaternion = new Quaternion(0.0, 0.0, 0.0, 1.0); // 初期化されたクォータニオン

	// 各回転順序に対するクォータニオンの計算
	if (mode === 'XYZ') {
		quaternion.x = s1 * c2 * c3 + c1 * s2 * s3;
		quaternion.y = c1 * s2 * c3 - s1 * c2 * s3;
		quaternion.z = c1 * c2 * s3 + s1 * s2 * c3;
		quaternion.w = c1 * c2 * c3 - s1 * s2 * s3;
	} else if (mode === 'YXZ') {
		quaternion.x = s1 * c2 * c3 + c1 * s2 * s3;
		quaternion.y = c1 * s2 * c3 - s1 * c2 * s3;
		quaternion.z = c1 * c2 * s3 - s1 * s2 * c3;
		quaternion.w = c1 * c2 * c3 + s1 * s2 * s3;
	} else if (mode === 'ZXY') {
		quaternion.x = s1 * c2 * c3 - c1 * s2 * s3;
		quaternion.y = c1 * s2 * c3 + s1 * c2 * s3;
		quaternion.z = c1 * c2 * s3 + s1 * s2 * c3;
		quaternion.w = c1 * c2 * c3 - s1 * s2 * s3;
	} else if (mode === 'ZYX') {
		quaternion.x = s1 * c2 * c3 - c1 * s2 * s3;
		quaternion.y = c1 * s2 * c3 + s1 * c2 * s3;
		quaternion.z = c1 * c2 * s3 - s1 * s2 * c3;
		quaternion.w = c1 * c2 * c3 + s1 * s2 * s3;
	} else if (mode === 'YZX') {
		quaternion.x = s1 * c2 * c3 + c1 * s2 * s3;
		quaternion.y = c1 * s2 * c3 + s1 * c2 * s3;
		quaternion.z = c1 * c2 * s3 - s1 * s2 * c3;
		quaternion.w = c1 * c2 * c3 - s1 * s2 * s3;
	} else if (mode === 'XZY') {
		quaternion.x = s1 * c2 * c3 - c1 * s2 * s3;
		quaternion.y = c1 * s2 * c3 - s1 * c2 * s3;
		quaternion.z = c1 * c2 * s3 + s1 * s2 * c3;
		quaternion.w = c1 * c2 * c3 + s1 * s2 * s3;
	} else {
		return null; // 無効なモードの場合はnullを返す
	}

	return quaternion; // 計算されたクォータニオンを返す
}
