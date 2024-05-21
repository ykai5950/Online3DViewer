// Line クラスの定義
export class Line {
    // Line クラスのコンストラクター
    constructor(vertices) {
        // Line インスタンスの頂点を初期化
        this.vertices = vertices;
        // マテリアルを初期化
        this.mat = null;
    }

    // 頂点が存在するかどうかを返す
    HasVertices() {
        return this.vertices !== null && this.vertices.length >= 2;
    }

    // 頂点を取得する
    GetVertices() {
        return this.vertices;
    }

    // マテリアルを設定する
    SetMaterial(mat) {
        this.mat = mat;
        return this;
    }

    // セグメント数を返す
    SegmentCount() {
        // 頂点が存在しない場合はセグメント数は 0
        if (this.vertices === null) {
            return 0;
        }
        // セグメント数は頂点数 - 1
        return this.vertices.length - 1;
    }

    // Line インスタンスを複製する
    Clone() {
        // 現在の頂点をコピーし、新しい Line インスタンスを作成
        let cloned = new Line([...this.vertices]);
        // マテリアルを設定して複製した Line インスタンスを返す
        cloned.SetMaterial(this.mat);
        return cloned;
    }
}
