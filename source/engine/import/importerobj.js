import { Coord2D } from '../geometry/coord2d.js';  // 2次元座標
import { Coord3D } from '../geometry/coord3d.js';  // 3次元座標
import { Direction } from '../geometry/geometry.js';  // 方向
import { ArrayBufferToUtf8String } from '../io/bufferutils.js';  // ArrayBufferをUTF-8文字列に変換する関数
import { Line } from '../model/line.js';  // 線分モデル
import { RGBColor, RGBColorFromFloatComponents } from '../model/color.js';  // RGBカラー
import { PhongMaterial, TextureMap } from '../model/material.js';  // フォン材質, テクスチャマップ
import { Mesh } from '../model/mesh.js';  // メッシュモデル
import { Triangle } from '../model/triangle.js';  // 三角形モデル
import { ImporterBase } from './importerbase.js';  // インポーターベースクラス
import { NameFromLine, ParametersFromLine, ReadLines, UpdateMaterialTransparency } from './importerutils.js';  // 行から名前を取得する関数, 行からパラメータを取得する関数, 行を読み込む関数, マテリアルの透明度を更新する関数
import { Loc } from '../core/localization.js';  // ローカライゼーション

// ObjMeshConverterクラスの定義
class ObjMeshConverter {
    constructor(mesh) {
        // メッシュ
        this.mesh = mesh;
        // グローバル座標からメッシュ頂点へのマップ
        this.globalToMeshVertices = new Map();
        // グローバル座標からメッシュ頂点色へのマップ
        this.globalToMeshVertexColors = new Map();
        // グローバル座標からメッシュ法線へのマップ
        this.globalToMeshNormals = new Map();
        // グローバル座標からメッシュUV座標へのマップ
        this.globalToMeshUvs = new Map();
    }

    // 頂点を追加するメソッド
    AddVertex(globalIndex, globalVertices) {
        return this.GetMeshIndex(globalIndex, globalVertices, this.globalToMeshVertices, (val) => {
            return this.mesh.AddVertex(new Coord3D(val.x, val.y, val.z));
        });
    }

    // 頂点色を追加するメソッド
    AddVertexColor(globalIndex, globalVertexColors) {
        return this.GetMeshIndex(globalIndex, globalVertexColors, this.globalToMeshVertexColors, (val) => {
            return this.mesh.AddVertexColor(new RGBColor(val.r, val.g, val.b));
        });
    }

    // 法線を追加するメソッド
    AddNormal(globalIndex, globalNormals) {
        return this.GetMeshIndex(globalIndex, globalNormals, this.globalToMeshNormals, (val) => {
            return this.mesh.AddNormal(new Coord3D(val.x, val.y, val.z));
        });
    }

    // UV座標を追加するメソッド
    AddUV(globalIndex, globalUvs) {
        return this.GetMeshIndex(globalIndex, globalUvs, this.globalToMeshUvs, (val) => {
            return this.mesh.AddTextureUV(new Coord2D(val.x, val.y));
        });
    }

    // 線分を追加するメソッド
    AddLine(line) {
        this.mesh.AddLine(line);
    }

    // 三角形を追加するメソッド
    AddTriangle(triangle) {
        this.mesh.AddTriangle(triangle);
    }

    // メッシュのインデックスを取得するメソッド
    GetMeshIndex(globalIndex, globalValueArray, globalToMeshIndices, valueAdderFunc) {
        if (isNaN(globalIndex) || globalIndex < 0 || globalIndex >= globalValueArray.length) {
            return null;
        }
        if (globalToMeshIndices.has(globalIndex)) {
            return globalToMeshIndices.get(globalIndex);
        } else {
            let globalValue = globalValueArray[globalIndex];
            let meshIndex = valueAdderFunc(globalValue);
            globalToMeshIndices.set(globalIndex, meshIndex);
            return meshIndex;
        }
    }
}

// 色を作成する関数
function CreateColor(r, g, b) {
    return RGBColorFromFloatComponents(
        parseFloat(r),
        parseFloat(g),
        parseFloat(b)
    );
}

// ImporterObjクラスの定義
export class ImporterObj extends ImporterBase {
    constructor() {
        super();
    }

    // 拡張子をインポート可能かどうか判定するメソッド
    CanImportExtension(extension) {
        return extension === 'obj';
    }

    // 上向き方向を取得するメソッド
    GetUpDirection() {
        return Direction.Y;
    }

    // コンテンツをクリアするメソッド
    ClearContent() {
        // グローバル変数を初期化する
        this.globalVertices = null;
        this.globalVertexColors = null;
        this.globalNormals = null;
        this.globalUvs = null;

        // 現在のメッシュコンバーター
        this.currentMeshConverter = null;
        // 現在のマテリアル
        this.currentMaterial = null;
        // 現在のマテリアルインデックス
        this.currentMaterialIndex = null;

        // メッシュ名からコンバーターへのマップ
        this.meshNameToConverter = null;
        // マテリアル名からインデックスへのマップ
        this.materialNameToIndex = null;
    }

    // コンテンツをリセットするメソッド
    ResetContent() {
        // 初期化
        this.globalVertices = [];
        this.globalVertexColors = [];
        this.globalNormals = [];
        this.globalUvs = [];

        // 現在のメッシュコンバーター
        this.currentMeshConverter = null;
        // 現在のマテリアル
        this.currentMaterial = null;
        // 現在のマテリアルインデックス
        this.currentMaterialIndex = null;

        // メッシュ名からコンバーターへのマップ
        this.meshNameToConverter = new Map();
        // マテリアル名からインデックスへのマップ
        this.materialNameToIndex = new Map();
    }

    // コンテンツをインポートするメソッド
    ImportContent(fileContent, onFinish) {
        // ファイルのテキストコンテンツをUTF-8文字列に変換
        let textContent = ArrayBufferToUtf8String(fileContent);
        // 行ごとに処理
        ReadLines(textContent, (line) => {
            if (!this.WasError()) {
                // 行を処理
                this.ProcessLine(line);
            }
        });
        // 完了時のコールバックを呼び出す
        onFinish();
    }

    // 行を処理するメソッド
    ProcessLine(line) {
        // コメント行をスキップ
        if (line[0] === '#') {
            return;
        }

        // 行のパラメータを取得
        let parameters = ParametersFromLine(line, '#');
        // パラメータがない場合はスキップ
        if (parameters.length === 0) {
            return;
        }

        // キーワードを取得し、小文字に変換
        let keyword = parameters[0].toLowerCase();
        parameters.shift();

        // メッシュパラメーターを処理
        if (this.ProcessMeshParameter(keyword, parameters, line)) {
            return;
        }

        // マテリアルパラメーターを処理
        if (this.ProcessMaterialParameter(keyword, parameters, line)) {
            return;
        }
    }

    // 新しいメッシュを追加するメソッド
    AddNewMesh(name) {
        // 既に同じ名前のメッシュがあれば、それを使用
        if (this.meshNameToConverter.has(name)) {
            this.currentMeshConverter = this.meshNameToConverter.get(name);
        } else {
            // 新しいメッシュを作成し、ルートノードに追加
            let mesh = new Mesh();
            mesh.SetName(name);
            this.model.AddMeshToRootNode(mesh);
            // メッシュコンバーターを作成し、マップに追加
            this.currentMeshConverter = new ObjMeshConverter(mesh);
            this.meshNameToConverter.set(name, this.currentMeshConverter);
        }
    }

    // メッシュパラメーターを処理するメソッド
    ProcessMeshParameter(keyword, parameters, line) {
        if (keyword === 'g' || keyword === 'o') {
            if (parameters.length === 0) {
                return true;
            }
            let name = NameFromLine(line, keyword.length, '#');
            this.AddNewMesh(name);
            return true;
        } else if (keyword === 'v') {
            // 頂点座標を追加
            if (parameters.length < 3) {
                return true;
            }
            this.globalVertices.push(new Coord3D(
                parseFloat(parameters[0]),
                parseFloat(parameters[1]),
                parseFloat(parameters[2])
            ));
            // 頂点色が指定されていれば、追加
            if (parameters.length >= 6) {
                this.globalVertexColors.push(CreateColor(parameters[3], parameters[4], parameters[5]));
            }
            return true;
        } else if (keyword === 'vn') {
            // 法線ベクトルを追加
            if (parameters.length < 3) {
                return true;
            }
            this.globalNormals.push(new Coord3D(
                parseFloat(parameters[0]),
                parseFloat(parameters[1]),
                parseFloat(parameters[2])
            ));
            return true;
        } else if (keyword === 'vt') {
            // UV座標を追加
            if (parameters.length < 2) {
                return true;
            }
            this.globalUvs.push(new Coord2D(
                parseFloat(parameters[0]),
                parseFloat(parameters[1])
            ));
            return true;
        } else if (keyword === 'l') {
            // ラインを処理
            if (parameters.length < 2) {
                return true;
            }
            this.ProcessLineCommand(parameters);
        } else if (keyword === 'f') {
            // フェースを処理
            if (parameters.length < 3) {
                return true;
            }
            this.ProcessFaceCommand(parameters);
            return true;
        }

        return false;
    }

    // マテリアルパラメーターを処理するメソッド
    ProcessMaterialParameter(keyword, parameters, line) {
        // テクスチャのパラメーターを抽出するメソッド
        function ExtractTextureParameters(parameters) {
            let textureParameters = new Map();
            let lastParameter = null;
            for (let i = 0; i < parameters.length - 1; i++) {
                let parameter = parameters[i];
                if (parameter.startsWith('-')) {
                    lastParameter = parameter;
                    textureParameters.set(lastParameter, []);
                    continue;
                }
                if (lastParameter !== null) {
                    textureParameters.get(lastParameter).push(parameter);
                }
            }
            return textureParameters;
        }

        // テクスチャを作成するメソッド
        function CreateTexture(parameters, callbacks) {
            let texture = new TextureMap();
            let textureName = parameters[parameters.length - 1];
            let textureBuffer = callbacks.getFileBuffer(textureName);
            texture.name = textureName;
            texture.buffer = textureBuffer;

            let textureParameters = ExtractTextureParameters(parameters);
            // オフセットを設定
            if (textureParameters.has('-o')) {
                let offsetParameters = textureParameters.get('-o');
                if (offsetParameters.length > 0) {
                    texture.offset.x = parseFloat(offsetParameters[0]);
                }
                if (offsetParameters.length > 1) {
                    texture.offset.y = parseFloat(offsetParameters[1]);
                }
            }

            // スケールを設定
            if (textureParameters.has('-s')) {
                let scaleParameters = textureParameters.get('-s');
                if (scaleParameters.length > 0) {
                    texture.scale.x = parseFloat(scaleParameters[0]);
                }
                if (scaleParameters.length > 1) {
                    texture.scale.y = parseFloat(scaleParameters[1]);
                }
            }

            return texture;
        }

        // マテリアルの処理
        if (keyword === 'newmtl') {
            // 新しいマテリアルを追加
            if (parameters.length === 0) {
                return true;
            }

            // 新しい PhongMaterial インスタンスを作成し、名前を設定してモデルに追加
            let material = new PhongMaterial();
            let materialName = NameFromLine(line, keyword.length, '#');
            let materialIndex = this.model.AddMaterial(material);
            material.name = materialName;
            // 現在のマテリアルを更新し、名前とインデックスのマッピングを保存
            this.currentMaterial = material;
            this.materialNameToIndex.set(materialName, materialIndex);
            return true;
        } else if (keyword === 'usemtl') {
            // マテリアルを使用
            if (parameters.length === 0) {
                return true;
            }

            // 使用するマテリアルの名前を取得し、対応するインデックスを設定
            let materialName = NameFromLine(line, keyword.length, '#');
            if (this.materialNameToIndex.has(materialName)) {
                this.currentMaterialIndex = this.materialNameToIndex.get(materialName);
            }
            return true;
        } else if (keyword === 'mtllib') {
            // マテリアルライブラリを読み込み
            if (parameters.length === 0) {
                return true;
            }
            // ファイル名を取得し、バッファを取得してテキストに変換し、各行を処理
            let fileName = NameFromLine(line, keyword.length, '#');
            let fileBuffer = this.callbacks.getFileBuffer(fileName);
            if (fileBuffer !== null) {
                let textContent = ArrayBufferToUtf8String(fileBuffer);
                ReadLines(textContent, (line) => {
                    if (!this.WasError()) {
                        this.ProcessLine(line);
                    }
                });
            }
            return true;
        } else if (keyword === 'map_kd') {
            // 拡散反射マップ
            if (this.currentMaterial === null || parameters.length === 0) {
                return true;
            }
            // 拡散反射マップを作成し、透明度を更新
            this.currentMaterial.diffuseMap = CreateTexture(parameters, this.callbacks);
            UpdateMaterialTransparency(this.currentMaterial);
            return true;
        } else if (keyword === 'map_ks') {
            // 鏡面反射マップ
            if (this.currentMaterial === null || parameters.length === 0) {
                return true;
            }
            // 鏡面反射マップを作成
            this.currentMaterial.specularMap = CreateTexture(parameters, this.callbacks);
            return true;
        } else if (keyword === 'map_bump' || keyword === 'bump') {
            // バンプマップ
            if (this.currentMaterial === null || parameters.length === 0) {
                return true;
            }
            // バンプマップを作成
            this.currentMaterial.bumpMap = CreateTexture(parameters, this.callbacks);
            return true;
        } else if (keyword === 'ka') {
            // アンビエント光反射率
            if (this.currentMaterial === null || parameters.length < 3) {
                return true;
            }
            // アンビエント光反射率を設定
            this.currentMaterial.ambient = CreateColor(parameters[0], parameters[1], parameters[2]);
            return true;
        } else if (keyword === 'kd') {
            // 拡散反射光の色
            if (this.currentMaterial === null || parameters.length < 3) {
                return true;
            }
            // 拡散反射光の色を設定
            this.currentMaterial.color = CreateColor(parameters[0], parameters[1], parameters[2]);
            return true;
        } else if (keyword === 'ks') {
            // 鏡面反射光の色
            if (this.currentMaterial === null || parameters.length < 3) {
                return true;
            }
            // 鏡面反射光の色を設定
            this.currentMaterial.specular = CreateColor(parameters[0], parameters[1], parameters[2]);
            return true;
        } else if (keyword === 'ns') {
            // スペキュラ指数
            if (this.currentMaterial === null || parameters.length < 1) {
                return true;
            }
            // スペキュラ指数を設定
            this.currentMaterial.shininess = parseFloat(parameters[0]) / 1000.0;
            return true;
        } else if (keyword === 'tr') {
            // 透明度
            if (this.currentMaterial === null || parameters.length < 1) {
                return true;
            }
            // 透明度を設定し、透明度に基づいてマテリアルの透明性を更新
            this.currentMaterial.opacity = 1.0 - parseFloat(parameters[0]);
            UpdateMaterialTransparency(this.currentMaterial);
            return true;
        } else if (keyword === 'd') {
            // ディゾルブ（透明度）
            if (this.currentMaterial === null || parameters.length < 1) {
                return true;
            }
            // ディゾルブ（透明度）を設定し、透明度に基づいてマテリアルの透明性を更新
            this.currentMaterial.opacity = parseFloat(parameters[0]);
            UpdateMaterialTransparency(this.currentMaterial);
            return true;
        }


        return false;
    }

    // ラインコマンドを処理するメソッド
    ProcessLineCommand(parameters) {
        if (this.currentMeshConverter === null) {
            this.AddNewMesh('');
        }

        let vertices = [];
        for (let i = 0; i < parameters.length; i++) {
            let vertexParams = parameters[i].split('/');
            let vertexIndex = this.GetRelativeIndex(parseInt(vertexParams[0], 10), this.globalVertices.length);
            let meshVertexIndex = this.currentMeshConverter.AddVertex(vertexIndex, this.globalVertices);
            if (meshVertexIndex === null) {
                this.SetError(Loc('Invalid vertex index.'));
                break;
            }
            vertices.push(meshVertexIndex);
        }

        let line = new Line(vertices);
        if (this.currentMaterialIndex !== null) {
            line.mat = this.currentMaterialIndex;
        }

        this.currentMeshConverter.AddLine(line);
    }

    // フェースコマンドを処理するメソッド
    ProcessFaceCommand(parameters) {
        // フェースの頂点、色、法線、UV を保持する配列を初期化
        let vertices = [];
        let colors = [];
        let normals = [];
        let uvs = [];

        // もし現在のメッシュコンバーターが null の場合、新しいメッシュを追加
        if (this.currentMeshConverter === null) {
            this.AddNewMesh('');
        }

        // 各パラメーターを処理
        for (let i = 0; i < parameters.length; i++) {
            let vertexParams = parameters[i].split('/');
            // 頂点インデックスを取得し、グローバルな頂点配列の長さに応じて相対的なインデックスを取得
            vertices.push(this.GetRelativeIndex(parseInt(vertexParams[0], 10), this.globalVertices.length));
            // グローバルな頂点と頂点カラーの数が同じ場合、色のインデックスも取得
            if (this.globalVertices.length === this.globalVertexColors.length) {
                colors.push(this.GetRelativeIndex(parseInt(vertexParams[0], 10), this.globalVertices.length));
            }
            // 頂点パラメーターが 1 つ以上あり、かつ 1 つ目のパラメーターが空でない場合、UV のインデックスも取得
            if (vertexParams.length > 1 && vertexParams[1].length > 0) {
                uvs.push(this.GetRelativeIndex(parseInt(vertexParams[1], 10), this.globalUvs.length));
            }
            // 頂点パラメーターが 2 つ以上あり、かつ 2 つ目のパラメーターが空でない場合、法線のインデックスも取得
            if (vertexParams.length > 2 && vertexParams[2].length > 0) {
                normals.push(this.GetRelativeIndex(parseInt(vertexParams[2], 10), this.globalNormals.length));
            }
        }

        // 3 つ以上の頂点がある場合、それらを使って三角形を作成
        for (let i = 0; i < vertices.length - 2; i++) {
            let v0 = this.currentMeshConverter.AddVertex(vertices[0], this.globalVertices);
            let v1 = this.currentMeshConverter.AddVertex(vertices[i + 1], this.globalVertices);
            let v2 = this.currentMeshConverter.AddVertex(vertices[i + 2], this.globalVertices);
            // どれかの頂点が null の場合、エラーを設定して終了
            if (v0 === null || v1 === null || v2 === null) {
                this.SetError(Loc('Invalid vertex index.'));
                break;
            }

            // 三角形を作成
            let triangle = new Triangle(v0, v1, v2);

            // カラーがすべての頂点に対して定義されている場合、各頂点にカラーを設定
            if (colors.length === vertices.length) {
                let c0 = this.currentMeshConverter.AddVertexColor(colors[0], this.globalVertexColors);
                let c1 = this.currentMeshConverter.AddVertexColor(colors[i + 1], this.globalVertexColors);
                let c2 = this.currentMeshConverter.AddVertexColor(colors[i + 2], this.globalVertexColors);
                if (c0 === null || c1 === null || c2 === null) {
                    this.SetError(Loc('Invalid vertex color index.'));
                    break;
                }
                triangle.SetVertexColors(c0, c1, c2);
            }

            // 法線がすべての頂点に対して定義されている場合、各頂点に法線を設定
            if (normals.length === vertices.length) {
                let n0 = this.currentMeshConverter.AddNormal(normals[0], this.globalNormals);
                let n1 = this.currentMeshConverter.AddNormal(normals[i + 1], this.globalNormals);
                let n2 = this.currentMeshConverter.AddNormal(normals[i + 2], this.globalNormals);
                if (n0 === null || n1 === null || n2 === null) {
                    this.SetError(Loc('Invalid normal index.'));
                    break;
                }
                triangle.SetNormals(n0, n1, n2);
            }

            // UV がすべての頂点に対して定義されている場合、各頂点に UV を設定
            if (uvs.length === vertices.length) {
                let u0 = this.currentMeshConverter.AddUV(uvs[0], this.globalUvs);
                let u1 = this.currentMeshConverter.AddUV(uvs[i + 1], this.globalUvs);
                let u2 = this.currentMeshConverter.AddUV(uvs[i + 2], this.globalUvs);
                if (u0 === null || u1 === null || u2 === null) {
                    this.SetError(Loc('Invalid uv index.'));
                    break;
                }
                triangle.SetTextureUVs(u0, u1, u2);
            }

            // 現在のマテリアルインデックスが null でない場合、三角形にマテリアルインデックスを設定
            if (this.currentMaterialIndex !== null) {
                triangle.mat = this.currentMaterialIndex;
            }

            // 三角形をメッシュに追加
            this.currentMeshConverter.AddTriangle(triangle);
        }
    }

    // インデックスを取得するメソッド
    GetRelativeIndex(index, count) {
        // インデックスが正の場合、そのまま返す。そうでない場合、グローバルな数に加える
        if (index > 0) {
            return index - 1;
        } else {
            return count + index;
        }
    }
}
