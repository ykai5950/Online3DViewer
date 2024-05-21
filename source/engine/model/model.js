import { MeshInstance, MeshInstanceId } from './meshinstance.js';
import { Node } from './node.js';
import { ModelObject3D } from './object.js';
import { Unit } from './unit.js';

/**
 * 3Dモデルを表すクラスです。
 * ModelObject3Dを拡張します。
 */
export class Model extends ModelObject3D {
    constructor() {
        super();
        // モデルの単位
        this.unit = Unit.Unknown;
        // ルートノード
        this.root = new Node();
        // マテリアルの配列
        this.materials = [];
        // メッシュの配列
        this.meshes = [];
    }

    // ユニットを取得します。
    GetUnit() {
        return this.unit;
    }

    // ユニットを設定します。
    SetUnit(unit) {
        this.unit = unit;
    }

    // ルートノードを取得します。
    GetRootNode() {
        return this.root;
    }

    // ノードの数を返します。
    NodeCount() {
        let count = 0;
        this.root.Enumerate((node) => {
            count += 1;
        });
        return count - 1;
    }

    // マテリアルの数を返します。
    MaterialCount() {
        return this.materials.length;
    }

    // メッシュの数を返します。
    MeshCount() {
        return this.meshes.length;
    }

    // メッシュインスタンスの数を返します。
    MeshInstanceCount() {
        let count = 0;
        this.root.Enumerate((node) => {
            count += node.MeshIndexCount();
        });
        return count;
    }

    // 頂点の数を返します。
    VertexCount() {
        let count = 0;
        this.EnumerateMeshInstances((meshInstance) => {
            count += meshInstance.VertexCount();
        });
        return count;
    }

    // 頂点カラーの数を返します。
    VertexColorCount() {
        let count = 0;
        this.EnumerateMeshInstances((meshInstance) => {
            count += meshInstance.VertexColorCount();
        });
        return count;
    }

    // 法線の数を返します。
    NormalCount() {
        let count = 0;
        this.EnumerateMeshInstances((meshInstance) => {
            count += meshInstance.NormalCount();
        });
        return count;
    }

    // テクスチャUVの数を返します。
    TextureUVCount() {
        let count = 0;
        this.EnumerateMeshInstances((meshInstance) => {
            count += meshInstance.TextureUVCount();
        });
        return count;
    }

    // 線の数を返します。
    LineCount() {
        let count = 0;
        this.EnumerateMeshInstances((meshInstance) => {
            count += meshInstance.LineCount();
        });
        return count;
    }

    // 線セグメントの数を返します。
    LineSegmentCount() {
        let count = 0;
        this.EnumerateMeshInstances((meshInstance) => {
            count += meshInstance.LineSegmentCount();
        });
        return count;
    }

    // 三角形の数を返します。
    TriangleCount() {
        let count = 0;
        this.EnumerateMeshInstances((meshInstance) => {
            count += meshInstance.TriangleCount();
        });
        return count;
    }

    // マテリアルを追加します。
    AddMaterial(material) {
        this.materials.push(material);
        return this.materials.length - 1;
    }

    // 指定されたインデックスのマテリアルを取得します。
    GetMaterial(index) {
        return this.materials[index];
    }

    // メッシュを追加します。
    AddMesh(mesh) {
        this.meshes.push(mesh);
        return this.meshes.length - 1;
    }

    // メッシュをルートノードに追加します。
    AddMeshToRootNode(mesh) {
        const meshIndex = this.AddMesh(mesh);
        this.root.AddMeshIndex(meshIndex);
        return meshIndex;
    }

    // 指定されたインデックスのメッシュを削除します。
    RemoveMesh(index) {
        this.meshes.splice(index, 1);
        this.root.Enumerate((node) => {
            for (let i = 0; i < node.meshIndices.length; i++) {
                if (node.meshIndices[i] === index) {
                    node.meshIndices.splice(i, 1);
                    i -= 1;
                } else if (node.meshIndices[i] > index) {
                    node.meshIndices[i] -= 1;
                }
            }
        });
    }

    // 指定されたインデックスのメッシュを取得します。
    GetMesh(index) {
        return this.meshes[index];
    }

    // 指定されたMeshInstanceIdに対応するMeshInstanceを取得します。
    GetMeshInstance(instanceId) {
        let foundNode = null;
        this.root.Enumerate((node) => {
            if (node.GetId() === instanceId.nodeId) {
                foundNode = node;
            }
        });
        if (foundNode === null) {
            return null;
        }
        const nodeMeshIndices = foundNode.GetMeshIndices();
        if (nodeMeshIndices.indexOf(instanceId.meshIndex) === -1) {
            return null;
        }
        let foundMesh = this.GetMesh(instanceId.meshIndex);
        let id = new MeshInstanceId(foundNode.GetId(), instanceId.meshIndex);
        return new MeshInstance(id, foundNode, foundMesh);
    }

    // 全てのメッシュを列挙します。
    EnumerateMeshes(onMesh) {
        for (const mesh of this.meshes) {
            onMesh(mesh);
        }
    }

    // 全てのメッシュインスタンスを列挙します。
    EnumerateMeshInstances(onMeshInstance) {
        this.root.Enumerate((node) => {
            for (let meshIndex of node.GetMeshIndices()) {
                let id = new MeshInstanceId(node.GetId(), meshIndex);
                let mesh = this.GetMesh(meshIndex);
                let meshInstance = new MeshInstance(id, node, mesh);
                onMeshInstance(meshInstance);
            }
        });
    }

    // 全ての変換済みメッシュインスタンスを列挙します。
    EnumerateTransformedMeshInstances(onMesh) {
        this.EnumerateMeshInstances((meshInstance) => {
            const transformed = meshInstance.GetTransformedMesh();
            onMesh(transformed);
        });
    }

    // 全ての頂点を列挙します。
    EnumerateVertices(onVertex) {
        this.EnumerateMeshInstances((meshInstance) => {
            meshInstance.EnumerateVertices(onVertex);
        });
    }

    // 全ての三角形の頂点インデックスを列挙します。
    EnumerateTriangleVertexIndices(onTriangleVertexIndices) {
        this.EnumerateMeshInstances((meshInstance) => {
            meshInstance.EnumerateTriangleVertexIndices(onTriangleVertexIndices);
        });
    }

    // 全ての三角形の頂点を列挙します。
    EnumerateTriangleVertices(onTriangleVertices) {
        this.EnumerateMeshInstances((meshInstance) => {
            meshInstance.EnumerateTriangleVertices(onTriangleVertices);
        });
    }
}
