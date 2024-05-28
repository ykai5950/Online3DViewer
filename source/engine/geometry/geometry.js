// 非常に小さい値を表す定数Epsを定義しています
export const Eps = 0.00000001;
// 比較的大きな値を表す定数BigEpsを定義しています
export const BigEps = 0.0001;
// 比較的大きな値を表す定数BigEpsを定義しています
export const NearyCoord = 0.1;
// ラジアンから度への変換係数を表す定数RadDegを定義しています
export const RadDeg = 57.29577951308232;
// 度からラジアンへの変換係数を表す定数DegRadを定義しています
export const DegRad = 0.017453292519943;

// 数値aが非常に小さい値Epsよりも小さいかどうかを判定する関数です
export function IsZero(a) {
	// Math.abs(a)がEpsよりも小さいかどうかを返します
	return Math.abs(a) < Eps;
}

// 数値aが数値bよりも小さいかどうかを判定する関数です
export function IsLower(a, b) {
	// b - aがEpsよりも大きいかどうかを返します
	return b - a > Eps;
}

// 数値aが数値bよりも大きいかどうかを判定する関数です
export function IsGreater(a, b) {
	// a - bがEpsよりも大きいかどうかを返します
	return a - b > Eps;
}

// 数値aが数値b以下かどうかを判定する関数です
export function IsLowerOrEqual(a, b) {
	// b - aがマイナスEpsよりも大きいかどうかを返します
	return b - a > -Eps;
}

// 数値aが数値b以上かどうかを判定する関数です
export function IsGreaterOrEqual(a, b) {
	// a - bがマイナスEpsよりも大きいかどうかを返します
	return a - b > -Eps;
}

// 数値aと数値bが非常に小さい値Epsよりも等しいかどうかを判定する関数です
export function IsEqual(a, b) {
	// Math.abs(b - a)がEpsよりも小さいかどうかを返します
	return Math.abs(b - a) < Eps;
}

// 数値aと数値bが指定された閾値epsよりも等しいかどうかを判定する関数です
export function IsEqualEps(a, b, eps) {
	// Math.abs(b - a)がepsよりも小さいかどうかを返します
	return Math.abs(b - a) < eps;
}

// 数値aが非常に小さい値Epsよりも大きいかどうかを判定する関数です
export function IsPositive(a) {
	// aがEpsよりも大きいかどうかを返します
	return a > Eps;
}

// 数値aが非常に小さい値Epsよりも小さいかどうかを判定する関数です
export function IsNegative(a) {
	// aがマイナスEpsよりも小さいかどうかを返します
	return a < -Eps;
}

// X、Y、Zの方向を表すDirectionオブジェクトを定義しています
export const Direction =
{
	X: 1,
	Y: 2,
	Z: 3
};
