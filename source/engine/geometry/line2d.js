// coord2d.jsからCoord2D、CoordDistance2D、DotVector2D、SubCoord2Dをインポートしています
import { Coord2D, CoordDistance2D, DotVector2D, SubCoord2D } from './coord2d.js';
// geometry.jsからIsZeroをインポートしています
import { IsZero } from './geometry.js';

// 2次元セグメントを表すSegment2Dクラスを定義しています
export class Segment2D {
    // セグメントの始点と終点を受け取って初期化するコンストラクタです
    constructor(beg, end) {
        this.beg = beg;
        this.end = end;
    }

    // セグメントのコピーを作成して返すCloneメソッドです
    Clone() {
        return new Segment2D(this.beg, this.end);
    }
}

// 点を2次元セグメントに射影する関数です
export function ProjectPointToSegment2D(segment, point) {
    // セグメントの始点から終点へのベクトルを計算しています
    let begToEndVec = SubCoord2D(segment.end, segment.beg);
    // セグメントの始点から点へのベクトルを計算しています
    let begToPointVec = SubCoord2D(point, segment.beg);
    // ベクトルの内積を計算しています
    let nom = DotVector2D(begToEndVec, begToPointVec);
    let denom = DotVector2D(begToEndVec, begToEndVec);
    // 分母が0に近い場合は、始点を返します
    if (IsZero(denom)) {
        return segment.beg.Clone();
    }
    // tの値を計算しています
    let t = nom / denom;
    // tの値を0から1の範囲に制限しています
    t = Math.max(0.0, Math.min(1.0, t));
    // 射影された点を計算して返します
    return new Coord2D(
        segment.beg.x + t * begToEndVec.x,
        segment.beg.y + t * begToEndVec.y
    );
}

// セグメントと点の距離を計算する関数です
export function SegmentPointDistance2D(segment, point) {
    // 点をセグメントに射影しています
    let projected = ProjectPointToSegment2D(segment, point);
    // 射影された点と元の点の距離を計算して返します
    return CoordDistance2D(projected, point);
}
