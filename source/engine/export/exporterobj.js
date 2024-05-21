// ファイル操作に関連するモジュールから必要な関数やクラスをインポートする
import { FileFormat, GetFileName } from '../io/fileutils.js';
import { TextWriter } from '../io/textwriter.js';
import { MaterialType } from '../model/material.js';
import { ExportedFile, ExporterBase } from './exporterbase.js';

// OBJ形式のエクスポータークラスの定義
export class ExporterObj extends ExporterBase {
    constructor() {
        super(); // 親クラスのコンストラクタを呼び出す
    }

    // エクスポート可能かどうかを判定するメソッド
    CanExport(format, extension) {
        return format === FileFormat.Text && extension === 'obj';
    }


    // エクスポーターの内容を定義するクラスのExportContentメソッド
    ExportContent(exporterModel, format, files, onFinish) {
        // テクスチャを書き込む関数
        function WriteTexture(mtlWriter, keyword, texture, files) {
            if (texture === null || !texture.IsValid()) { // テクスチャが存在しない場合は処理をスキップ
                return;
            }
            let fileName = GetFileName(texture.name); // テクスチャファイル名を取得
            mtlWriter.WriteArrayLine([keyword, fileName]); // MTLファイルにテクスチャ情報を書き込む

            let fileIndex = files.findIndex((file) => { // ファイルリストにテクスチャファイルが存在するか確認
                return file.GetName() === fileName;
            });
            if (fileIndex === -1) { // ファイルリストに存在しない場合は新しいエクスポートファイルを作成して追加
                let textureFile = new ExportedFile(fileName);
                textureFile.SetBufferContent(texture.buffer);
                files.push(textureFile);
            }
        }

        // エクスポートするMTLファイルとOBJファイルを準備
        let mtlFile = new ExportedFile('model.mtl');
        let objFile = new ExportedFile('model.obj');
        files.push(mtlFile); // MTLファイルをファイルリストに追加
        files.push(objFile); // OBJファイルをファイルリストに追加

        let mtlWriter = new TextWriter(); // MTLファイル用のテキストライターを生成
        mtlWriter.WriteLine(this.GetHeaderText()); // MTLファイルにヘッダー情報を書き込む

        // 各マテリアルごとに情報を書き込む
        for (let materialIndex = 0; materialIndex < exporterModel.MaterialCount(); materialIndex++) {
            let material = exporterModel.GetMaterial(materialIndex);
            mtlWriter.WriteArrayLine(['newmtl', this.GetExportedMaterialName(material.name)]);
            mtlWriter.WriteArrayLine(['Kd', material.color.r / 255.0, material.color.g / 255.0, material.color.b / 255.0]);
            mtlWriter.WriteArrayLine(['d', material.opacity]);
            if (material.type === MaterialType.Phong) {
                mtlWriter.WriteArrayLine(['Ka', material.ambient.r / 255.0, material.ambient.g / 255.0, material.ambient.b / 255.0]);
                mtlWriter.WriteArrayLine(['Ks', material.specular.r / 255.0, material.specular.g / 255.0, material.specular.b / 255.0]);
                mtlWriter.WriteArrayLine(['Ns', material.shininess * 1000.0]);
            }
            WriteTexture(mtlWriter, 'map_Kd', material.diffuseMap, files); // ディフューズマップのテクスチャを書き込む
            if (material.type === MaterialType.Phong) {
                WriteTexture(mtlWriter, 'map_Ks', material.specularMap, files); // スペキュラーマップのテクスチャを書き込む
            }
            WriteTexture(mtlWriter, 'bump', material.bumpMap, files); // バンプマップのテクスチャを書き込む
        }
        mtlFile.SetTextContent(mtlWriter.GetText()); // MTLファイルの内容を設定

        let objWriter = new TextWriter(); // OBJファイル用のテキストライターを生成
        objWriter.WriteLine(this.GetHeaderText()); // OBJファイルにヘッダー情報を書き込む
        objWriter.WriteArrayLine(['mtllib', mtlFile.GetName()]); // 使用するMTLファイルを指定

        // メッシュ情報をOBJファイルに書き込む
        let vertexOffset = 0;
        let normalOffset = 0;
        let uvOffset = 0;
        let usedMaterialName = null;
        exporterModel.EnumerateTransformedMeshInstances((mesh) => {
            objWriter.WriteArrayLine(['g', this.GetExportedMeshName(mesh.GetName())]); // グループ名を書き込む

            // 頂点座標を書き込む
            for (let vertexIndex = 0; vertexIndex < mesh.VertexCount(); vertexIndex++) {
                let vertex = mesh.GetVertex(vertexIndex);
                objWriter.WriteArrayLine(['v', vertex.x, vertex.y, vertex.z]);
            }

            // 法線ベクトルを書き込む
            for (let normalIndex = 0; normalIndex < mesh.NormalCount(); normalIndex++) {
                let normal = mesh.GetNormal(normalIndex);
                objWriter.WriteArrayLine(['vn', normal.x, normal.y, normal.z]);
            }

            // UV座標を書き込む
            for (let textureUVIndex = 0; textureUVIndex < mesh.TextureUVCount(); textureUVIndex++) {
                let uv = mesh.GetTextureUV(textureUVIndex);
                objWriter.WriteArrayLine(['vt', uv.x, uv.y]);
            }

            // ポリゴン情報を書き込む
            for (let triangleIndex = 0; triangleIndex < mesh.TriangleCount(); triangleIndex++) {
                let triangle = mesh.GetTriangle(triangleIndex);
                let v0 = triangle.v0 + vertexOffset + 1;
                let v1 = triangle.v1 + vertexOffset + 1;
                let v2 = triangle.v2 + vertexOffset + 1;
                let n0 = triangle.n0 + normalOffset + 1;
                let n1 = triangle.n1 + normalOffset + 1;
                let n2 = triangle.n2 + normalOffset + 1;
                let u0 = '';
                let u1 = '';
                let u2 = '';
                if (triangle.HasTextureUVs()) {
                    u0 = triangle.u0 + uvOffset + 1;
                    u1 = triangle.u1 + uvOffset + 1;
                    u2 = triangle.u2 + uvOffset + 1;
                }
                if (triangle.mat !== null) {
                    let material = exporterModel.GetMaterial(triangle.mat);
                    let materialName = this.GetExportedMaterialName(material.name);
                    if (materialName !== usedMaterialName) {
                        objWriter.WriteArrayLine(['usemtl', materialName]); // 使用するマテリアル名を書き込む
                        usedMaterialName = materialName;
                    }
                }
                objWriter.WriteArrayLine(['f', [v0, u0, n0].join('/'), [v1, u1, n1].join('/'), [v2, u2, n2].join('/')]);
            }

            // ライン情報を書き込む
            for (let lineIndex = 0; lineIndex < mesh.LineCount(); lineIndex++) {
                let line = mesh.GetLine(lineIndex);
                let vertexIndices = [];
                for (let vertexIndex = 0; vertexIndex < line.vertices.length; vertexIndex++) {
                    vertexIndices.push(line.vertices[vertexIndex] + vertexOffset + 1);
                }
                if (line.mat !== null) {
                    let material = exporterModel.GetMaterial(line.mat);
                    let materialName = this.GetExportedMaterialName(material.name);
                    if (materialName !== usedMaterialName) {
                        objWriter.WriteArrayLine(['usemtl', materialName]); // 使用するマテリアル名を書き込む
                        usedMaterialName = materialName;
                    }
                }
                objWriter.WriteArrayLine(['l', vertexIndices.join(' ')]);
            }
            vertexOffset += mesh.VertexCount();
            normalOffset += mesh.NormalCount();
            uvOffset += mesh.TextureUVCount();
        });

        objFile.SetTextContent(objWriter.GetText()); // OBJファイルの内容を設定
        onFinish(); // 処理完了を通知
    }

    GetHeaderText() {
        return '# exported by https://3dviewer.net';
    }
}
