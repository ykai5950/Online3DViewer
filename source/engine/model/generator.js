// 2次元座標クラスのインポート
import { Coord2D } from '../geometry/coord2d.js';
// 3次元座標クラスのインポート
import { Coord3D } from '../geometry/coord3d.js';
// 数学関連のユーティリティ関数のインポート（正の値かどうかを判定する関数、負の値かどうかを判定する関数、ゼロかどうかを判定する関数）
import { IsPositive, IsNegative, IsZero } from '../geometry/geometry.js';
// メッシュクラスのインポート
import { Mesh } from './mesh.js';
// 三角形クラスのインポート
import { Triangle } from './triangle.js';

// メッシュ生成器のパラメータを定義するクラス
export class GeneratorParams {
    constructor() {
        // メッシュの名前を格納するプロパティ
        this.name = null;
        // メッシュのマテリアルを格納するプロパティ
        this.material = null;
    }

    // メッシュの名前を設定するメソッド
    SetName(name) {
        this.name = name;
        return this;
    }

    // メッシュのマテリアルを設定するメソッド
    SetMaterial(material) {
        this.material = material;
        return this;
    }
}


// メッシュ生成器クラスを定義する
export class Generator {
    // メッシュ生成器のコンストラクタ
    constructor(params) {
        // パラメータを設定する
        this.params = params || new GeneratorParams();
        // メッシュを生成する
        this.mesh = new Mesh();
        // 名前が設定されていれば、メッシュに名前を設定する
        if (this.params.name !== null) {
            this.mesh.SetName(this.params.name);
        }
        // 曲線を初期化する
        this.curve = null;
    }

    // メッシュを取得するメソッド
    GetMesh() {
        return this.mesh;
    }

    // 頂点を追加するメソッド
    AddVertex(x, y, z) {
        // 3次元座標を生成して、メッシュに頂点を追加する
        let coord = new Coord3D(x, y, z);
        return this.mesh.AddVertex(coord);
    }

    // 複数の頂点を追加するメソッド
    AddVertices(vertices) {
        // 追加した頂点のインデックスを格納する配列を初期化する
        let indices = [];
        // 各頂点について処理を行う
        for (let i = 0; i < vertices.length; i++) {
            let vertex = vertices[i];
            // 頂点を追加し、そのインデックスを配列に追加する
            indices.push(this.AddVertex(vertex.x, vertex.y, vertex.z));
        }
        return indices;
    }

    // 曲線を設定するメソッド
    SetCurve(curve) {
        this.curve = curve;
    }

    // 曲線をリセットするメソッド
    ResetCurve() {
        this.curve = null;
    }

    // 三角形を追加するメソッド
    AddTriangle(v0, v1, v2) {
        // 三角形を生成する
        let triangle = new Triangle(v0, v1, v2);
        // パラメータでマテリアルが指定されていれば、三角形にマテリアルを設定する
        if (this.params.material !== null) {
            triangle.mat = this.params.material;
        }
        // 曲線が設定されていれば、三角形に曲線を設定する
        if (this.curve !== null) {
            triangle.SetCurve(this.curve);
        }
        // メッシュに三角形を追加する
        return this.mesh.AddTriangle(triangle);
    }

    // 三角形を反転して追加するメソッド
    AddTriangleInverted(v0, v1, v2) {
        // 三角形を追加する際に頂点の順序を逆にして追加する
        this.AddTriangle(v0, v2, v1);
    }

    // 凸多角形を追加するメソッド
    AddConvexPolygon(vertices) {
        // 最初の頂点を基準として、頂点の数-2回三角形を追加する
        for (let vertexIndex = 0; vertexIndex < vertices.length - 2; vertexIndex++) {
            this.AddTriangle(
                vertices[0],
                vertices[vertexIndex + 1],
                vertices[vertexIndex + 2]
            );
        }
    }

    // 凸多角形を反転して追加するメソッド
    AddConvexPolygonInverted(vertices) {
        // 最初の頂点を基準として、頂点の数-2回三角形を追加する（反転して追加）
        for (let vertexIndex = 0; vertexIndex < vertices.length - 2; vertexIndex++) {
            this.AddTriangleInverted(
                vertices[0],
                vertices[vertexIndex + 1],
                vertices[vertexIndex + 2]
            );
        }
    }
}

// メッシュ生成器の補助クラスを定義する
export class GeneratorHelper {
    // コンストラクタ
    constructor(generator) {
        this.generator = generator;
    }

    // ポリゴン間の表面を生成するメソッド
    GenerateSurfaceBetweenPolygons(startIndices, endIndices) {
        // 開始インデックスの数と終了インデックスの数が異なる場合、処理を中止する
        if (startIndices.length !== endIndices.length) {
            return;
        }
        // 頂点の数を取得する
        const vertexCount = startIndices.length;
        // 各頂点間に表面を生成する
        for (let i = 0; i < vertexCount; i++) {
            const index = i;
            const nextIndex = (i < vertexCount - 1) ? index + 1 : 0;
            // 凸多角形を追加する
            this.generator.AddConvexPolygon([
                startIndices[index],
                startIndices[nextIndex],
                endIndices[nextIndex],
                endIndices[index]
            ]);
        }
    }

    // 三角形ファンを生成するメソッド
    GenerateTriangleFan(startIndices, endIndex) {
        // 開始インデックスの数を取得する
        const vertexCount = startIndices.length;
        // 各頂点間に三角形を生成する
        for (let i = 0; i < vertexCount; i++) {
            const index = i;
            const nextIndex = (i < vertexCount - 1) ? index + 1 : 0;
            // 三角形を追加する
            this.generator.AddTriangle(
                endIndex,
                startIndices[index],
                startIndices[nextIndex]
            );
        }
    }
}

// 円筒座標を取得するメソッド
function GetCylindricalCoord(radius, angle) {
    // 円筒座標を計算して返す
    return new Coord2D(
        radius * Math.cos(angle),
        radius * Math.sin(angle)
    );
}

// 直方体を生成する関数
export function GenerateCuboid(genParams, xSize, ySize, zSize) {
    // 各辺のサイズが正の値かどうかをチェックする
    if (!IsPositive(xSize) || !IsPositive(ySize) || !IsPositive(zSize)) {
        return null;
    }

    // メッシュ生成器を生成する
    let generator = new Generator(genParams);

    // 頂点を追加する
    generator.AddVertex(0.0, 0.0, 0.0);
    generator.AddVertex(xSize, 0.0, 0.0);
    generator.AddVertex(xSize, ySize, 0.0);
    generator.AddVertex(0.0, ySize, 0.0);
    generator.AddVertex(0.0, 0.0, zSize);
    generator.AddVertex(xSize, 0.0, zSize);
    generator.AddVertex(xSize, ySize, zSize);
    generator.AddVertex(0.0, ySize, zSize);

    // 各面を凸多角形として追加する
    generator.AddConvexPolygon([0, 3, 2, 1]);
    generator.AddConvexPolygon([0, 1, 5, 4]);
    generator.AddConvexPolygon([1, 2, 6, 5]);
    generator.AddConvexPolygon([2, 3, 7, 6]);
    generator.AddConvexPolygon([3, 0, 4, 7]);
    generator.AddConvexPolygon([4, 5, 6, 7]);

    // 生成したメッシュを返す
    return generator.GetMesh();
}


// 円錐を生成する関数
export function GenerateCone(genParams, topRadius, bottomRadius, height, segments, smooth) {
    // 上半径または下半径が負の場合は処理を中止する
    if (IsNegative(topRadius) || IsNegative(bottomRadius)) {
        return null;
    }

    // 高さが正の値でないか、セグメントが3未満の場合は処理を中止する
    if (!IsPositive(height) || segments < 3) {
        return null;
    }

    // 上半径と下半径がともにゼロの場合は処理を中止する
    let isZeroTop = IsZero(topRadius);
    let isZeroBottom = IsZero(bottomRadius);
    if (isZeroTop && isZeroBottom) {
        return null;
    }

    // メッシュ生成器と補助クラスのインスタンスを生成する
    let generator = new Generator(genParams);
    let helper = new GeneratorHelper(generator);
    const step = 2.0 * Math.PI / segments;
    const curve = (smooth ? 1 : null);

    // 上部ポリゴンの頂点を格納する配列を初期化する
    let topPolygon = [];
    // 上部が平らな場合は中心点のみを追加し、そうでない場合は各頂点を追加する
    if (isZeroTop) {
        topPolygon.push(generator.AddVertex(0.0, 0.0, height));
    } else {
        for (let i = 0; i < segments; i++) {
            let topVertex = GetCylindricalCoord(topRadius, i * step);
            topPolygon.push(generator.AddVertex(topVertex.x, topVertex.y, height));
        }
    }

    // 下部ポリゴンの頂点を格納する配列を初期化する
    let bottomPolygon = [];
    // 下部が平らな場合は中心点のみを追加し、そうでない場合は各頂点を追加する
    if (isZeroBottom) {
        bottomPolygon.push(generator.AddVertex(0.0, 0.0, 0.0));
    } else {
        for (let i = 0; i < segments; i++) {
            let bottomVertex = GetCylindricalCoord(bottomRadius, i * step);
            bottomPolygon.push(generator.AddVertex(bottomVertex.x, bottomVertex.y, 0.0));
        }
    }

    // 上部が平らな場合
    if (isZeroTop) {
        // 曲線を設定して、下部ポリゴンから上部ポリゴンへの三角形ファンを生成する
        generator.SetCurve(curve);
        helper.GenerateTriangleFan(bottomPolygon, topPolygon[0]);
        generator.ResetCurve();
        // 下部ポリゴンを反転して追加する
        generator.AddConvexPolygonInverted(bottomPolygon);
    }
    // 下部が平らな場合
    else if (isZeroBottom) {
        // 曲線を設定して、上部ポリゴンから下部ポリゴンへの三角形ファンを生成する
        generator.SetCurve(curve);
        helper.GenerateTriangleFan(topPolygon.slice().reverse(), bottomPolygon[0]);
        generator.ResetCurve();
        // 上部ポリゴンを追加する
        generator.AddConvexPolygon(topPolygon);
    }
    // 上部も下部も平らでない場合
    else {
        // 曲線を設定して、上部ポリゴンと下部ポリゴン間の表面を生成する
        generator.SetCurve(curve);
        helper.GenerateSurfaceBetweenPolygons(bottomPolygon, topPolygon);
        generator.ResetCurve();
        // 下部ポリゴンを反転して追加し、上部ポリゴンを追加する
        generator.AddConvexPolygonInverted(bottomPolygon);
        generator.AddConvexPolygon(topPolygon);
    }

    // 生成したメッシュを返す
    return generator.GetMesh();
}

// 円柱を生成する関数
export function GenerateCylinder(genParams, radius, height, segments, smooth) {
    // 円柱を円錐として生成する
    return GenerateCone(genParams, radius, radius, height, segments, smooth);
}

// 球体を生成する関数
export function GenerateSphere(genParams, radius, segments, smooth) {
    // 球面座標を取得する関数
    function GetSphericalCoord(radius, theta, phi) {
        return new Coord3D(
            radius * Math.sin(theta) * Math.cos(phi),
            radius * Math.sin(theta) * Math.sin(phi),
            radius * Math.cos(theta)
        );
    }

    // 半径が正の値でないか、セグメントが3未満の場合は処理を中止する
    if (!IsPositive(radius) || segments < 3) {
        return null;
    }

    // メッシュ生成器と補助クラスのインスタンスを生成する
    let generator = new Generator(genParams);
    let helper = new GeneratorHelper(generator);

    // 曲線を設定する
    generator.SetCurve(smooth ? 1 : null);

    // 各レベルの頂点を格納する配列を初期化する
    let allLevelVertices = [];
    let levels = segments + 1;
    const levelStep = Math.PI / segments;
    const cylindricalStep = 2.0 * Math.PI / segments;
    // 各レベルの頂点を生成する
    for (let levelIndex = 1; levelIndex < levels - 1; levelIndex++) {
        let levelVertices = [];
        let theta = levelIndex * levelStep;
        for (let cylindricalIndex = 0; cylindricalIndex < segments; cylindricalIndex++) {
            let phi = cylindricalIndex * cylindricalStep;
            let vertex = GetSphericalCoord(radius, theta, -phi);
            levelVertices.push(generator.AddVertex(vertex.x, vertex.y, vertex.z));
        }
        // 前のレベルとの間に表面を生成する
        if (levelIndex > 1) {
            helper.GenerateSurfaceBetweenPolygons(allLevelVertices[allLevelVertices.length - 1], levelVertices);
        }
        allLevelVertices.push(levelVertices);
    }

    // 北極と南極の頂点を生成し、それらを結ぶ三角形ファンを生成する
    let topVertex = generator.AddVertex(0.0, 0.0, radius);
    let bottomVertex = generator.AddVertex(0.0, 0.0, -radius);
    helper.GenerateTriangleFan(allLevelVertices[0].slice().reverse(), topVertex);
    helper.GenerateTriangleFan(allLevelVertices[allLevelVertices.length - 1], bottomVertex);

    // 曲線をリセットする
    generator.ResetCurve();

    // 生成したメッシュを返す
    return generator.GetMesh();
}


// 正多面体を生成する関数
export function GeneratePlatonicSolid(genParams, type, radius) {
    // 頂点を追加する関数
    function AddVertex(generator, radius, x, y, z) {
        let vertex = new Coord3D(x, y, z);
        vertex.MultiplyScalar(radius / vertex.Length());
        generator.AddVertex(vertex.x, vertex.y, vertex.z);
    }

    // 半径が正の値でない場合は処理を中止する
    if (!IsPositive(radius)) {
        return null;
    }

    // メッシュ生成器のインスタンスを生成する
    let generator = new Generator(genParams);
    if (type === 'tetrahedron') {
        // 正四面体を生成する
        let a = 1.0;
        AddVertex(generator, radius, +a, +a, +a);
        AddVertex(generator, radius, -a, -a, +a);
        AddVertex(generator, radius, -a, +a, -a);
        AddVertex(generator, radius, +a, -a, -a);
        generator.AddTriangle(0, 1, 3);
        generator.AddTriangle(0, 2, 1);
        generator.AddTriangle(0, 3, 2);
        generator.AddTriangle(1, 2, 3);
    } else if (type === 'hexahedron') {
        // 正六面体を生成する
        let a = 1.0;
        AddVertex(generator, radius, +a, +a, +a);
        AddVertex(generator, radius, +a, +a, -a);
        AddVertex(generator, radius, +a, -a, +a);
        AddVertex(generator, radius, +a, -a, -a);
        AddVertex(generator, radius, -a, +a, +a);
        AddVertex(generator, radius, -a, +a, -a);
        AddVertex(generator, radius, -a, -a, +a);
        AddVertex(generator, radius, -a, -a, -a);
        generator.AddConvexPolygon([0, 1, 5, 4]);
        generator.AddConvexPolygon([0, 2, 3, 1]);
        generator.AddConvexPolygon([0, 4, 6, 2]);
        generator.AddConvexPolygon([1, 3, 7, 5]);
        generator.AddConvexPolygon([2, 6, 7, 3]);
        generator.AddConvexPolygon([4, 5, 7, 6]);
    } else if (type === 'octahedron') {
        // 正八面体を生成する
        let a = 1.0;
        let b = 0.0;
        AddVertex(generator, radius, +a, +b, +b);
        AddVertex(generator, radius, -a, +b, +b);
        AddVertex(generator, radius, +b, +a, +b);
        AddVertex(generator, radius, +b, -a, +b);
        AddVertex(generator, radius, +b, +b, +a);
        AddVertex(generator, radius, +b, +b, -a);
        generator.AddTriangle(0, 2, 4);
        generator.AddTriangle(0, 3, 5);
        generator.AddTriangle(0, 4, 3);
        generator.AddTriangle(0, 5, 2);
        generator.AddTriangle(1, 2, 5);
        generator.AddTriangle(1, 3, 4);
        generator.AddTriangle(1, 4, 2);
        generator.AddTriangle(1, 5, 3);
    } else if (type === 'dodecahedron') {
        // 正十二面体を生成する
        let a = 1.0;
        let b = 0.0;
        let c = (1.0 + Math.sqrt(5.0)) / 2.0;
        let d = 1.0 / c;
        AddVertex(generator, radius, +a, +a, +a);
        AddVertex(generator, radius, +a, +a, -a);
        AddVertex(generator, radius, +a, -a, +a);
        AddVertex(generator, radius, -a, +a, +a);
        AddVertex(generator, radius, +a, -a, -a);
        AddVertex(generator, radius, -a, +a, -a);
        AddVertex(generator, radius, -a, -a, +a);
        AddVertex(generator, radius, -a, -a, -a);
        AddVertex(generator, radius, +b, +d, +c);
        AddVertex(generator, radius, +b, +d, -c);
        AddVertex(generator, radius, +b, -d, +c);
        AddVertex(generator, radius, +b, -d, -c);
        AddVertex(generator, radius, +d, +c, +b);
        AddVertex(generator, radius, +d, -c, +b);
        AddVertex(generator, radius, -d, +c, +b);
        AddVertex(generator, radius, -d, -c, +b);
        AddVertex(generator, radius, +c, +b, +d);
        AddVertex(generator, radius, -c, +b, +d);
        AddVertex(generator, radius, +c, +b, -d);
        AddVertex(generator, radius, -c, +b, -d);
        generator.AddConvexPolygon([0, 8, 10, 2, 16]);
        generator.AddConvexPolygon([0, 16, 18, 1, 12]);
        generator.AddConvexPolygon([0, 12, 14, 3, 8]);
        generator.AddConvexPolygon([1, 9, 5, 14, 12]);
        generator.AddConvexPolygon([1, 18, 4, 11, 9]);
        generator.AddConvexPolygon([2, 10, 6, 15, 13]);
        generator.AddConvexPolygon([2, 13, 4, 18, 16]);
        generator.AddConvexPolygon([3, 14, 5, 19, 17]);
        generator.AddConvexPolygon([3, 17, 6, 10, 8]);
        generator.AddConvexPolygon([4, 13, 15, 7, 11]);
        generator.AddConvexPolygon([5, 9, 11, 7, 19]);
        generator.AddConvexPolygon([6, 17, 19, 7, 15]);
    } else if (type === 'icosahedron') {
        // 正二十面体を生成する
        let a = 1.0;
        let b = 0.0;
        let c = (1.0 + Math.sqrt(5.0)) / 2.0;
        AddVertex(generator, radius, +b, +a, +c);
        AddVertex(generator, radius, +b, +a, -c);
        AddVertex(generator, radius, +b, -a, +c);
        AddVertex(generator, radius, +b, -a, -c);
        AddVertex(generator, radius, +a, +c, +b);
        AddVertex(generator, radius, +a, -c, +b);
        AddVertex(generator, radius, -a, +c, +b);
        AddVertex(generator, radius, -a, -c, +b);
        AddVertex(generator, radius, +c, +b, +a);
        AddVertex(generator, radius, +c, +b, -a);
        AddVertex(generator, radius, -c, +b, +a);
        AddVertex(generator, radius, -c, +b, -a);
        generator.AddTriangle(0, 2, 8);
        generator.AddTriangle(0, 4, 6);
        generator.AddTriangle(0, 6, 10);
        generator.AddTriangle(0, 8, 4);
        generator.AddTriangle(0, 10, 2);
        generator.AddTriangle(1, 3, 11);
        generator.AddTriangle(1, 4, 9);
        generator.AddTriangle(1, 6, 4);
        generator.AddTriangle(1, 9, 3);
        generator.AddTriangle(1, 11, 6);
        generator.AddTriangle(2, 5, 8);
        generator.AddTriangle(2, 7, 5);
        generator.AddTriangle(2, 10, 7);
        generator.AddTriangle(3, 5, 7);
        generator.AddTriangle(3, 7, 11);
        generator.AddTriangle(3, 9, 5);
        generator.AddTriangle(4, 8, 9);
        generator.AddTriangle(5, 9, 8);
        generator.AddTriangle(6, 11, 10);
        generator.AddTriangle(7, 10, 11);
    }
    return generator.GetMesh();
}
