import { Coord3D } from './coord3d.js'; // 3次元座標を扱うクラスをインポート
import { Coord4D } from './coord4d.js'; // 4次元座標を扱うクラスをインポート
import { Matrix, MatrixIsEqual } from './matrix.js'; // 行列操作を扱うクラスと関数をインポート

// Transformationクラスの定義
export class Transformation {
    // コンストラクタ
    constructor(matrix) {
        // 引数として行列が与えられた場合
        if (matrix !== undefined && matrix !== null) {
            this.matrix = matrix; // 与えられた行列を設定
        } else {
            // 引数がない場合、新しい単位行列を作成
            this.matrix = new Matrix();
            this.matrix.CreateIdentity();
        }
    }

    // 行列を設定するメソッド
    SetMatrix(matrix) {
        this.matrix = matrix; // 新しい行列を設定
        return this; // メソッドチェーンをサポートするために自身を返す
    }

    // 現在の行列を取得するメソッド
    GetMatrix() {
        return this.matrix;
    }

    // 行列が単位行列かどうかをチェックするメソッド
    IsIdentity() {
        return this.matrix.IsIdentity();
    }

    // 現在の行列に別の行列を掛け合わせて更新するメソッド
    AppendMatrix(matrix) {
        this.matrix = this.matrix.MultiplyMatrix(matrix); // 行列の掛け算
        return this; // メソッドチェーンをサポートするために自身を返す
    }

    // 別のTransformationの行列を掛け合わせて更新するメソッド
    Append(transformation) {
        this.AppendMatrix(transformation.GetMatrix()); // 他のTransformationから行列を取得し、それを掛け合わせる
        return this; // メソッドチェーンをサポートするために自身を返す
    }

    // 3次元座標を変換するメソッド
    TransformCoord3D(coord) {
        let coord4D = new Coord4D(coord.x, coord.y, coord.z, 1.0); // 3次元座標を4次元座標に変換（同次座標）
        let resultCoord4D = this.matrix.MultiplyVector(coord4D); // 行列を使って4次元座標を変換
        let result = new Coord3D(resultCoord4D.x, resultCoord4D.y, resultCoord4D.z); // 結果の4次元座標を3次元座標に変換
        return result;
    }

    // クローンを作成するメソッド
    Clone() {
        const clonedMatrix = this.matrix.Clone(); // 行列をクローン
        return new Transformation(clonedMatrix); // クローンした行列を使って新しいTransformationを作成
    }
}

// 2つのTransformationが等しいかをチェックする関数
export function TransformationIsEqual(a, b) {
    return MatrixIsEqual(a.GetMatrix(), b.GetMatrix()); // 各Transformationの行列が等しいかを比較
}
