// DOMユーティリティ関数をインポート
import { GetDomElementOuterWidth, SetDomElementOuterHeight, SetDomElementOuterWidth } from '../engine/viewer/domutils.js';
// 各パネルクラスをインポート
import { NavigatorFilesPanel } from './navigatorfilespanel.js';
import { NavigatorMaterialsPanel } from './navigatormaterialspanel.js';
import { NavigatorMeshesPanel } from './navigatormeshespanel.js';
// パネルセットクラスをインポート
import { PanelSet } from './panelset.js';

// 選択の種類を定義する列挙型オブジェクト
export const SelectionType = {
    Material: 1,
    Mesh: 2
};

// 選択を表すクラス
export class Selection {
    constructor(type, data) {
        this.type = type;  // 選択の種類 (Material or Mesh)
        this.materialIndex = null;  // 選択されたマテリアルのインデックス
        this.meshInstanceId = null;  // 選択されたメッシュのインスタンスID
        // 選択の種類に応じてデータを設定
        if (this.type === SelectionType.Material) {
            this.materialIndex = data;
        } else if (this.type === SelectionType.Mesh) {
            this.meshInstanceId = data;
        }
    }

    // 選択が同じかどうかを比較するメソッド
    IsEqual(rhs) {
        if (this.type !== rhs.type) {  // 種類が異なる場合はfalse
            return false;
        }
        // 種類に応じて比較
        if (this.type === SelectionType.Material) {
            return this.materialIndex === rhs.materialIndex;
        } else if (this.type === SelectionType.Mesh) {
            return this.meshInstanceId.IsEqual(rhs.meshInstanceId);
        }
    }
}

// ナビゲータークラス
export class Navigator {
    constructor(mainDiv) {
        this.mainDiv = mainDiv;  // メインのdiv要素

        // パネルセットの初期化
        this.panelSet = new PanelSet(mainDiv);
        this.callbacks = null;  // コールバック関数
        this.selection = null;  // 現在の選択
        this.tempSelectedMeshId = null;  // 一時的に選択されたメッシュID

        // 各パネルの初期化
        this.filesPanel = new NavigatorFilesPanel(this.panelSet.GetContentDiv());
        this.materialsPanel = new NavigatorMaterialsPanel(this.panelSet.GetContentDiv());
        this.meshesPanel = new NavigatorMeshesPanel(this.panelSet.GetContentDiv());

        // パネルセットにパネルを追加
        this.panelSet.AddPanel(this.filesPanel);
        this.panelSet.AddPanel(this.materialsPanel);
        this.panelSet.AddPanel(this.meshesPanel);
        this.panelSet.ShowPanel(this.meshesPanel);  // 初期表示パネルを設定
    }

    // パネルが表示されているかどうかをチェック
    IsPanelsVisible() {
        return this.panelSet.IsPanelsVisible();
    }

    // パネルの表示・非表示を設定
    ShowPanels(show) {
        this.panelSet.ShowPanels(show);
    }

    // ナビゲーターの初期化
    Init(callbacks) {
        this.callbacks = callbacks;

        // パネルセットの初期化
        this.panelSet.Init({
            onResizeRequested: () => {
                this.callbacks.onResizeRequested();
            },
            onShowHidePanels: (show) => {
                this.callbacks.onShowHidePanels(show);
            }
        });

        // ファイルパネルの初期化
        this.filesPanel.Init({
            onFileBrowseButtonClicked: () => {
                this.callbacks.openFileBrowserDialog();
            }
        });

        // マテリアルパネルの初期化
        this.materialsPanel.Init({
            onMaterialSelected: (materialIndex) => {
                this.SetSelection(new Selection(SelectionType.Material, materialIndex));
            },
            onMeshTemporarySelected: (meshInstanceId) => {
                this.tempSelectedMeshId = meshInstanceId;
                this.callbacks.onMeshSelectionChanged();
            },
            onMeshSelected: (meshInstanceId) => {
                this.SetSelection(new Selection(SelectionType.Mesh, meshInstanceId));
            }
        });

        // メッシュパネルの初期化
        this.meshesPanel.Init({
            onMeshSelected: (meshId) => {
                this.SetSelection(new Selection(SelectionType.Mesh, meshId));
            },
            onMeshShowHide: (meshId) => {
                this.ToggleMeshVisibility(meshId);
            },
            onMeshFitToWindow: (meshId) => {
                this.FitMeshToWindow(meshId);
            },
            onNodeShowHide: (nodeId) => {
                this.ToggleNodeVisibility(nodeId);
            },
            onNodeFitToWindow: (nodeId) => {
                this.FitNodeToWindow(nodeId);
            },
            onMaterialSelected: (materialIndex) => {
                this.SetSelection(new Selection(SelectionType.Material, materialIndex));
            },
            onViewTypeChanged: () => {
                this.SetSelection(null);
            }
        });
    }

    // ナビゲーターの幅を取得
    GetWidth() {
        return GetDomElementOuterWidth(this.mainDiv);
    }

    // ナビゲーターの幅を設定
    SetWidth(width) {
        SetDomElementOuterWidth(this.mainDiv, width);
    }

    // ナビゲーターの高さを設定してリサイズ
    Resize(height) {
        SetDomElementOuterHeight(this.mainDiv, height);
        this.panelSet.Resize();
    }

    // ツリーを埋める（データの初期化）
    FillTree(importResult) {
        this.filesPanel.Fill(importResult);
        if (importResult.missingFiles.length === 0) {
            this.panelSet.SetPanelIcon(this.filesPanel, 'files');
        } else {
            this.panelSet.SetPanelIcon(this.filesPanel, 'missing_files');
        }
        this.materialsPanel.Fill(importResult);
        this.meshesPanel.Fill(importResult);
        this.OnSelectionChanged();
    }

    // メッシュアイテムの数を取得
    MeshItemCount() {
        return this.meshesPanel.MeshItemCount();
    }

    // メッシュが表示されているかどうかをチェック
    IsMeshVisible(meshInstanceId) {
        return this.meshesPanel.IsMeshVisible(meshInstanceId);
    }

    // 隠されたメッシュがあるかどうかをチェック
    HasHiddenMesh() {
        return this.meshesPanel.HasHiddenMesh();
    }

    // すべてのメッシュを表示・非表示に設定
    ShowAllMeshes(show) {
        this.meshesPanel.ShowAllMeshes(show);
        this.callbacks.onMeshVisibilityChanged();
    }

    // ノードの表示・非表示を切り替え
    ToggleNodeVisibility(nodeId) {
        this.meshesPanel.ToggleNodeVisibility(nodeId);
        this.callbacks.onMeshVisibilityChanged();
    }

    // メッシュの表示・非表示を切り替え
    ToggleMeshVisibility(meshInstanceId) {
        this.meshesPanel.ToggleMeshVisibility(meshInstanceId);
        this.callbacks.onMeshVisibilityChanged();
    }

    // メッシュが隔離されているかどうかをチェック
    IsMeshIsolated(meshInstanceId) {
        return this.meshesPanel.IsMeshIsolated(meshInstanceId);
    }

    // メッシュを隔離
    IsolateMesh(meshInstanceId) {
        this.meshesPanel.IsolateMesh(meshInstanceId);
        this.callbacks.onMeshVisibilityChanged();
    }

    // 選択されたメッシュIDを取得
    GetSelectedMeshId() {
        if (this.tempSelectedMeshId !== null) {
            return this.tempSelectedMeshId;
        }
        if (this.selection === null || this.selection.type !== SelectionType.Mesh) {
            return null;
        }
        return this.selection.meshInstanceId;
    }

    // 選択を設定
    SetSelection(selection) {
        function SetEntitySelection(navigator, selection, select) {
            if (selection.type === SelectionType.Material) {
                if (select && navigator.panelSet.IsPanelsVisible()) {
                    navigator.panelSet.ShowPanel(navigator.materialsPanel);
                }
                navigator.materialsPanel.SelectMaterialItem(selection.materialIndex, select);
            } else if (selection.type === SelectionType.Mesh) {
                if (select && navigator.panelSet.IsPanelsVisible()) {
                    navigator.panelSet.ShowPanel(navigator.meshesPanel);
                }
                navigator.meshesPanel.GetMeshItem(selection.meshInstanceId).SetSelected(select);
            }
        }

        function SetCurrentSelection(navigator, selection) {
            navigator.selection = selection;
            navigator.OnSelectionChanged();
        }

        let oldSelection = this.selection;
        if (oldSelection !== null) {
            SetEntitySelection(this, oldSelection, false);
        }

        SetCurrentSelection(this, selection);
        this.tempSelectedMeshId = null;

        if (this.selection !== null) {
            if (oldSelection !== null && oldSelection.IsEqual(this.selection)) {
                SetEntitySelection(this, this.selection, false);
                SetCurrentSelection(this, null);
            } else {
                SetEntitySelection(this, this.selection, true);
            }
        }

        this.callbacks.onMeshSelectionChanged();
    }

    // 選択変更時の処理
    OnSelectionChanged() {
        if (this.selection === null) {
            this.callbacks.onSelectionCleared();
        } else {
            if (this.selection.type === SelectionType.Material) {
                this.callbacks.onMaterialSelected(this.selection.materialIndex);
            } else if (this.selection.type === SelectionType.Mesh) {
                this.callbacks.onMeshSelected(this.selection.meshInstanceId);
            }
        }
        this.UpdatePanels();
    }

    // パネルを更新
    UpdatePanels() {
        let materialIndex = null;
        let meshInstanceId = null;
        if (this.selection !== null) {
            if (this.selection.type === SelectionType.Material) {
                materialIndex = this.selection.materialIndex;
            } else if (this.selection.type === SelectionType.Mesh) {
                meshInstanceId = this.selection.meshInstanceId;
            }
        }

        let usedByMeshes = this.callbacks.getMeshesForMaterial(materialIndex);
        this.materialsPanel.UpdateMeshList(usedByMeshes);

        let usedByMaterials = this.callbacks.getMaterialsForMesh(meshInstanceId);
        this.meshesPanel.UpdateMaterialList(usedByMaterials);
    }

    // ノードをウィンドウにフィット
    FitNodeToWindow(nodeId) {
        let meshInstanceIdSet = new Set();
        let nodeItem = this.meshesPanel.GetNodeItem(nodeId);
        nodeItem.EnumerateMeshItems((meshItem) => {
            meshInstanceIdSet.add(meshItem.GetMeshInstanceId());
        });
        this.callbacks.fitMeshesToWindow(meshInstanceIdSet);
    }

    // メッシュをウィンドウにフィット
    FitMeshToWindow(meshInstanceId) {
        this.callbacks.fitMeshToWindow(meshInstanceId);
    }

    // ナビゲーターをクリア
    Clear() {
        this.panelSet.Clear();
        this.selection = null;
    }
}
