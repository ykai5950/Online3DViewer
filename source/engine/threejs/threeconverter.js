import { RunTasksBatch } from '../core/taskrunner.js'; // タスクランナーから RunTasksBatch をインポート
import { IsEqual } from '../geometry/geometry.js'; // ジオメトリから IsEqual をインポート
import { CreateObjectUrl, CreateObjectUrlWithMimeType } from '../io/bufferutils.js'; // バッファーユーティリティから CreateObjectUrl と CreateObjectUrlWithMimeType をインポート
import { MaterialSource, MaterialType } from '../model/material.js'; // マテリアルから MaterialSource と MaterialType をインポート
import { MeshInstance, MeshInstanceId } from '../model/meshinstance.js'; // メッシュインスタンスから MeshInstance と MeshInstanceId をインポート
import { IsEmptyMesh } from '../model/meshutils.js'; // メッシュユーティリティから IsEmptyMesh をインポート
import { ConvertColorToThreeColor, GetShadingType, ShadingType } from './threeutils.js'; // Three.jsユーティリティから ConvertColorToThreeColor と GetShadingType、ShadingType をインポート

import * as THREE from 'three'; // Three.js ライブラリからすべてをインポート

// マテリアルのジオメトリタイプを定義
export const MaterialGeometryType =
{
	Line: 1, // 線
	Face: 2 // 面
};

// モデルからThree.jsへの変換パラメータを定義
export class ModelToThreeConversionParams {
	constructor() {
		this.forceMediumpForMaterials = false; // マテリアルに mediump を強制的に適用するかどうか
	}
}

// モデルからThree.jsへの変換の出力を定義
export class ModelToThreeConversionOutput {
	constructor() {
		this.defaultMaterials = []; // デフォルトマテリアルの配列
		this.objectUrls = []; // オブジェクトURLの配列
	}
}

// Three.jsへの変換状態ハンドラを定義
export class ThreeConversionStateHandler {
	constructor(callbacks) {
		this.callbacks = callbacks; // コールバック関数の定義
		this.texturesNeeded = 0; // 必要なテクスチャの数
		this.texturesLoaded = 0; // 読み込まれたテクスチャの数
		this.threeObject = null; // Three.js オブジェクト
	}

	// テクスチャが必要であることを通知するメソッド
	OnTextureNeeded() {
		this.texturesNeeded += 1; // 必要なテクスチャの数を増やす
	}

	// テクスチャの読み込み完了を通知するメソッド
	OnTextureLoaded() {
		this.texturesLoaded += 1; // 読み込まれたテクスチャの数を増やす
		this.callbacks.onTextureLoaded(); // テクスチャの読み込み完了時のコールバックを実行
		this.Finish(); // 変換を完了するかどうかをチェック
	}

	// モデルの読み込み完了を通知するメソッド
	OnModelLoaded(threeObject) {
		this.threeObject = threeObject; // Three.js オブジェクトをセット
		this.Finish(); // 変換を完了するかどうかをチェック
	}

	// 変換の完了をチェックし、完了していればコールバックを実行するメソッド
	Finish() {
		if (this.threeObject !== null && this.texturesNeeded === this.texturesLoaded) {
			this.callbacks.onModelLoaded(this.threeObject); // モデルの読み込みが完了していれば、モデル読み込み完了時のコールバックを実行
		}
	}
}

// Three.jsノードツリークラスの定義
export class ThreeNodeTree {
	constructor(model, threeRootNode) {
		this.model = model; // モデルオブジェクト
		this.threeNodeItems = []; // Three.jsノードアイテムの配列
		this.AddNode(model.GetRootNode(), threeRootNode); // ルートノードを追加
	}

	// ノードを追加するメソッド
	AddNode(node, threeNode) {
		let matrix = node.GetTransformation().GetMatrix(); // ノードの変換行列を取得
		let threeMatrix = new THREE.Matrix4().fromArray(matrix.Get()); // Three.jsの行列に変換
		threeNode.applyMatrix4(threeMatrix); // Three.jsオブジェクトに行列を適用

		// 子ノードを再帰的に追加
		for (let childNode of node.GetChildNodes()) {
			let threeChildNode = new THREE.Object3D(); // Three.jsの子ノードを作成
			threeNode.add(threeChildNode); // Three.jsの親ノードに子ノードを追加
			this.AddNode(childNode, threeChildNode); // 子ノードを追加
		}

		// メッシュを追加
		for (let meshIndex of node.GetMeshIndices()) {
			let id = new MeshInstanceId(node.GetId(), meshIndex); // メッシュインスタンスのIDを取得
			let mesh = this.model.GetMesh(meshIndex); // モデルからメッシュを取得
			this.threeNodeItems.push({ // Three.jsノードアイテムを追加
				meshInstance: new MeshInstance(id, node, mesh), // メッシュインスタンス
				threeNode: threeNode // Three.jsのノード
			});
		}
	}

	// ノードアイテムを取得するメソッド
	GetNodeItems() {
		return this.threeNodeItems; // Three.jsノードアイテムの配列を返す
	}
}

// Three.jsマテリアルハンドラクラスの定義
export class ThreeMaterialHandler {
	constructor(model, stateHandler, conversionParams, conversionOutput) {
		this.model = model; // モデルオブジェクト
		this.stateHandler = stateHandler; // 変換状態ハンドラ
		this.conversionParams = conversionParams; // 変換パラメータ
		this.conversionOutput = conversionOutput; // 変換出力

		this.shadingType = GetShadingType(model); // シェーディングタイプの取得
		this.modelToThreeLineMaterial = new Map(); // モデルマテリアルからThree.jsラインマテリアルへのマップ
		this.modelToThreeMaterial = new Map(); // モデルマテリアルからThree.jsマテリアルへのマップ
	}

	// Three.jsマテリアルを取得するメソッド
	GetThreeMaterial(modelMaterialIndex, geometryType) {
		if (geometryType === MaterialGeometryType.Face) {
			if (!this.modelToThreeMaterial.has(modelMaterialIndex)) {
				let threeMaterial = this.CreateThreeFaceMaterial(modelMaterialIndex); // Three.jsのフェイスマテリアルを作成
				this.modelToThreeMaterial.set(modelMaterialIndex, threeMaterial); // マテリアルをマップに追加
			}
			return this.modelToThreeMaterial.get(modelMaterialIndex); // マップからマテリアルを取得して返す
		} else if (geometryType === MaterialGeometryType.Line) {
			if (!this.modelToThreeLineMaterial.has(modelMaterialIndex)) {
				let threeMaterial = this.CreateThreeLineMaterial(modelMaterialIndex); // Three.jsのラインマテリアルを作成
				this.modelToThreeLineMaterial.set(modelMaterialIndex, threeMaterial); // マテリアルをマップに追加
			}
			return this.modelToThreeLineMaterial.get(modelMaterialIndex); // マップからマテリアルを取得して返す
		} else {
			return null;
		}
	}

	// Three.jsのフェイスマテリアルを作成するメソッド
	CreateThreeFaceMaterial(materialIndex) {
		// モデルからマテリアルを取得
		let material = this.model.GetMaterial(materialIndex);
		// ベースカラーを取得
		let baseColor = ConvertColorToThreeColor(material.color);
		// 頂点カラーがある場合はベースカラーを上書き
		if (material.vertexColors) {
			baseColor.setRGB(1.0, 1.0, 1.0);
		}

		// マテリアルパラメータの設定
		let materialParams = {
			color: baseColor,
			vertexColors: material.vertexColors,
			opacity: material.opacity,
			transparent: material.transparent,
			alphaTest: material.alphaTest,
			side: THREE.DoubleSide
		};

		// mediumpを強制する場合は精度を設定
		if (this.conversionParams.forceMediumpForMaterials) {
			materialParams.precision = 'mediump';
		}

		let threeMaterial = null;
		if (this.shadingType === ShadingType.Phong) { // Phongシェーディングの場合
			threeMaterial = new THREE.MeshPhongMaterial(materialParams); // MeshPhongMaterialを作成
			if (material.type === MaterialType.Phong) {
				// スペキュラーを設定
				let specularColor = ConvertColorToThreeColor(material.specular);
				if (IsEqual(material.shininess, 0.0)) {
					specularColor.setRGB(0.0, 0.0, 0.0);
				}
				threeMaterial.specular = specularColor;
				threeMaterial.shininess = material.shininess * 100.0;
				// スペキュラーマップを読み込む
				this.LoadFaceTexture(threeMaterial, material.specularMap, (threeTexture) => {
					threeMaterial.specularMap = threeTexture; // スペキュラーマップを設定
				});
			}
		} else if (this.shadingType === ShadingType.Physical) { // Physicalシェーディングの場合
			threeMaterial = new THREE.MeshStandardMaterial(materialParams); // MeshStandardMaterialを作成
			if (material.type === MaterialType.Physical) {
				// 金属度と粗さを設定
				threeMaterial.metalness = material.metalness;
				threeMaterial.roughness = material.roughness;
				// 金属度マップを読み込む
				this.LoadFaceTexture(threeMaterial, material.metalnessMap, (threeTexture) => {
					threeMaterial.metalness = 1.0;
					threeMaterial.roughness = 1.0;
					threeMaterial.metalnessMap = threeTexture;
					threeMaterial.roughnessMap = threeTexture;
				});
			}
		}

		// 放射輝度を設定
		let emissiveColor = ConvertColorToThreeColor(material.emissive);
		threeMaterial.emissive = emissiveColor;

		// テクスチャを読み込む
		this.LoadFaceTexture(threeMaterial, material.diffuseMap, (threeTexture) => {
			if (!material.multiplyDiffuseMap) {
				threeMaterial.color.setRGB(1.0, 1.0, 1.0);
			}
			threeMaterial.map = threeTexture;
		});
		this.LoadFaceTexture(threeMaterial, material.bumpMap, (threeTexture) => {
			threeMaterial.bumpMap = threeTexture;
		});
		this.LoadFaceTexture(threeMaterial, material.normalMap, (threeTexture) => {
			threeMaterial.normalMap = threeTexture;
		});
		this.LoadFaceTexture(threeMaterial, material.emissiveMap, (threeTexture) => {
			threeMaterial.emissiveMap = threeTexture;
		});

		// マテリアルのソースがモデルでない場合は、デフォルトマテリアルとして追加
		if (material.source !== MaterialSource.Model) {
			threeMaterial.userData.source = material.source;
			this.conversionOutput.defaultMaterials.push(threeMaterial);
		}

		return threeMaterial; // Three.jsマテリアルを返す
	}

	// Three.jsのラインマテリアルを作成するメソッド
	CreateThreeLineMaterial(materialIndex) {
		// モデルからマテリアルを取得
		let material = this.model.GetMaterial(materialIndex);
		// ベースカラーを取得
		let baseColor = ConvertColorToThreeColor(material.color);
		// マテリアルパラメータの設定
		let materialParams = {
			color: baseColor,
			opacity: material.opacity
		};

		// mediumpを強制する場合は精度を設定
		if (this.conversionParams.forceMediumpForMaterials) {
			materialParams.precision = 'mediump';
		}

		let threeMaterial = new THREE.LineBasicMaterial(materialParams); // LineBasicMaterialを作成
		// マテリアルのソースがモデルでない場合は、デフォルトマテリアルとして追加
		if (material.source !== MaterialSource.Model) {
			threeMaterial.userData.source = material.source;
			this.conversionOutput.defaultMaterials.push(threeMaterial);
		}

		return threeMaterial; // Three.jsマテリアルを返す
	}

	// テクスチャを読み込むメソッド
	LoadFaceTexture(threeMaterial, texture, onTextureLoaded) {
		// テクスチャパラメータを設定する関数
		function SetTextureParameters(texture, threeTexture) {
			threeTexture.wrapS = THREE.RepeatWrapping;
			threeTexture.wrapT = THREE.RepeatWrapping;
			threeTexture.rotation = texture.rotation;
			threeTexture.offset.x = texture.offset.x;
			threeTexture.offset.y = texture.offset.y;
			threeTexture.repeat.x = texture.scale.x;
			threeTexture.repeat.y = texture.scale.y;
		}

		if (texture === null || !texture.IsValid()) { // テクスチャが無効な場合は処理しない
			return;
		}
		let loader = new THREE.TextureLoader(); // テクスチャローダーを作成
		this.stateHandler.OnTextureNeeded(); // テクスチャの必要性を通知
		let textureObjectUrl = null;
		if (texture.mimeType !== null) { // MIMEタイプがある場合
			textureObjectUrl = CreateObjectUrlWithMimeType(texture.buffer, texture.mimeType); // MIMEタイプ付きのオブジェクトURLを作成
		} else {
			textureObjectUrl = CreateObjectUrl(texture.buffer); // オブジェクトURLを作成
		}
		this.conversionOutput.objectUrls.push(textureObjectUrl); // オブジェクトURLを追加
		loader.load(textureObjectUrl,
			(threeTexture) => {
				SetTextureParameters(texture, threeTexture); // テクスチャパラメータを設定
				threeMaterial.needsUpdate = true; // マテリアルを更新
				onTextureLoaded(threeTexture); // テクスチャ読み込み完了を通知
				this.stateHandler.OnTextureLoaded(); // テクスチャ読み込み完了を通知
			},
			null,
			(err) => {
				this.stateHandler.OnTextureLoaded(); // テクスチャ読み込み完了を通知
			}
		);
	}
}


// ThreeMeshMaterialHandlerクラスの定義
export class ThreeMeshMaterialHandler {
	constructor(threeGeometry, geometryType, materialHandler) {
		// プロパティの初期化
		this.threeGeometry = threeGeometry; // Three.jsのジオメトリ
		this.geometryType = geometryType; // ジオメトリの種類（MaterialGeometryType.FaceまたはMaterialGeometryType.Line）
		this.materialHandler = materialHandler; // ThreeMaterialHandlerのインスタンス

		// 頂点数の設定
		this.itemVertexCount = null;
		if (geometryType === MaterialGeometryType.Face) {
			this.itemVertexCount = 3; // 1つの頂点が持つ座標数（三角形の場合）
		} else if (geometryType === MaterialGeometryType.Line) {
			this.itemVertexCount = 2; // 1つの頂点が持つ座標数（線の場合）
		}

		// メッシュごとのマテリアルと元のマテリアルの配列を初期化
		this.meshThreeMaterials = []; // Three.jsのマテリアルを格納する配列
		this.meshOriginalMaterials = []; // 元のマテリアルのインデックスを格納する配列

		// グループの開始インデックスと前のマテリアルのインデックスを初期化
		this.groupStart = null;
		this.previousMaterialIndex = null;
	}

	// アイテムの処理メソッド
	ProcessItem(itemIndex, materialIndex) {
		// 前のマテリアルと異なる場合
		if (this.previousMaterialIndex !== materialIndex) {
			// グループの追加
			if (this.groupStart !== null) {
				this.AddGroup(this.groupStart, itemIndex - 1);
			}
			this.groupStart = itemIndex;

			// Three.jsのマテリアルを取得して配列に追加
			let threeMaterial = this.materialHandler.GetThreeMaterial(materialIndex, this.geometryType);
			this.meshThreeMaterials.push(threeMaterial);

			// 元のマテリアルのインデックスを配列に追加
			this.meshOriginalMaterials.push(materialIndex);

			// 前のマテリアルのインデックスを更新
			this.previousMaterialIndex = materialIndex;
		}
	}

	// 最終処理メソッド
	Finalize(itemCount) {
		this.AddGroup(this.groupStart, itemCount - 1);
	}

	// グループの追加メソッド
	AddGroup(start, end) {
		// マテリアルのインデックスを取得
		let materialIndex = this.meshThreeMaterials.length - 1;
		// Three.jsのジオメトリにグループを追加
		this.threeGeometry.addGroup(start * this.itemVertexCount, (end - start + 1) * this.itemVertexCount, materialIndex);
	}
}


// Three.jsのモデルオブジェクトに変換する関数
export function ConvertModelToThreeObject(model, conversionParams, conversionOutput, callbacks) {
	// 三角形メッシュを作成する関数
	function CreateThreeTriangleMesh(meshInstance, materialHandler) {
		// メッシュインスタンスからメッシュを取得
		let mesh = meshInstance.mesh;
		// 三角形の数を取得
		let triangleCount = mesh.TriangleCount();
		// 三角形がない場合はnullを返す
		if (triangleCount === 0) {
			return null;
		}

		// 三角形のインデックスを取得し、マテリアルインデックスでソート
		let triangleIndices = [];
		for (let i = 0; i < triangleCount; i++) {
			triangleIndices.push(i);
		}
		triangleIndices.sort((a, b) => {
			let aTriangle = mesh.GetTriangle(a);
			let bTriangle = mesh.GetTriangle(b);
			return aTriangle.mat - bTriangle.mat;
		});

		// ThreeMeshMaterialHandlerを使用してジオメトリを作成
		let threeGeometry = new THREE.BufferGeometry();
		let meshMaterialHandler = new ThreeMeshMaterialHandler(threeGeometry, MaterialGeometryType.Face, materialHandler);

		// 頂点、頂点カラー、法線、UVを初期化
		let vertices = [];
		let vertexColors = [];
		let normals = [];
		let uvs = [];

		// 頂点カラーやUVの有無を確認
		let meshHasVertexColors = (mesh.VertexColorCount() > 0);
		let meshHasUVs = (mesh.TextureUVCount() > 0);
		let processedTriangleCount = 0;

		// 三角形ごとに頂点や情報を処理
		for (let triangleIndex of triangleIndices) {
			let triangle = mesh.GetTriangle(triangleIndex);

			// 頂点座標を追加
			let v0 = mesh.GetVertex(triangle.v0);
			let v1 = mesh.GetVertex(triangle.v1);
			let v2 = mesh.GetVertex(triangle.v2);
			vertices.push(v0.x, v0.y, v0.z, v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);

			// 頂点カラーを追加
			if (triangle.HasVertexColors()) {
				let vc0 = ConvertColorToThreeColor(mesh.GetVertexColor(triangle.c0));
				let vc1 = ConvertColorToThreeColor(mesh.GetVertexColor(triangle.c1));
				let vc2 = ConvertColorToThreeColor(mesh.GetVertexColor(triangle.c2));
				vertexColors.push(
					vc0.r, vc0.g, vc0.b,
					vc1.r, vc1.g, vc1.b,
					vc2.r, vc2.g, vc2.b
				);
			} else if (meshHasVertexColors) {
				vertexColors.push(
					0.0, 0.0, 0.0,
					0.0, 0.0, 0.0,
					0.0, 0.0, 0.0
				);
			}

			// 法線を追加
			let n0 = mesh.GetNormal(triangle.n0);
			let n1 = mesh.GetNormal(triangle.n1);
			let n2 = mesh.GetNormal(triangle.n2);
			normals.push(n0.x, n0.y, n0.z, n1.x, n1.y, n1.z, n2.x, n2.y, n2.z);

			// UVを追加
			if (triangle.HasTextureUVs()) {
				let u0 = mesh.GetTextureUV(triangle.u0);
				let u1 = mesh.GetTextureUV(triangle.u1);
				let u2 = mesh.GetTextureUV(triangle.u2);
				uvs.push(u0.x, u0.y, u1.x, u1.y, u2.x, u2.y);
			} else if (meshHasUVs) {
				uvs.push(0.0, 0.0, 0.0, 0.0, 0.0, 0.0);
			}

			// ThreeMeshMaterialHandlerでアイテムを処理
			meshMaterialHandler.ProcessItem(processedTriangleCount, triangle.mat);
			processedTriangleCount += 1;
		}
		// ThreeMeshMaterialHandlerでの最終処理
		meshMaterialHandler.Finalize(processedTriangleCount);

		// 頂点、頂点カラー、法線、UVをジオメトリにセット
		threeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
		if (vertexColors.length !== 0) {
			threeGeometry.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));
		}
		threeGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
		if (uvs.length !== 0) {
			threeGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
		}

		// Three.jsのMeshオブジェクトを作成し、メッシュに関連付けられたマテリアルを指定
		let threeMesh = new THREE.Mesh(threeGeometry, meshMaterialHandler.meshThreeMaterials);
		// Meshオブジェクトの名前を設定
		threeMesh.name = mesh.GetName();
		// MeshオブジェクトのuserDataにオリジナルのメッシュインスタンスとマテリアルの情報を保存
		threeMesh.userData = {
			originalMeshInstance: meshInstance,
			originalMaterials: meshMaterialHandler.meshOriginalMaterials,
			threeMaterials: null
		};

		// 作成したMeshオブジェクトを返す
		return threeMesh;
	}

	// 線分メッシュを作成する関数
	function CreateThreeLineMesh(meshInstance, materialHandler) {
		// メッシュインスタンスからメッシュを取得
		let mesh = meshInstance.mesh;
		// 線の数を取得
		let lineCount = mesh.LineCount();
		// 線がない場合はnullを返す
		if (lineCount === 0) {
			return null;
		}

		// 線のインデックスを取得し、マテリアルインデックスでソート
		let lineIndices = [];
		for (let i = 0; i < lineCount; i++) {
			lineIndices.push(i);
		}
		lineIndices.sort((a, b) => {
			let aLine = mesh.GetLine(a);
			let bLine = mesh.GetLine(b);
			return aLine.mat - bLine.mat;
		});

		// ThreeMeshMaterialHandlerを使用してジオメトリを作成
		let threeGeometry = new THREE.BufferGeometry();
		let meshMaterialHandler = new ThreeMeshMaterialHandler(threeGeometry, MaterialGeometryType.Line, materialHandler);

		// 頂点を初期化
		let vertices = [];
		let segmentCount = 0;

		// 線ごとに頂点や情報を処理
		for (let i = 0; i < lineIndices.length; i++) {
			let line = mesh.GetLine(lineIndices[i]);
			let lineVertices = line.GetVertices();
			for (let i = 0; i < lineVertices.length; i++) {
				let vertexIndex = lineVertices[i];
				let vertex = mesh.GetVertex(vertexIndex);
				vertices.push(vertex.x, vertex.y, vertex.z);
				// 最初の頂点と最後の頂点以外は2つの頂点を追加
				if (i > 0 && i < lineVertices.length - 1) {
					vertices.push(vertex.x, vertex.y, vertex.z);
				}
			}
			// ThreeMeshMaterialHandlerでアイテムを処理
			meshMaterialHandler.ProcessItem(segmentCount, line.mat);
			segmentCount += line.SegmentCount();
		}
		// ThreeMeshMaterialHandlerでの最終処理
		meshMaterialHandler.Finalize(segmentCount);

		// 頂点をジオメトリにセット
		threeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

		// Three.jsのLineSegmentsオブジェクトを作成し、メッシュに関連付けられたマテリアルを指定
		let threeLine = new THREE.LineSegments(threeGeometry, meshMaterialHandler.meshThreeMaterials);
		// LineSegmentsオブジェクトのuserDataにオリジナルのメッシュインスタンスとマテリアルの情報を保存
		threeLine.userData = {
			originalMeshInstance: meshInstance,
			originalMaterials: meshMaterialHandler.meshOriginalMaterials,
			threeMaterials: null
		};
		// 作成したLineSegmentsオブジェクトを返す
		return threeLine;
	}

	// メッシュを変換する関数
	function ConvertMesh(threeObject, meshInstance, materialHandler) {
		// 空のメッシュかどうかをチェック
		if (IsEmptyMesh(meshInstance.mesh)) {
			return;
		}

		// 三角形メッシュを作成してThree.jsオブジェクトに追加
		let triangleMesh = CreateThreeTriangleMesh(meshInstance, materialHandler);
		if (triangleMesh !== null) {
			threeObject.add(triangleMesh);
		}

		// 線分メッシュを作成してThree.jsオブジェクトに追加
		let lineMesh = CreateThreeLineMesh(meshInstance, materialHandler);
		if (lineMesh !== null) {
			threeObject.add(lineMesh);
		}
	}

	// ノード階層を変換する関数
	function ConvertNodeHierarchy(threeRootNode, model, materialHandler, stateHandler) {
		// ThreeNodeTreeを使用してノードツリーを作成
		let nodeTree = new ThreeNodeTree(model, threeRootNode);
		let threeNodeItems = nodeTree.GetNodeItems();

		// タスクをバッチ処理して非同期に実行
		RunTasksBatch(threeNodeItems.length, 100, {
			runTask: (firstMeshInstanceIndex, lastMeshInstanceIndex, onReady) => {
				// 各メッシュインスタンスに対してメッシュを変換
				for (let meshInstanceIndex = firstMeshInstanceIndex; meshInstanceIndex <= lastMeshInstanceIndex; meshInstanceIndex++) {
					let nodeItem = threeNodeItems[meshInstanceIndex];
					ConvertMesh(nodeItem.threeNode, nodeItem.meshInstance, materialHandler);
				}
				// 処理完了を通知
				onReady();
			},
			// 全てのタスクが完了した際の処理
			onReady: () => {
				stateHandler.OnModelLoaded(threeRootNode);
			}
		});
	}

	// Three.js変換状態ハンドラを初期化
	let stateHandler = new ThreeConversionStateHandler(callbacks);
	// Three.jsマテリアルハンドラを初期化
	let materialHandler = new ThreeMaterialHandler(model, stateHandler, conversionParams, conversionOutput);
	// Three.jsの空のオブジェクトを作成
	let threeObject = new THREE.Object3D();
	// ノード階層を変換
	ConvertNodeHierarchy(threeObject, model, materialHandler, stateHandler);
}
