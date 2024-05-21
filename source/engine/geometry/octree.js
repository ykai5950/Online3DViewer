import { Box3D } from './box3d.js'; // 3Dのボックスを表すクラスをインポート
import { Coord3D, CoordIsEqual3D } from './coord3d.js'; // 3D座標を表すクラスと、座標が等しいかを確認する関数をインポート
import { IsGreaterOrEqual, IsLowerOrEqual } from './geometry.js'; // 座標の比較関数をインポート

// OctreeNodeクラスの定義
export class OctreeNode {
    // コンストラクタ
    constructor(boundingBox, level) {
        this.boundingBox = boundingBox; // ノードの境界ボックス
        this.level = level; // ノードの深さレベル
        this.pointItems = []; // ノードに含まれる点のリスト
        this.childNodes = []; // 子ノードのリスト
    }

    // ポイントを追加するメソッド
    AddPoint(point, data, options) {
        let node = this.FindNodeForPoint(point); // 点が属するノードを見つける
        if (node === null) {
            return false; // ノードが見つからない場合はfalseを返す
        }

        if (node.FindPointDirectly(point) !== null) {
            return false; // 点がすでに存在する場合はfalseを返す
        }

        // ノードが満たされていないか、最大レベルに達している場合
        if (node.pointItems.length < options.maxPointsPerNode || node.level >= options.maxTreeDepth) {
            node.AddPointDirectly(point, data); // 点を直接追加
            return true;
        } else {
            node.CreateChildNodes(); // 子ノードを作成
            let oldPointItems = node.pointItems; // 既存の点を保持
            node.pointItems = []; // 点リストをリセット
            for (let i = 0; i < oldPointItems.length; i++) {
                let pointItem = oldPointItems[i];
                if (!node.AddPoint(pointItem.point, pointItem.data, options)) {
                    return false; // 再帰的に点を追加
                }
            }
            return node.AddPoint(point, data, options); // 新しい点を追加
        }
    }

    // 点を見つけるメソッド
    FindPoint(point) {
        let node = this.FindNodeForPoint(point); // 点が属するノードを見つける
        if (node === null) {
            return null; // ノードが見つからない場合はnullを返す
        }
        return node.FindPointDirectly(point); // 点を直接見つける
    }

    // 点を直接追加するメソッド
    AddPointDirectly(point, data) {
        this.pointItems.push({
            point: point, // 点の座標
            data: data // 点に関連するデータ
        });
    }

    // 点を直接見つけるメソッド
    FindPointDirectly(point) {
        for (let i = 0; i < this.pointItems.length; i++) {
            let pointItem = this.pointItems[i];
            if (CoordIsEqual3D(point, pointItem.point)) {
                return pointItem.data; // 点が見つかればデータを返す
            }
        }
        return null; // 点が見つからなければnullを返す
    }

    // 点が属するノードを見つけるメソッド
    FindNodeForPoint(point) {
        if (!this.IsPointInBounds(point)) {
            return null; // 点が境界内にない場合はnullを返す
        }

        if (this.childNodes.length === 0) {
            return this; // 子ノードがない場合は自身を返す
        }

        for (let i = 0; i < this.childNodes.length; i++) {
            let childNode = this.childNodes[i];
            let foundNode = childNode.FindNodeForPoint(point); // 再帰的に子ノードを検索
            if (foundNode !== null) {
                return foundNode; // ノードが見つかれば返す
            }
        }

        return null; // ノードが見つからなければnullを返す
    }

    // 子ノードを作成するメソッド
    CreateChildNodes() {
        function AddChildNode(node, minX, minY, minZ, sizeX, sizeY, sizeZ) {
            let box = new Box3D(
                new Coord3D(minX, minY, minZ),
                new Coord3D(minX + sizeX, minY + sizeY, minZ + sizeZ)
            );
            node.childNodes.push(new OctreeNode(box, node.level + 1)); // 新しい子ノードを追加
        }

        let min = this.boundingBox.min; // 境界ボックスの最小座標
        let center = this.boundingBox.GetCenter(); // 境界ボックスの中心座標
        let sizeX = (this.boundingBox.max.x - this.boundingBox.min.x) / 2.0; // サイズの半分
        let sizeY = (this.boundingBox.max.y - this.boundingBox.min.y) / 2.0; // サイズの半分
        let sizeZ = (this.boundingBox.max.z - this.boundingBox.min.z) / 2.0; // サイズの半分

        AddChildNode(this, min.x, min.y, min.z, sizeX, sizeY, sizeZ); // 子ノードを追加
        AddChildNode(this, center.x, min.y, min.z, sizeX, sizeY, sizeZ);
        AddChildNode(this, min.x, center.y, min.z, sizeX, sizeY, sizeZ);
        AddChildNode(this, center.x, center.y, min.z, sizeX, sizeY, sizeZ);
        AddChildNode(this, min.x, min.y, center.z, sizeX, sizeY, sizeZ);
        AddChildNode(this, center.x, min.y, center.z, sizeX, sizeY, sizeZ);
        AddChildNode(this, min.x, center.y, center.z, sizeX, sizeY, sizeZ);
        AddChildNode(this, center.x, center.y, center.z, sizeX, sizeY, sizeZ);
    }

    // 点が境界内にあるか確認するメソッド
    IsPointInBounds(point) {
        let isEqual =
            IsGreaterOrEqual(point.x, this.boundingBox.min.x) &&
            IsGreaterOrEqual(point.y, this.boundingBox.min.y) &&
            IsGreaterOrEqual(point.z, this.boundingBox.min.z) &&
            IsLowerOrEqual(point.x, this.boundingBox.max.x) &&
            IsLowerOrEqual(point.y, this.boundingBox.max.y) &&
            IsLowerOrEqual(point.z, this.boundingBox.max.z);
        return isEqual; // 境界内にあればtrueを返す
    }
}

// Octreeクラスの定義
export class Octree {
    // コンストラクタ
    constructor(boundingBox, options) {
        this.options = {
            maxPointsPerNode: 10, // 各ノードの最大点数
            maxTreeDepth: 10 // ツリーの最大深さ
        };
        if (options !== undefined) {
            if (options.maxPointsPerNode !== undefined) {
                this.options.maxPointsPerNode = options.maxPointsPerNode;
            }
            if (options.maxTreeDepth !== undefined) {
                this.options.maxTreeDepth = options.maxTreeDepth;
            }
        }
        this.rootNode = new OctreeNode(boundingBox, 0); // ルートノードを初期化
    }

    // 点を追加するメソッド
    AddPoint(point, data) {
        return this.rootNode.AddPoint(point, data, this.options); // ルートノードに点を追加
    }

    // 点を見つけるメソッド
    FindPoint(point) {
        return this.rootNode.FindPoint(point); // ルートノードから点を検索
    }
}
