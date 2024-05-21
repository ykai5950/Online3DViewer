import { CoordDistance3D, SubCoord3D } from './coord3d.js'; // 3D座標の距離計算と座標の引き算を扱う関数をインポート

// ベジエ補間関数
export function BezierTweenFunction(distance, index, count) {
	let t = index / count; // 補間係数tを計算
	return distance * (t * t * (3.0 - 2.0 * t)); // ベジエ補間の計算
}

// 線形補間関数
export function LinearTweenFunction(distance, index, count) {
	return index * distance / count; // 線形補間の計算
}

// 放物線補間関数
export function ParabolicTweenFunction(distance, index, count) {
	let t = index / count; // 補間係数tを計算
	let t2 = t * t; // tの二乗を計算
	return distance * (t2 / (2.0 * (t2 - t) + 1.0)); // 放物線補間の計算
}

// 3D座標の補間関数
export function TweenCoord3D(a, b, count, tweenFunc) {
	let dir = SubCoord3D(b, a).Normalize(); // aからbへの方向ベクトルを計算して正規化
	let distance = CoordDistance3D(a, b); // aからbまでの距離を計算
	let result = []; // 補間結果を格納する配列
	for (let i = 0; i < count; i++) {
		let step = tweenFunc(distance, i, count - 1); // 補間関数を使ってステップを計算
		result.push(a.Clone().Offset(dir, step)); // クローンしたaを方向ベクトルdirでオフセットし、結果配列に追加
	}
	return result; // 補間結果を返す
}
