// 4次元座標を表すCoord4Dクラスの定義です
export class Coord4D {
	// コンストラクターで、x, y, z, wの値を受け取り、それぞれの座標を初期化します
	constructor(x, y, z, w) {
		// x座標を設定します
		this.x = x;
		// y座標を設定します
		this.y = y;
		// z座標を設定します
		this.z = z;
		// w座標を設定します
		this.w = w;
	}

	// 現在の座標をコピーして新しいCoord4Dオブジェクトを作成して返すメソッドです
	Clone() {
		// 新しいCoord4Dオブジェクトを作成し、現在の座標をコピーして返します
		return new Coord4D(this.x, this.y, this.z, this.w);
	}
}
