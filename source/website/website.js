import { GetFileExtension, TransformFileHostUrls } from '../engine/io/fileutils.js';
import { InputFilesFromFileObjects, InputFilesFromUrls } from '../engine/import/importerfiles.js';
import { ImportErrorCode, ImportSettings } from '../engine/import/importer.js';
import { NavigationMode, ProjectionMode } from '../engine/viewer/camera.js';
import { RGBColor } from '../engine/model/color.js';
import { Viewer } from '../engine/viewer/viewer.js';
import { AddDiv, AddDomElement, ShowDomElement, SetDomElementOuterHeight, CreateDomElement, GetDomElementOuterWidth, GetDomElementOuterHeight } from '../engine/viewer/domutils.js';
import { CalculatePopupPositionToScreen, ShowListPopup } from './dialogs.js';
import { HandleEvent } from './eventhandler.js';
import { HashHandler } from './hashhandler.js';
import { Navigator, Selection, SelectionType } from './navigator.js';
import { CameraSettings, Settings, Theme } from './settings.js';
import { Sidebar } from './sidebar.js';
import { ThemeHandler } from './themehandler.js';
import { ThreeModelLoaderUI } from './threemodelloaderui.js';
import { Toolbar } from './toolbar.js';
import { DownloadModel, ShowExportDialog } from './exportdialog.js';
import { ShowSnapshotDialog } from './snapshotdialog.js';
import { AddSvgIconElement, GetFilesFromDataTransfer, InstallTooltip, IsSmallWidth } from './utils.js';
import { ShowOpenUrlDialog } from './openurldialog.js';
import { ShowSharingDialog } from './sharingdialog.js';
import { GetDefaultMaterials, ReplaceDefaultMaterialsColor } from '../engine/model/modelutils.js';
import { Direction } from '../engine/geometry/geometry.js';
import { CookieGetBoolVal, CookieSetBoolVal } from './cookiehandler.js';
import { MeasureTool } from './measuretool.js';
import { CloseAllDialogs } from './dialog.js';
import { CreateVerticalSplitter } from './splitter.js';
import { EnumeratePlugins, PluginType } from './pluginregistry.js';
import { EnvironmentSettings } from '../engine/viewer/shadingmodel.js';
import { IntersectionMode } from '../engine/viewer/viewermodel.js';
import { Loc } from '../engine/core/localization.js';

const WebsiteUIState =
{
    Undefined: 0,
    Intro: 1,
    Model: 2,
    Loading: 3
};

class WebsiteLayouter {
    // コンストラクタ
    // クラスのインスタンスを初期化する
    constructor(parameters, navigator, sidebar, viewer, measureTool) {
        // 初期化パラメータを保存
        this.parameters = parameters;
        // ナビゲータを保存
        this.navigator = navigator;
        // サイドバーを保存
        this.sidebar = sidebar;
        // ビューアーを保存
        this.viewer = viewer;
        // 測定ツールを保存
        this.measureTool = measureTool;
        // パネルの最小幅とキャンバスの最小幅の制限を設定
        this.limits = {
            minPanelWidth: 290,
            minCanvasWidth: 100
        };
    }

    // 初期化メソッド
    // 分割バーをインストールし、初期サイズを設定する
    Init() {
        // ナビゲータの分割バーをインストール
        this.InstallSplitter(this.parameters.navigatorSplitterDiv, this.parameters.navigatorDiv, (originalWidth, xDiff) => {
            // 新しい幅を計算し、分割バーがドラッグされたときの動作を設定
            let newWidth = originalWidth + xDiff;
            this.OnSplitterDragged(newWidth - this.navigator.GetWidth(), 0);
        });

        // サイドバーの分割バーをインストール
        this.InstallSplitter(this.parameters.sidebarSplitterDiv, this.parameters.sidebarDiv, (originalWidth, xDiff) => {
            // 新しい幅を計算し、分割バーがドラッグされたときの動作を設定
            let newWidth = originalWidth - xDiff;
            this.OnSplitterDragged(0, newWidth - this.sidebar.GetWidth());
        });

        // サイズをリサイズ
        this.Resize();
    }

    // 分割バーをインストールするメソッド
    // 分割バーをドラッグ可能にし、ドラッグ操作を設定する
    InstallSplitter(splitterDiv, resizedDiv, onSplit) {
        // オリジナルの幅を保持する変数
        let originalWidth = null;
        // 垂直分割バーを作成
        CreateVerticalSplitter(splitterDiv, {
            // 分割開始時の動作を設定
            onSplitStart: () => {
                // 分割開始時にオリジナルの幅を取得
                originalWidth = GetDomElementOuterWidth(resizedDiv);
            },
            // 分割中の動作を設定
            onSplit: (xDiff) => {
                // 分割中にオリジナルの幅とxの差分を渡して、分割操作を実行
                onSplit(originalWidth, xDiff);
            }
        });
    }


    // 分割バーがドラッグされたときの処理
    OnSplitterDragged(leftDiff, rightDiff) {
        // ウィンドウの幅を取得
        let windowWidth = window.innerWidth;

        // ナビゲータとサイドバーの現在の幅を取得
        let navigatorWidth = this.navigator.GetWidth();
        let sidebarWidth = this.sidebar.GetWidth();

        // 左と右のコンテナの現在の幅を取得
        let leftWidth = GetDomElementOuterWidth(this.parameters.leftContainerDiv);
        let rightWidth = GetDomElementOuterWidth(this.parameters.rightContainerDiv);

        // ドラッグ後の新しい幅を計算
        let newLeftWidth = leftWidth + leftDiff;
        let newRightWidth = rightWidth + rightDiff;
        let contentNewWidth = windowWidth - newLeftWidth - newRightWidth;

        // ナビゲータとサイドバーの表示状態を確認
        let isNavigatorVisible = this.navigator.IsPanelsVisible();
        let isSidebarVisible = this.sidebar.IsPanelsVisible();

        // ナビゲータの幅が最小幅以下の場合の処理
        if (isNavigatorVisible && newLeftWidth < this.limits.minPanelWidth) {
            newLeftWidth = this.limits.minPanelWidth;
        }

        // サイドバーの幅が最小幅以下の場合の処理
        if (isSidebarVisible && newRightWidth < this.limits.minPanelWidth) {
            newRightWidth = this.limits.minPanelWidth;
        }

        // コンテンツの幅が最小幅以下の場合の処理
        if (contentNewWidth < this.limits.minCanvasWidth) {
            if (leftDiff > 0) {
                newLeftWidth = windowWidth - newRightWidth - this.limits.minCanvasWidth;
            } else if (rightDiff > 0) {
                newRightWidth = windowWidth - newLeftWidth - this.limits.minCanvasWidth;
            }
        }

        // ナビゲータの幅を設定
        if (isNavigatorVisible) {
            let newNavigatorWidth = navigatorWidth + (newLeftWidth - leftWidth);
            this.navigator.SetWidth(newNavigatorWidth);
        }

        // サイドバーの幅を設定
        if (isSidebarVisible) {
            let newSidebarWidth = sidebarWidth + (newRightWidth - rightWidth);
            this.sidebar.SetWidth(newSidebarWidth);
        }

        // 全体のリサイズを実行
        this.Resize();
    }

    // ウィンドウ全体をリサイズするメソッド
    Resize() {
        // ウィンドウの幅と高さを取得
        let windowWidth = window.innerWidth;
        let windowHeight = window.innerHeight;
        // ヘッダーの高さを取得
        let headerHeight = this.parameters.headerDiv.offsetHeight;

        // 左と右のコンテナの幅と安全マージンを初期化
        let leftWidth = 0;
        let rightWidth = 0;
        let safetyMargin = 0;

        // 小さい幅でない場合の処理
        if (!IsSmallWidth()) {
            leftWidth = GetDomElementOuterWidth(this.parameters.leftContainerDiv);
            rightWidth = GetDomElementOuterWidth(this.parameters.rightContainerDiv);
            safetyMargin = 1;
        }

        // コンテンツの幅と高さを計算
        let contentWidth = windowWidth - leftWidth - rightWidth;
        let contentHeight = windowHeight - headerHeight;

        // コンテンツの幅が最小幅以下の場合の処理
        if (contentWidth < this.limits.minCanvasWidth) {
            let neededIncrease = this.limits.minCanvasWidth - contentWidth;

            let isNavigatorVisible = this.navigator.IsPanelsVisible();
            let isSidebarVisible = this.sidebar.IsPanelsVisible();

            if (neededIncrease > 0 && isNavigatorVisible) {
                let navigatorDecrease = Math.min(neededIncrease, leftWidth - this.limits.minPanelWidth);
                this.navigator.SetWidth(this.navigator.GetWidth() - navigatorDecrease);
                neededIncrease -= navigatorDecrease;
            }

            if (neededIncrease > 0 && isSidebarVisible) {
                let sidebarDecrease = Math.min(neededIncrease, rightWidth - this.limits.minPanelWidth);
                this.sidebar.SetWidth(this.sidebar.GetWidth() - sidebarDecrease);
            }

            leftWidth = GetDomElementOuterWidth(this.parameters.leftContainerDiv);
            rightWidth = GetDomElementOuterWidth(this.parameters.rightContainerDiv);
            contentWidth = windowWidth - leftWidth - rightWidth;
        }

        // ナビゲータのリサイズ
        this.navigator.Resize(contentHeight);
        SetDomElementOuterHeight(this.parameters.navigatorSplitterDiv, contentHeight);

        // サイドバーのリサイズ
        this.sidebar.Resize(contentHeight);
        SetDomElementOuterHeight(this.parameters.sidebarSplitterDiv, contentHeight);

        // ビューアーのリサイズ
        SetDomElementOuterHeight(this.parameters.introDiv, contentHeight);
        this.viewer.Resize(contentWidth - safetyMargin, contentHeight);

        // イントロコンテンツの高さと位置を設定
        let introContentHeight = GetDomElementOuterHeight(this.parameters.introContentDiv);
        let introContentTop = (contentHeight - introContentHeight) / 3.0;
        this.parameters.introContentDiv.style.top = introContentTop.toString() + 'px';

        // 測定ツールのリサイズ
        this.measureTool.Resize();
    }

}

export class Website {
    // コンストラクタ
    constructor(parameters) {
        this.parameters = parameters; // パラメータの初期化
        this.settings = new Settings(Theme.Light); // 設定を初期化（ライトテーマ）
        this.cameraSettings = new CameraSettings(); // カメラ設定の初期化
        this.viewer = new Viewer(); // ビューアーの初期化
        this.measureTool = new MeasureTool(this.viewer, this.settings); // 測定ツールの初期化
        this.hashHandler = new HashHandler(); // ハッシュハンドラの初期化
        this.toolbar = new Toolbar(this.parameters.toolbarDiv); // ツールバーの初期化
        this.navigator = new Navigator(this.parameters.navigatorDiv); // ナビゲーターの初期化
        this.sidebar = new Sidebar(this.parameters.sidebarDiv, this.settings); // サイドバーの初期化
        this.modelLoaderUI = new ThreeModelLoaderUI(); // モデルローダーUIの初期化
        this.themeHandler = new ThemeHandler(); // テーマハンドラの初期化
        this.highlightColor = new RGBColor(142, 201, 240); // ハイライトカラーの設定
        this.uiState = WebsiteUIState.Undefined; // UI状態の初期化
        this.layouter = new WebsiteLayouter(this.parameters, this.navigator, this.sidebar, this.viewer, this.measureTool); // レイアウト管理の初期化
        this.model = null; // モデルの初期化
    }

    // ページをロードするメソッド
    Load() {
        this.settings.LoadFromCookies(); // クッキーから設定を読み込む
        this.cameraSettings.LoadFromCookies(); // クッキーからカメラ設定を読み込む

        this.SwitchTheme(this.settings.themeId, false); // テーマを切り替える
        HandleEvent('theme_on_load', this.settings.themeId === Theme.Light ? 'light' : 'dark'); // テーマロードイベントを処理

        // プラグインのヘッダーを列挙し、ボタンを登録
        EnumeratePlugins(PluginType.Header, (plugin) => {
            plugin.registerButtons({
                createHeaderButton: (icon, title, link) => {
                    this.CreateHeaderButton(icon, title, link); // ヘッダーボタンを作成
                }
            });
        });

        this.InitViewer(); // ビューアーの初期化
        this.InitToolbar(); // ツールバーの初期化
        this.InitDragAndDrop(); // ドラッグアンドドロップの初期化
        this.InitSidebar(); // サイドバーの初期化
        this.InitNavigator(); // ナビゲーターの初期化
        this.InitCookieConsent(); // クッキー同意の初期化

        this.viewer.SetMouseClickHandler(this.OnModelClicked.bind(this)); // モデルクリックハンドラを設定
        this.viewer.SetMouseMoveHandler(this.OnModelMouseMoved.bind(this)); // モデルマウス移動ハンドラを設定
        this.viewer.SetContextMenuHandler(this.OnModelContextMenu.bind(this)); // モデルコンテキストメニューハンドラを設定

        this.layouter.Init(); // レイアウトの初期化
        this.SetUIState(WebsiteUIState.Intro); // UI状態をイントロに設定

        this.hashHandler.SetEventListener(this.OnHashChange.bind(this)); // ハッシュ変更イベントリスナーを設定
        this.OnHashChange(); // ハッシュ変更時の処理

        // ウィンドウサイズ変更イベントを設定
        window.addEventListener('resize', () => {
            this.layouter.Resize(); // レイアウトをリサイズ
        });
    }

    // モデルが読み込まれているか確認するメソッド
    HasLoadedModel() {
        return this.model !== null; // モデルが存在するかどうかを返す
    }

    // UI状態を設定するメソッド
    SetUIState(uiState) {
        // モデル要素のみ表示するかどうかを設定する内部関数
        function ShowOnlyOnModelElements(show) {
            let root = document.querySelector(':root'); // ルート要素を取得
            root.style.setProperty('--ov_only_on_model_display', show ? 'inherit' : 'none'); // 表示スタイルを設定
        }

        if (this.uiState === uiState) { // 同じ状態なら何もしない
            return;
        }

        this.uiState = uiState; // UI状態を更新

        // 各UI状態に応じて表示を切り替える
        if (this.uiState === WebsiteUIState.Intro) {
            ShowDomElement(this.parameters.introDiv, true); // イントロダイビングを表示
            ShowDomElement(this.parameters.headerDiv, true); // ヘッダーを表示
            ShowDomElement(this.parameters.mainDiv, false); // メインダイビングを非表示
            ShowOnlyOnModelElements(false); // モデル要素を非表示
        } else if (this.uiState === WebsiteUIState.Model) {
            ShowDomElement(this.parameters.introDiv, false); // イントロダイビングを非表示
            ShowDomElement(this.parameters.headerDiv, true); // ヘッダーを表示
            ShowDomElement(this.parameters.mainDiv, true); // メインダイビングを表示
            ShowOnlyOnModelElements(true); // モデル要素を表示
            this.UpdatePanelsVisibility(); // パネルの表示を更新
        } else if (this.uiState === WebsiteUIState.Loading) {
            ShowDomElement(this.parameters.introDiv, false); // イントロダイビングを非表示
            ShowDomElement(this.parameters.headerDiv, true); // ヘッダーを表示
            ShowDomElement(this.parameters.mainDiv, false); // メインダイビングを非表示
            ShowOnlyOnModelElements(false); // モデル要素を非表示
        }

        this.layouter.Resize(); // レイアウトをリサイズ
    }

    // モデルをクリアするメソッド
    ClearModel() {
        CloseAllDialogs(); // 全てのダイアログを閉じる

        this.model = null; // モデルをクリア
        this.viewer.Clear(); // ビューアをクリア

        this.parameters.fileNameDiv.innerHTML = ''; // ファイル名表示をクリア

        this.navigator.Clear(); // ナビゲータをクリア
        this.sidebar.Clear(); // サイドバーをクリア

        this.measureTool.SetActive(false); // 測定ツールを無効にする
    }

    // モデルがロードされたときのメソッド
    OnModelLoaded(importResult, threeObject) {
        this.model = importResult.model; // インポートされたモデルを設定
        this.parameters.fileNameDiv.innerHTML = importResult.mainFile; // ファイル名を表示
        this.viewer.SetMainObject(threeObject); // ビューアにモデルを設定
        this.viewer.SetUpVector(Direction.Y, false); // 上方向をY軸に設定
        this.navigator.FillTree(importResult); // ナビゲータを更新
        this.sidebar.UpdateControlsVisibility(); // サイドバーの表示を更新
        this.FitModelToWindow(true); // モデルをウィンドウにフィットさせる
    }

    // モデルがクリックされたときのメソッド
    OnModelClicked(button, mouseCoordinates) {
        if (button !== 1) { // 左クリック以外は無視
            return;
        }

        if (this.measureTool.IsActive()) { // 測定ツールが有効な場合
            this.measureTool.Click(mouseCoordinates); // 測定ツールのクリック処理
            return;
        }

        // マウス下のメッシュのユーザーデータを取得
        let meshUserData = this.viewer.GetMeshUserDataUnderMouse(IntersectionMode.MeshAndLine, mouseCoordinates);
        if (meshUserData === null) {
            this.navigator.SetSelection(null); // メッシュがない場合は選択をクリア
        } else {
            // メッシュがある場合は選択を設定
            this.navigator.SetSelection(new Selection(SelectionType.Mesh, meshUserData.originalMeshInstance.id));
        }
    }

    // モデル上でマウスが動いたときのメソッド
    OnModelMouseMoved(mouseCoordinates) {
        if (this.measureTool.IsActive()) { // 測定ツールが有効な場合
            this.measureTool.MouseMove(mouseCoordinates); // 測定ツールのマウス移動処理
        }
    }

    // モデル上で右クリックメニューが表示されたときのメソッド
    OnModelContextMenu(globalMouseCoordinates, mouseCoordinates) {
        // マウス下のメッシュのユーザーデータを取得
        let meshUserData = this.viewer.GetMeshUserDataUnderMouse(IntersectionMode.MeshAndLine, mouseCoordinates);
        let items = []; // コンテキストメニューの項目を格納する配列

        if (meshUserData === null) {
            // メッシュがない場合のメニュー項目を追加
            items.push({
                name: Loc('Fit model to window'),
                icon: 'fit',
                onClick: () => {
                    this.FitModelToWindow(false); // モデルをウィンドウにフィットさせる
                }
            });
            if (this.navigator.HasHiddenMesh()) {
                items.push({
                    name: Loc('Show all meshes'),
                    icon: 'visible',
                    onClick: () => {
                        this.navigator.ShowAllMeshes(true); // 全てのメッシュを表示
                    }
                });
            }
        } else {
            // メッシュがある場合のメニュー項目を追加
            items.push({
                name: Loc('Hide mesh'),
                icon: 'hidden',
                onClick: () => {
                    this.navigator.ToggleMeshVisibility(meshUserData.originalMeshInstance.id); // メッシュの表示/非表示を切り替える
                }
            });
            items.push({
                name: Loc('Fit mesh to window'),
                icon: 'fit',
                onClick: () => {
                    this.navigator.FitMeshToWindow(meshUserData.originalMeshInstance.id); // メッシュをウィンドウにフィットさせる
                }
            });
            if (this.navigator.MeshItemCount() > 1) {
                let isMeshIsolated = this.navigator.IsMeshIsolated(meshUserData.originalMeshInstance.id);
                items.push({
                    name: isMeshIsolated ? Loc('Remove isolation') : Loc('Isolate mesh'),
                    icon: isMeshIsolated ? 'deisolate' : 'isolate',
                    onClick: () => {
                        if (isMeshIsolated) {
                            this.navigator.ShowAllMeshes(true); // 全てのメッシュを表示
                        } else {
                            this.navigator.IsolateMesh(meshUserData.originalMeshInstance.id); // メッシュを隔離表示
                        }
                    }
                });
            }
        }

        // コンテキストメニューを表示
        ShowListPopup(items, {
            calculatePosition: (contentDiv) => {
                return CalculatePopupPositionToScreen(globalMouseCoordinates, contentDiv); // ポップアップの位置を計算
            },
            onClick: (index) => {
                let clickedItem = items[index];
                clickedItem.onClick(); // メニュー項目がクリックされたときの処理
            }
        });
    }

    // ハッシュが変化したときの処理
    OnHashChange() {
        // ハッシュが存在する場合
        if (this.hashHandler.HasHash()) {
            let urls = this.hashHandler.GetModelFilesFromHash(); // ハッシュからモデルファイルのURLを取得
            if (urls === null) {
                return; // URLがない場合は終了
            }
            TransformFileHostUrls(urls); // ファイルホストのURLを変換
            let importSettings = new ImportSettings(); // インポート設定を作成
            importSettings.defaultLineColor = this.settings.defaultLineColor; // デフォルトの線の色を設定
            importSettings.defaultColor = this.settings.defaultColor; // デフォルトの色を設定
            let defaultColor = this.hashHandler.GetDefaultColorFromHash(); // ハッシュからデフォルトの色を取得
            if (defaultColor !== null) {
                importSettings.defaultColor = defaultColor; // デフォルトの色がある場合は設定
            }
            HandleEvent('model_load_started', 'hash'); // モデルロード開始イベントを発生
            this.LoadModelFromUrlList(urls, importSettings); // URLリストからモデルをロード
        } else {
            this.ClearModel(); // モデルをクリア
            this.SetUIState(WebsiteUIState.Intro); // UI状態をイントロに設定
        }
    }

    // ファイルブラウザダイアログを開く
    OpenFileBrowserDialog() {
        this.parameters.fileInput.click(); // ファイル入力要素をクリック
    }

    // モデルをウィンドウにフィットさせる
    FitModelToWindow(onLoad) {
        let animation = !onLoad; // ロード時以外はアニメーションを有効に
        let boundingSphere = this.viewer.GetBoundingSphere((meshUserData) => {
            return this.navigator.IsMeshVisible(meshUserData.originalMeshInstance.id); // メッシュが表示されているか確認
        });
        if (onLoad) {
            this.viewer.AdjustClippingPlanesToSphere(boundingSphere); // ロード時はクリッピングプレーンを調整
        }
        this.viewer.FitSphereToWindow(boundingSphere, animation); // スフィアをウィンドウにフィット
    }

    // 特定のメッシュをウィンドウにフィットさせる
    FitMeshToWindow(meshInstanceId) {
        let boundingSphere = this.viewer.GetBoundingSphere((meshUserData) => {
            return meshUserData.originalMeshInstance.id.IsEqual(meshInstanceId); // 指定されたメッシュIDに一致するか確認
        });
        this.viewer.FitSphereToWindow(boundingSphere, true); // スフィアをウィンドウにフィット
    }

    // 指定されたメッシュセットをウィンドウにフィットさせる
    FitMeshesToWindow(meshInstanceIdSet) {
        let meshInstanceIdKeys = new Set();
        for (let meshInstanceId of meshInstanceIdSet) {
            meshInstanceIdKeys.add(meshInstanceId.GetKey()); // メッシュIDセットのキーを取得
        }
        let boundingSphere = this.viewer.GetBoundingSphere((meshUserData) => {
            return meshInstanceIdKeys.has(meshUserData.originalMeshInstance.id.GetKey()); // キーが一致するか確認
        });
        this.viewer.FitSphereToWindow(boundingSphere, true); // スフィアをウィンドウにフィット
    }

    // メッシュの表示を更新する
    UpdateMeshesVisibility() {
        this.viewer.SetMeshesVisibility((meshUserData) => {
            return this.navigator.IsMeshVisible(meshUserData.originalMeshInstance.id); // メッシュが表示されているか確認
        });
    }

    // メッシュの選択状態を更新する
    UpdateMeshesSelection() {
        let selectedMeshId = this.navigator.GetSelectedMeshId(); // 選択されたメッシュIDを取得
        this.viewer.SetMeshesHighlight(this.highlightColor, (meshUserData) => {
            if (selectedMeshId !== null && meshUserData.originalMeshInstance.id.IsEqual(selectedMeshId)) {
                return true; // 選択されたメッシュの場合はハイライトを有効に
            }
            return false; // それ以外はハイライトを無効に
        });
    }

    // URLリストからモデルをロードする
    LoadModelFromUrlList(urls, settings) {
        let inputFiles = InputFilesFromUrls(urls); // URLから入力ファイルを作成
        this.LoadModelFromInputFiles(inputFiles, settings); // 入力ファイルからモデルをロード
        this.ClearHashIfNotOnlyUrlList(); // ハッシュがURLリストのみでない場合はクリア
    }

    // ファイルリストからモデルをロードする
    LoadModelFromFileList(files) {
        let importSettings = new ImportSettings(); // インポート設定を作成
        importSettings.defaultLineColor = this.settings.defaultLineColor; // デフォルトの線の色を設定
        importSettings.defaultColor = this.settings.defaultColor; // デフォルトの色を設定
        let inputFiles = InputFilesFromFileObjects(files); // ファイルオブジェクトから入力ファイルを作成
        this.LoadModelFromInputFiles(inputFiles, importSettings); // 入力ファイルからモデルをロード
        this.ClearHashIfNotOnlyUrlList(); // ハッシュがURLリストのみでない場合はクリア
    }

    // 入力ファイルからモデルをロードする
    LoadModelFromInputFiles(files, settings) {
        this.modelLoaderUI.LoadModel(files, settings, {
            onStart: () => {
                this.SetUIState(WebsiteUIState.Loading); // UI状態をロード中に設定
                this.ClearModel(); // モデルをクリア
            },
            onFinish: (importResult, threeObject) => {
                this.SetUIState(WebsiteUIState.Model); // UI状態をモデルに設定
                this.OnModelLoaded(importResult, threeObject); // モデルがロードされたときの処理
                let importedExtension = GetFileExtension(importResult.mainFile); // インポートされたファイルの拡張子を取得
                HandleEvent('model_loaded', importedExtension); // モデルがロードされたイベントを発生
            },
            onRender: () => {
                this.viewer.Render(); // ビューアをレンダリング
            },
            onError: (importError) => {
                this.SetUIState(WebsiteUIState.Intro); // UI状態をイントロに設定
                let extensionStr = null;
                if (importError.mainFile !== null) {
                    extensionStr = GetFileExtension(importError.mainFile); // エラーが発生したファイルの拡張子を取得
                } else {
                    let extensions = [];
                    let importer = this.modelLoaderUI.GetImporter();
                    let fileList = importer.GetFileList().GetFiles();
                    for (let i = 0; i < fileList.length; i++) {
                        let extension = fileList[i].extension; // ファイルリストから拡張子を取得
                        extensions.push(extension);
                    }
                    extensionStr = extensions.join(','); // 拡張子をカンマ区切りで結合
                }
                if (importError.code === ImportErrorCode.NoImportableFile) {
                    HandleEvent('no_importable_file', extensionStr); // インポート可能なファイルがないエラー
                } else if (importError.code === ImportErrorCode.FailedToLoadFile) {
                    HandleEvent('failed_to_load_file', extensionStr); // ファイルのロードに失敗したエラー
                } else if (importError.code === ImportErrorCode.ImportFailed) {
                    HandleEvent('import_failed', extensionStr, {
                        error_message: importError.message // インポートに失敗したエラー
                    });
                }
            }
        });
    }

    // ハッシュがURLリストだけでない場合にクリアする関数
    ClearHashIfNotOnlyUrlList() {
        let importer = this.modelLoaderUI.GetImporter(); // モデルインポーターを取得
        let isOnlyUrl = importer.GetFileList().IsOnlyUrlSource(); // ファイルリストがURLソースのみか確認
        if (!isOnlyUrl && this.hashHandler.HasHash()) { // URLソースのみでなく、ハッシュが存在する場合
            this.hashHandler.SkipNextEventHandler(); // 次のイベントハンドラをスキップ
            this.hashHandler.ClearHash(); // ハッシュをクリア
        }
    }

    // エッジ表示を更新する関数
    UpdateEdgeDisplay() {
        this.settings.SaveToCookies(); // 設定をクッキーに保存
        this.viewer.SetEdgeSettings(this.settings.edgeSettings); // ビューアのエッジ設定を更新
    }

    // 環境マップを更新する関数
    UpdateEnvironmentMap() {
        // 環境マップのパスを設定
        let envMapPath = 'assets/envmaps/' + this.settings.environmentMapName + '/';
        let envMapTextures = [
            envMapPath + 'posx.jpg',
            envMapPath + 'negx.jpg',
            envMapPath + 'posy.jpg',
            envMapPath + 'negy.jpg',
            envMapPath + 'posz.jpg',
            envMapPath + 'negz.jpg'
        ];
        // 環境設定を作成
        let environmentSettings = new EnvironmentSettings(envMapTextures, this.settings.backgroundIsEnvMap);
        this.viewer.SetEnvironmentMapSettings(environmentSettings); // ビューアの環境マップ設定を更新
    }

    // テーマを切り替える関数
    SwitchTheme(newThemeId, resetColors) {
        this.settings.themeId = newThemeId; // 新しいテーマIDを設定
        this.themeHandler.SwitchTheme(this.settings.themeId); // テーマを切り替え
        if (resetColors) { // 色をリセットする場合
            let defaultSettings = new Settings(this.settings.themeId); // デフォルト設定を取得
            this.settings.backgroundColor = defaultSettings.backgroundColor; // 背景色を設定
            this.settings.defaultLineColor = defaultSettings.defaultLineColor; // デフォルトの線の色を設定
            this.settings.defaultColor = defaultSettings.defaultColor; // デフォルトの色を設定
            this.sidebar.UpdateControlsStatus(); // サイドバーのコントロールを更新

            this.viewer.SetBackgroundColor(this.settings.backgroundColor); // ビューアの背景色を設定
            let modelLoader = this.modelLoaderUI.GetModelLoader(); // モデルローダーを取得
            if (modelLoader.GetDefaultMaterials() !== null) { // デフォルトのマテリアルが存在する場合
                ReplaceDefaultMaterialsColor(this.model, this.settings.defaultColor, this.settings.defaultLineColor); // デフォルトマテリアルの色を置換
                modelLoader.ReplaceDefaultMaterialsColor(this.settings.defaultColor, this.settings.defaultLineColor); // モデルローダーのデフォルトマテリアルの色を置換
            }
        }

        this.settings.SaveToCookies(); // 設定をクッキーに保存
    }

    // ビューアを初期化する関数
    InitViewer() {
        let canvas = AddDomElement(this.parameters.viewerDiv, 'canvas'); // ビューアのキャンバス要素を追加
        this.viewer.Init(canvas); // ビューアを初期化
        this.viewer.SetEdgeSettings(this.settings.edgeSettings); // ビューアのエッジ設定を適用
        this.viewer.SetBackgroundColor(this.settings.backgroundColor); // ビューアの背景色を適用
        this.viewer.SetNavigationMode(this.cameraSettings.navigationMode); // ビューアのナビゲーションモードを設定
        this.viewer.SetProjectionMode(this.cameraSettings.projectionMode); // ビューアのプロジェクションモードを設定
        this.UpdateEnvironmentMap(); // 環境マップを更新
    }


    // ツールバーを初期化する関数
    InitToolbar() {
        // ツールバーにボタンを追加する関数
        function AddButton(toolbar, imageName, imageTitle, classNames, onClick) {
            // ボタンを作成し、クリックイベントを設定
            let button = toolbar.AddImageButton(imageName, imageTitle, () => {
                onClick();
            });
            // クラス名を追加
            for (let className of classNames) {
                button.AddClass(className);
            }
            return button; // 作成したボタンを返す
        }

        // ツールバーにプッシュボタンを追加する関数
        function AddPushButton(toolbar, imageName, imageTitle, classNames, onClick) {
            // プッシュボタンを作成し、選択イベントを設定
            let button = toolbar.AddImagePushButton(imageName, imageTitle, false, (isSelected) => {
                onClick(isSelected);
            });
            // クラス名を追加
            for (let className of classNames) {
                button.AddClass(className);
            }
            return button; // 作成したボタンを返す
        }

        // ツールバーにラジオボタンを追加する関数
        function AddRadioButton(toolbar, imageNames, imageTitles, selectedIndex, classNames, onClick) {
            // 画像とタイトルのデータを作成
            let imageData = [];
            for (let i = 0; i < imageNames.length; i++) {
                let imageName = imageNames[i];
                let imageTitle = imageTitles[i];
                imageData.push({
                    image: imageName,
                    title: imageTitle
                });
            }
            // ラジオボタンを作成し、選択イベントを設定
            let buttons = toolbar.AddImageRadioButton(imageData, selectedIndex, (buttonIndex) => {
                onClick(buttonIndex);
            });
            // クラス名を追加
            for (let className of classNames) {
                for (let button of buttons) {
                    button.AddClass(className);
                }
            }
        }

        // ツールバーにセパレーターを追加する関数
        function AddSeparator(toolbar, classNames) {
            let separator = toolbar.AddSeparator(); // セパレーターを追加
            if (classNames !== null) {
                // クラス名を追加
                for (let className of classNames) {
                    separator.classList.add(className);
                }
            }
        }

        // モデルインポーターを取得
        let importer = this.modelLoaderUI.GetImporter();
        // ナビゲーションモードのインデックスを設定
        let navigationModeIndex = (this.cameraSettings.navigationMode === NavigationMode.FixedUpVector ? 0 : 1);
        // プロジェクションモードのインデックスを設定
        let projectionModeIndex = (this.cameraSettings.projectionMode === ProjectionMode.Perspective ? 0 : 1);

        // ファイルを開くボタンを追加
        AddButton(this.toolbar, 'open', Loc('Open from your device'), [], () => {
            this.OpenFileBrowserDialog();
        });
        // URLから開くボタンを追加
        AddButton(this.toolbar, 'open_url', Loc('Open from url'), [], () => {
            ShowOpenUrlDialog((urls) => {
                if (urls.length > 0) {
                    this.hashHandler.SetModelFilesToHash(urls);
                }
            });
        });
        // セパレーターを追加
        AddSeparator(this.toolbar, ['only_on_model']);
        // モデルをウィンドウにフィットさせるボタンを追加
        AddButton(this.toolbar, 'fit', Loc('Fit model to window'), ['only_on_model'], () => {
            this.FitModelToWindow(false);
        });
        // Y軸を上方向に設定するボタンを追加
        AddButton(this.toolbar, 'up_y', Loc('Set Y axis as up vector'), ['only_on_model'], () => {
            this.viewer.SetUpVector(Direction.Y, true);
        });
        // Z軸を上方向に設定するボタンを追加
        AddButton(this.toolbar, 'up_z', Loc('Set Z axis as up vector'), ['only_on_model'], () => {
            this.viewer.SetUpVector(Direction.Z, true);
        });
        // 上方向ベクトルを反転させるボタンを追加
        AddButton(this.toolbar, 'flip', Loc('Flip up vector'), ['only_on_model'], () => {
            this.viewer.FlipUpVector();
        });
        // セパレーターを追加
        AddSeparator(this.toolbar, ['only_full_width', 'only_on_model']);
        // ナビゲーションモードを設定するラジオボタンを追加
        AddRadioButton(this.toolbar, ['fix_up_on', 'fix_up_off'], [Loc('Fixed up vector'), Loc('Free orbit')], navigationModeIndex, ['only_full_width', 'only_on_model'], (buttonIndex) => {
            if (buttonIndex === 0) {
                this.cameraSettings.navigationMode = NavigationMode.FixedUpVector;
            } else if (buttonIndex === 1) {
                this.cameraSettings.navigationMode = NavigationMode.FreeOrbit;
            }
            this.cameraSettings.SaveToCookies(); // 設定をクッキーに保存
            this.viewer.SetNavigationMode(this.cameraSettings.navigationMode); // ビューアのナビゲーションモードを設定
        });
        // セパレーターを追加
        AddSeparator(this.toolbar, ['only_full_width', 'only_on_model']);
        // プロジェクションモードを設定するラジオボタンを追加
        AddRadioButton(this.toolbar, ['camera_perspective', 'camera_orthographic'], [Loc('Perspective camera'), Loc('Orthographic camera')], projectionModeIndex, ['only_full_width', 'only_on_model'], (buttonIndex) => {
            if (buttonIndex === 0) {
                this.cameraSettings.projectionMode = ProjectionMode.Perspective;
            } else if (buttonIndex === 1) {
                this.cameraSettings.projectionMode = ProjectionMode.Orthographic;
            }
            this.cameraSettings.SaveToCookies(); // 設定をクッキーに保存
            this.viewer.SetProjectionMode(this.cameraSettings.projectionMode); // ビューアのプロジェクションモードを設定
            this.sidebar.UpdateControlsVisibility(); // サイドバーのコントロール表示を更新
        });
        // セパレーターを追加
        AddSeparator(this.toolbar, ['only_full_width', 'only_on_model']);
        // メジャーツールのプッシュボタンを追加
        let measureToolButton = AddPushButton(this.toolbar, 'measure', Loc('Measure'), ['only_full_width', 'only_on_model'], (isSelected) => {
            HandleEvent('measure_tool_activated', isSelected ? 'on' : 'off'); // メジャーツールの状態をイベントで通知
            this.navigator.SetSelection(null); // ナビゲーターの選択をクリア
            this.measureTool.SetActive(isSelected); // メジャーツールを有効化
        });
        this.measureTool.SetButton(measureToolButton); // メジャーツールボタンを設定
        // セパレーターを追加
        AddSeparator(this.toolbar, ['only_full_width', 'only_on_model']);
        // ダウンロードボタンを追加
        AddButton(this.toolbar, 'download', Loc('Download'), ['only_full_width', 'only_on_model'], () => {
            HandleEvent('model_downloaded', ''); // モデルがダウンロードされたイベントを発生
            let importer = this.modelLoaderUI.GetImporter(); // モデルインポーターを取得
            DownloadModel(importer); // モデルをダウンロード
        });
        // エクスポートボタンを追加
        AddButton(this.toolbar, 'export', Loc('Export'), ['only_full_width', 'only_on_model'], () => {
            ShowExportDialog(this.model, this.viewer, {
                isMeshVisible: (meshInstanceId) => {
                    return this.navigator.IsMeshVisible(meshInstanceId); // メッシュが表示されているか確認
                }
            });
        });
        // 共有ボタンを追加
        AddButton(this.toolbar, 'share', Loc('Share'), ['only_full_width', 'only_on_model'], () => {
            ShowSharingDialog(importer.GetFileList(), this.settings, this.viewer); // 共有ダイアログを表示
        });
        // セパレーターを追加
        AddSeparator(this.toolbar, ['only_full_width', 'only_on_model']);
        // スナップショットボタンを追加
        AddButton(this.toolbar, 'snapshot', Loc('Create snapshot'), ['only_full_width', 'only_on_model'], () => {
            ShowSnapshotDialog(this.viewer); // スナップショットダイアログを表示
        });

        // プラグインを列挙し、ツールバーにボタンを追加
        EnumeratePlugins(PluginType.Toolbar, (plugin) => {
            plugin.registerButtons({
                createSeparator: (classNames) => {
                    AddSeparator(this.toolbar, classNames);
                },
                createButton: (icon, title, classNames, onClick) => {
                    AddButton(this.toolbar, icon, title, classNames, onClick);
                },
                getModel: () => {
                    return this.model;
                }
            });
        });

        // テーマ設定のラジオボタンを追加
        let selectedTheme = (this.settings.themeId === Theme.Light ? 1 : 0);
        AddRadioButton(this.toolbar, ['dark_mode', 'light_mode'], [Loc('Dark mode'), Loc('Light mode')], selectedTheme, ['align_right'], (buttonIndex) => {
            if (buttonIndex === 0) {
                this.settings.themeId = Theme.Dark;
            } else if (buttonIndex === 1) {
                this.settings.themeId = Theme.Light;
            }
            HandleEvent('theme_changed', this.settings.themeId === Theme.Light ? 'light' : 'dark'); // テーマ変更イベントを発生
            this.SwitchTheme(this.settings.themeId, true); // テーマを切り替え
        });

        // ファイル入力要素の変更イベントを設定
        this.parameters.fileInput.addEventListener('change', (ev) => {
            if (ev.target.files.length > 0) {
                HandleEvent('model_load_started', 'open_file'); // モデルロード開始イベントを発生
                this.LoadModelFromFileList(ev.target.files); // ファイルリストからモデルをロード
            }
        });
    }


    InitDragAndDrop() {
        // ドラッグアンドドロップの初期化
        window.addEventListener('dragstart', (ev) => {
            ev.preventDefault();
        }, false);

        window.addEventListener('dragover', (ev) => {
            // ドラッグオーバー時の処理
            ev.stopPropagation();
            ev.preventDefault();
            ev.dataTransfer.dropEffect = 'copy';
        }, false);

        window.addEventListener('drop', (ev) => {
            // ドロップ時の処理
            ev.stopPropagation();
            ev.preventDefault();
            // データ転送からファイルを取得し、モデルの読み込みを開始
            GetFilesFromDataTransfer(ev.dataTransfer, (files) => {
                if (files.length > 0) {
                    // モデルの読み込みが開始されたことを通知
                    HandleEvent('model_load_started', 'drop');
                    this.LoadModelFromFileList(files);
                }
            });
        }, false);
    }

    InitSidebar() {
        this.sidebar.Init({
            // サイドバーの初期化
            getShadingType: () => {
                return this.viewer.GetShadingType();
            },
            getProjectionMode: () => {
                return this.viewer.GetProjectionMode();
            },
            getDefaultMaterials: () => {
                // デフォルトの材質を取得
                return GetDefaultMaterials(this.model);
            },
            onEnvironmentMapChanged: () => {
                // 環境マップが変更された際の処理
                this.settings.SaveToCookies();
                this.UpdateEnvironmentMap();
                if (this.measureTool.IsActive()) {
                    this.measureTool.UpdatePanel();
                }
            },
            onBackgroundColorChanged: () => {
                // 背景色が変更された際の処理
                this.settings.SaveToCookies();
                this.viewer.SetBackgroundColor(this.settings.backgroundColor);
                if (this.measureTool.IsActive()) {
                    this.measureTool.UpdatePanel();
                }
            },
            onDefaultColorChanged: () => {
                // デフォルトの色が変更された際の処理
                this.settings.SaveToCookies();
                let modelLoader = this.modelLoaderUI.GetModelLoader();
                if (modelLoader.GetDefaultMaterials() !== null) {
                    ReplaceDefaultMaterialsColor(this.model, this.settings.defaultColor, this.settings.defaultLineColor);
                    modelLoader.ReplaceDefaultMaterialsColor(this.settings.defaultColor, this.settings.defaultLineColor);
                }
                this.viewer.Render();
            },
            onEdgeDisplayChanged: () => {
                // エッジ表示が変更された際の処理
                HandleEvent('edge_display_changed', this.settings.showEdges ? 'on' : 'off');
                this.UpdateEdgeDisplay();
            },
            onResizeRequested: () => {
                // リサイズが要求された際の処理
                this.layouter.Resize();
            },
            onShowHidePanels: (show) => {
                // パネルの表示/非表示が変更された際の処理
                ShowDomElement(this.parameters.sidebarSplitterDiv, show);
                CookieSetBoolVal('ov_show_sidebar', show);
            }
        });
    }

    InitNavigator() {
        // 特定のメッシュのユーザーデータ配列を取得する関数
        function GetMeshUserDataArray(viewer, meshInstanceId) {
            let userDataArr = [];
            viewer.EnumerateMeshesAndLinesUserData((meshUserData) => {
                if (meshUserData.originalMeshInstance.id.IsEqual(meshInstanceId)) {
                    userDataArr.push(meshUserData);
                }
            });
            return userDataArr;
        }

        // 特定のマテリアルを使用するメッシュを取得する関数
        function GetMeshesForMaterial(viewer, materialIndex) {
            let usedByMeshes = [];
            viewer.EnumerateMeshesAndLinesUserData((meshUserData) => {
                if (materialIndex === null || meshUserData.originalMaterials.indexOf(materialIndex) !== -1) {
                    usedByMeshes.push(meshUserData.originalMeshInstance);
                }
            });
            return usedByMeshes;
        }

        // マテリアルの参照情報を取得する関数
        function GetMaterialReferenceInfo(model, materialIndex) {
            const material = model.GetMaterial(materialIndex);
            return {
                index: materialIndex,
                name: material.name,
                color: material.color.Clone()
            };
        }

        // 特定のメッシュに関連するマテリアルを取得する関数
        function GetMaterialsForMesh(viewer, model, meshInstanceId) {
            // 使用されているマテリアルを格納する配列を初期化
            let usedMaterials = [];
            // もし meshInstanceId が null であれば、すべてのマテリアルを使用する
            if (meshInstanceId === null) {
                for (let materialIndex = 0; materialIndex < model.MaterialCount(); materialIndex++) {
                    // モデル内のすべてのマテリアルについて、参照情報を取得して配列に追加
                    usedMaterials.push(GetMaterialReferenceInfo(model, materialIndex));
                }
            } else {
                // 特定のメッシュインスタンスに関連するマテリアルを取得する
                let userDataArr = GetMeshUserDataArray(viewer, meshInstanceId);
                // 追加されたマテリアルのインデックスを格納するセットを初期化
                let addedMaterialIndices = new Set();
                // 各ユーザーデータごとに処理
                for (let userData of userDataArr) {
                    // ユーザーデータに含まれる各マテリアルについて処理
                    for (let materialIndex of userData.originalMaterials) {
                        // すでに追加されたマテリアルであればスキップ
                        if (addedMaterialIndices.has(materialIndex)) {
                            continue;
                        }
                        // 新しいマテリアルを配列に追加し、追加されたマテリアルのインデックスをセットに追加
                        usedMaterials.push(GetMaterialReferenceInfo(model, materialIndex));
                        addedMaterialIndices.add(materialIndex);
                    }
                }
            }
            // マテリアルをインデックスの昇順にソート
            usedMaterials.sort((a, b) => {
                return a.index - b.index;
            });
            // 使用されているマテリアルの配列を返す
            return usedMaterials;
        }

        // ナビゲーターの初期化
        this.navigator.Init({
            // ファイルブラウザダイアログを開く関数
            openFileBrowserDialog: () => {
                this.OpenFileBrowserDialog();
            },
            // メッシュをウィンドウにフィットさせる関数
            fitMeshToWindow: (meshInstanceId) => {
                this.FitMeshToWindow(meshInstanceId);
            },
            // メッシュ群をウィンドウにフィットさせる関数
            fitMeshesToWindow: (meshInstanceIdSet) => {
                this.FitMeshesToWindow(meshInstanceIdSet);
            },
            // 特定のマテリアルを使用するメッシュを取得する関数
            getMeshesForMaterial: (materialIndex) => {
                return GetMeshesForMaterial(this.viewer, materialIndex);
            },
            // 特定のメッシュに関連するマテリアルを取得する関数
            getMaterialsForMesh: (meshInstanceId) => {
                return GetMaterialsForMesh(this.viewer, this.model, meshInstanceId);
            },
            // メッシュの表示状態が変更された際の処理
            onMeshVisibilityChanged: () => {
                this.UpdateMeshesVisibility();
            },
            // メッシュの選択状態が変更された際の処理
            onMeshSelectionChanged: () => {
                this.UpdateMeshesSelection();
            },
            // 選択がクリアされた際の処理
            onSelectionCleared: () => {
                this.sidebar.AddObject3DProperties(this.model, this.model);
            },
            // 特定のメッシュが選択された際の処理
            onMeshSelected: (meshInstanceId) => {
                let meshInstance = this.model.GetMeshInstance(meshInstanceId);
                this.sidebar.AddObject3DProperties(this.model, meshInstance);
            },
            // 特定のマテリアルが選択された際の処理
            onMaterialSelected: (materialIndex) => {
                this.sidebar.AddMaterialProperties(this.model.GetMaterial(materialIndex));
            },
            // リサイズが要求された際の処理
            onResizeRequested: () => {
                this.layouter.Resize();
            },
            // パネルの表示/非表示が変更された際の処理
            onShowHidePanels: (show) => {
                ShowDomElement(this.parameters.navigatorSplitterDiv, show);
                CookieSetBoolVal('ov_show_navigator', show);
            }
        });
    }


    UpdatePanelsVisibility() {
        // Cookie からナビゲーターの表示状態を取得
        let showNavigator = CookieGetBoolVal('ov_show_navigator', true);
        // Cookie からサイドバーの表示状態を取得
        let showSidebar = CookieGetBoolVal('ov_show_sidebar', true);
        // ナビゲーターのパネルを表示または非表示にする
        this.navigator.ShowPanels(showNavigator);
        // サイドバーのパネルを表示または非表示にする
        this.sidebar.ShowPanels(showSidebar);
    }

    CreateHeaderButton(icon, title, link) {
        // ヘッダーボタンを作成する関数
        let buttonLink = CreateDomElement('a');
        // リンクの設定
        buttonLink.setAttribute('href', link);
        // 新しいウィンドウで開くように設定
        buttonLink.setAttribute('target', '_blank');
        // リンクのセキュリティ属性を設定
        buttonLink.setAttribute('rel', 'noopener noreferrer');
        // ツールチップを追加
        InstallTooltip(buttonLink, title);
        // SVG アイコンを追加
        AddSvgIconElement(buttonLink, icon, 'header_button');
        // ヘッダーボタンを DOM に追加
        this.parameters.headerButtonsDiv.appendChild(buttonLink);
        // 作成したボタンを返す
        return buttonLink;
    }

    InitCookieConsent() {
        // Cookie の同意状況を取得
        let accepted = CookieGetBoolVal('ov_cookie_consent', false);
        // 同意済みであれば何もしない
        if (accepted) {
            return;
        }

        // Cookie の同意を求めるポップアップを作成
        let text = Loc('This website uses cookies to offer you better user experience. See the details at the <a target="_blank" href="info/cookies.html">Cookies Policy</a> page.');
        let popupDiv = AddDiv(document.body, 'ov_bottom_floating_panel');
        AddDiv(popupDiv, 'ov_floating_panel_text', text);
        // Cookie 同意ボタンを作成
        let acceptButton = AddDiv(popupDiv, 'ov_button ov_floating_panel_button', Loc('Accept'));
        acceptButton.addEventListener('click', () => {
            // Cookie に同意状況を保存し、ポップアップを閉じる
            CookieSetBoolVal('ov_cookie_consent', true);
            popupDiv.remove();
        });
    }

}
