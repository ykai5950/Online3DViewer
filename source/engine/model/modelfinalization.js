// 必要なモジュールのインポート
import { CopyObjectAttributes } from '../core/core.js';
import { AddCoord3D, Coord3D, CoordIsEqual3D } from '../geometry/coord3d.js';
import { RGBColor } from './color.js';
import { MaterialSource, PhongMaterial } from './material.js';
import { CalculateTriangleNormal, IsEmptyMesh } from './meshutils.js';

// モデルの最終処理を行うクラス
class ModelFinalizer {
    constructor(params) {
        // パラメータを保持するオブジェクトを初期化
        this.params = {
            defaultLineMaterialColor: new RGBColor(0, 0, 0),
            defaultMaterialColor: new RGBColor(0, 0, 0)
        };
        // パラメータのコピー
        CopyObjectAttributes(params, this.params);

        // デフォルトのマテリアルインデックスを初期化
        this.defaultLineMaterialIndex = null;
        this.defaultMaterialIndex = null;
    }

    // モデルの最終処理を実行するメソッド
    Finalize(model) {
        // デフォルトの設定をリセット
        this.Reset();

        // メッシュ、マテリアル、ノードを最終処理する
        this.FinalizeMeshes(model);
        this.FinalizeMaterials(model);
        this.FinalizeNodes(model);
    }

    // マテリアルを最終処理するメソッド
    FinalizeMaterials(model) {
        // モデルに頂点カラーが存在しない場合は処理しない
        if (model.VertexColorCount() === 0) {
            return;
        }

        // マテリアルごとに頂点カラーの有無を調べて設定する
        let materialHasVertexColors = new Map();
        for (let meshIndex = 0; meshIndex < model.MeshCount(); meshIndex++) {
            let mesh = model.GetMesh(meshIndex);
            for (let triangleIndex = 0; triangleIndex < mesh.TriangleCount(); triangleIndex++) {
                let triangle = mesh.GetTriangle(triangleIndex);
                let hasVertexColors = triangle.HasVertexColors();
                if (!materialHasVertexColors.has(triangle.mat)) {
                    materialHasVertexColors.set(triangle.mat, hasVertexColors);
                } else if (!hasVertexColors) {
                    materialHasVertexColors.set(triangle.mat, false);
                }
            }
        }

        // マテリアルの頂点カラー設定を反映する
        for (let [materialIndex, hasVertexColors] of materialHasVertexColors) {
            let material = model.GetMaterial(materialIndex);
            material.vertexColors = hasVertexColors;
        }
    }

    // メッシュを最終処理するメソッド
    FinalizeMeshes(model) {
        // 全てのメッシュを処理する
        for (let meshIndex = 0; meshIndex < model.MeshCount(); meshIndex++) {
            let mesh = model.GetMesh(meshIndex);
            // 空のメッシュは削除する
            if (IsEmptyMesh(mesh)) {
                model.RemoveMesh(meshIndex);
                meshIndex = meshIndex - 1;
                continue;
            }
            this.FinalizeMesh(model, mesh);
        }
    }

    // 個々のメッシュを最終処理するメソッド
    FinalizeMesh(model, mesh) {
        // 曲面の法線を計算するメソッド
        function CalculateCurveNormals(mesh) {
            // 各頂点の平均法線を計算する内部関数
            function AddAverageNormal(mesh, triangle, vertexIndex, triangleNormals, vertexToTriangles) {
                // 配列に法線が存在するかどうかを確認する関数
                function IsNormalInArray(array, normal) {
                    // 配列内の法線と引数で渡された法線が等しいかを確認
                    for (let i = 0; i < array.length; i++) {
                        let current = array[i];
                        if (CoordIsEqual3D(current, normal)) {
                            return true;
                        }
                    }
                    return false;
                }

                // 平均法線を計算するための法線のリスト
                let averageNormals = [];
                // 頂点に隣接する三角形のリストを取得
                let neigTriangles = vertexToTriangles.get(vertexIndex);
                // 隣接する三角形の法線をループして取得
                for (let i = 0; i < neigTriangles.length; i++) {
                    let neigIndex = neigTriangles[i];
                    let neigTriangle = mesh.GetTriangle(neigIndex);
                    // 三角形が同じ曲線上にある場合、法線を追加
                    if (triangle.curve === neigTriangle.curve) {
                        let triangleNormal = triangleNormals[neigIndex];
                        // 既存の平均法線リストに存在しない場合、追加
                        if (!IsNormalInArray(averageNormals, triangleNormal)) {
                            averageNormals.push(triangleNormal);
                        }
                    }
                }

                // 平均法線を計算
                let averageNormal = new Coord3D(0.0, 0.0, 0.0);
                for (let i = 0; i < averageNormals.length; i++) {
                    averageNormal = AddCoord3D(averageNormal, averageNormals[i]);
                }
                averageNormal.MultiplyScalar(1.0 / averageNormals.length);
                averageNormal.Normalize();
                // 平均法線をメッシュに追加してそのインデックスを返す
                return mesh.AddNormal(averageNormal);
            }

            // 三角形の法線と頂点の三角形のマップを初期化
            let triangleNormals = [];
            let vertexToTriangles = new Map();

            // 各頂点に隣接する三角形のリストを生成
            for (let vertexIndex = 0; vertexIndex < mesh.VertexCount(); vertexIndex++) {
                vertexToTriangles.set(vertexIndex, []);
            }

            // 三角形の法線を計算してリストに追加し、頂点に隣接する三角形のリストを生成
            for (let triangleIndex = 0; triangleIndex < mesh.TriangleCount(); triangleIndex++) {
                let triangle = mesh.GetTriangle(triangleIndex);
                let v0 = mesh.GetVertex(triangle.v0);
                let v1 = mesh.GetVertex(triangle.v1);
                let v2 = mesh.GetVertex(triangle.v2);
                let normal = CalculateTriangleNormal(v0, v1, v2);
                triangleNormals.push(normal);
                vertexToTriangles.get(triangle.v0).push(triangleIndex);
                vertexToTriangles.get(triangle.v1).push(triangleIndex);
                vertexToTriangles.get(triangle.v2).push(triangleIndex);
            }

            // 三角形の法線が存在しない場合、平均法線を計算して追加
            for (let triangleIndex = 0; triangleIndex < mesh.TriangleCount(); triangleIndex++) {
                let triangle = mesh.GetTriangle(triangleIndex);
                if (!triangle.HasNormals()) {
                    let n0 = AddAverageNormal(mesh, triangle, triangle.v0, triangleNormals, vertexToTriangles);
                    let n1 = AddAverageNormal(mesh, triangle, triangle.v1, triangleNormals, vertexToTriangles);
                    let n2 = AddAverageNormal(mesh, triangle, triangle.v2, triangleNormals, vertexToTriangles);
                    triangle.SetNormals(n0, n1, n2);
                }
            }
        }

        // メッシュの状態を保持するオブジェクト
        let meshStatus = {
            calculateCurveNormals: false
        };

        // ラインを処理する
        for (let i = 0; i < mesh.LineCount(); i++) {
            let line = mesh.GetLine(i);
            if (line.mat === null) {
                line.mat = this.GetDefaultMaterialIndex(model, MaterialSource.DefaultLine);
            }
        }

        // 三角形を処理する
        for (let i = 0; i < mesh.TriangleCount(); i++) {
            let triangle = mesh.GetTriangle(i);
            this.FinalizeTriangle(mesh, triangle, meshStatus);
            if (triangle.mat === null) {
                triangle.mat = this.GetDefaultMaterialIndex(model, MaterialSource.DefaultFace);
            }
        }

        // 曲面の法線を計算する必要がある場合は計算する
        if (meshStatus.calculateCurveNormals) {
            CalculateCurveNormals(mesh);
        }
    }

    // 三角形を最終処理するメソッド
    FinalizeTriangle(mesh, triangle, meshStatus) {
        // 法線が存在しない場合は計算する
        if (!triangle.HasNormals()) {
            if (triangle.curve === null || triangle.curve === 0) {
                let v0 = mesh.GetVertex(triangle.v0);
                let v1 = mesh.GetVertex(triangle.v1);
                let v2 = mesh.GetVertex(triangle.v2);
                let normal = CalculateTriangleNormal(v0, v1, v2);
                let normalIndex = mesh.AddNormal(normal);
                triangle.SetNormals(normalIndex, normalIndex, normalIndex);
            } else {
                meshStatus.calculateCurveNormals = true;
            }
        }

        // 曲率が設定されていない場合はデフォルトの値を設定する
        if (triangle.curve === null) {
            triangle.curve = 0;
        }
    }

    // ノードを最終処理するメソッド
    FinalizeNodes(model) {
        // ルートノードを取得
        let rootNode = model.GetRootNode();

        // 空のノードを格納する配列
        let emptyNodes = [];
        // 子ノードを列挙して空のノードを検索する
        rootNode.EnumerateChildren((node) => {
            if (node.IsEmpty()) {
                emptyNodes.push(node);
            }
        });

        // 空のノードを削除する
        for (let nodeIndex = 0; nodeIndex < emptyNodes.length; nodeIndex++) {
            let node = emptyNodes[nodeIndex];
            let parentNode = node.GetParent();
            if (parentNode === null) {
                continue;
            }
            parentNode.RemoveChildNode(node);
            if (parentNode.IsEmpty()) {
                emptyNodes.push(parentNode);
            }
        }
    }

    // デフォルトのマテリアルインデックスを取得するメソッド
    GetDefaultMaterialIndex(model, source) {
        // インデックスを取得する内部関数
        function GetIndex(model, index, source, color) {
            if (index !== null) {
                return index;
            }
            let defaultMaterial = new PhongMaterial();
            defaultMaterial.color = color;
            defaultMaterial.source = source;
            return model.AddMaterial(defaultMaterial);
        }

        // デフォルトのラインマテリアルの場合
        if (source === MaterialSource.DefaultLine) {
            this.defaultLineMaterialIndex = GetIndex(model, this.defaultLineMaterialIndex, MaterialSource.DefaultLine, this.params.defaultLineMaterialColor);
            return this.defaultLineMaterialIndex;
        }
        // デフォルトのフェイスマテリアルの場合
        else if (source === MaterialSource.DefaultFace) {
            this.defaultMaterialIndex = GetIndex(model, this.defaultMaterialIndex, MaterialSource.DefaultFace, this.params.defaultMaterialColor);
            return this.defaultMaterialIndex;
        }
        // それ以外の場合はnullを返す
        else {
            return null;
        }
    }

    // デフォルトの設定をリセットするメソッド
    Reset() {
        this.defaultLineMaterialIndex = null;
        this.defaultMaterialIndex = null;
    }
}

// モデルの最終処理を行う関数
export function FinalizeModel(model, params) {
    let finalizer = new ModelFinalizer(params);
    finalizer.Finalize(model);
}

// モデルの正当性をチェックする関数
export function CheckModel(model) {
    // 個々の値が正しいかどうかをチェックする内部関数
    function IsCorrectValue(val) {
        if (val === undefined || val === null) {
            return false;
        }
        return true;
    }

    // 数値が正しいかどうかをチェックする内部関数
    function IsCorrectNumber(val) {
        if (!IsCorrectValue(val)) {
            return false;
        }
        if (isNaN(val)) {
            return false;
        }
        return true;
    }

    // インデックスが正しいかどうかをチェックする内部関数
    function IsCorrectIndex(val, count) {
        if (!IsCorrectNumber(val)) {
            return false;
        }
        if (val < 0 || val >= count) {
            return false;
        }
        return true;
    }

    // メッシュが正しいかどうかをチェックする内部関数
    function CheckMesh(model, mesh) {
        // 三角形が正しいかどうかをチェックする内部関数
        function CheckTriangle(model, mesh, triangle) {
            // 三角形の各頂点インデックスがメッシュの範囲内かどうかをチェック
            if (!IsCorrectIndex(triangle.v0, mesh.VertexCount())) {
                return false;
            }
            if (!IsCorrectIndex(triangle.v1, mesh.VertexCount())) {
                return false;
            }
            if (!IsCorrectIndex(triangle.v2, mesh.VertexCount())) {
                return false;
            }
            // 三角形の各頂点が有効な法線インデックスを持つかどうかをチェック
            if (!IsCorrectIndex(triangle.n0, mesh.NormalCount())) {
                return false;
            }
            if (!IsCorrectIndex(triangle.n1, mesh.NormalCount())) {
                return false;
            }
            if (!IsCorrectIndex(triangle.n2, mesh.NormalCount())) {
                return false;
            }
            // 三角形が頂点カラーを持つ場合、各頂点カラーインデックスがメッシュの範囲内かどうかをチェック
            if (triangle.HasVertexColors()) {
                if (!IsCorrectIndex(triangle.c0, mesh.VertexColorCount())) {
                    return false;
                }
                if (!IsCorrectIndex(triangle.c1, mesh.VertexColorCount())) {
                    return false;
                }
                if (!IsCorrectIndex(triangle.c2, mesh.VertexColorCount())) {
                    return false;
                }
            }
            // 三角形がテクスチャUVを持つ場合、各テクスチャUVインデックスがメッシュの範囲内かどうかをチェック
            if (triangle.HasTextureUVs()) {
                if (!IsCorrectIndex(triangle.u0, mesh.TextureUVCount())) {
                    return false;
                }
                if (!IsCorrectIndex(triangle.u1, mesh.TextureUVCount())) {
                    return false;
                }
                if (!IsCorrectIndex(triangle.u2, mesh.TextureUVCount())) {
                    return false;
                }
            }
            // 三角形のマテリアルインデックスがモデルのマテリアル数の範囲内かどうかをチェック
            if (!IsCorrectIndex(triangle.mat, model.MaterialCount())) {
                return false;
            }
            // 三角形の曲率が有効な数値かどうかをチェック
            if (!IsCorrectNumber(triangle.curve)) {
                return false;
            }
            // すべてのチェックが合格した場合、三角形は有効であると判断
            return true;
        }


        // 頂点が正しいかどうかをチェック
        for (let i = 0; i < mesh.VertexCount(); i++) {
            let vertex = mesh.GetVertex(i);
            if (!IsCorrectNumber(vertex.x)) {
                return false;
            }
            if (!IsCorrectNumber(vertex.y)) {
                return false;
            }
            if (!IsCorrectNumber(vertex.z)) {
                return false;
            }
        }

        // 頂点カラーが正しいかどうかをチェック
        for (let i = 0; i < mesh.VertexColorCount(); i++) {
            let color = mesh.GetVertexColor(i);
            if (!IsCorrectNumber(color.r)) {
                return false;
            }
            if (!IsCorrectNumber(color.g)) {
                return false;
            }
            if (!IsCorrectNumber(color.b)) {
                return false;
            }
        }

        // 法線が正しいかどうかをチェック
        for (let i = 0; i < mesh.NormalCount(); i++) {
            let normal = mesh.GetNormal(i);
            if (!IsCorrectNumber(normal.x)) {
                return false;
            }
            if (!IsCorrectNumber(normal.y)) {
                return false;
            }
            if (!IsCorrectNumber(normal.z)) {
                return false;
            }
        }

        // テクスチャUVが正しいかどうかをチェック
        for (let i = 0; i < mesh.TextureUVCount(); i++) {
            let uv = mesh.GetTextureUV(i);
            if (!IsCorrectNumber(uv.x)) {
                return false;
            }
            if (!IsCorrectNumber(uv.y)) {
                return false;
            }
        }

        // 三角形が正しいかどうかをチェック
        for (let i = 0; i < mesh.TriangleCount(); i++) {
            let triangle = mesh.GetTriangle(i);
            if (!CheckTriangle(model, mesh, triangle)) {
                return false;
            }
        }

        return true;
    }

    // 全てのメッシュをチェック
    for (let i = 0; i < model.MeshCount(); i++) {
        let mesh = model.GetMesh(i);
        if (!CheckMesh(model, mesh)) {
            return false;
        }
    }

    return true;
}
