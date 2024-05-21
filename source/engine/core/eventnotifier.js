// イベント通知クラスを定義
export class EventNotifier {
    // コンストラクタ
    constructor() {
        this.eventListeners = new Map(); // イベントリスナーを格納するMapを初期化
    }

    // イベントリスナーを追加するメソッド
    AddEventListener(eventId, listener) {
        if (!this.eventListeners.has(eventId)) { // 指定されたイベントIDにリスナーが登録されていない場合
            this.eventListeners.set(eventId, []); // 新しいリスナーリストを作成
        }
        let listeners = this.eventListeners.get(eventId); // イベントIDに対応するリスナーリストを取得
        listeners.push(listener); // リスナーをリストに追加
    }

    // 指定されたイベントIDにリスナーが登録されているか確認するメソッド
    HasEventListener(eventId) {
        return this.eventListeners.has(eventId); // イベントIDにリスナーが登録されている場合はtrueを返す
    }

    // 指定されたイベントIDの通知関数を取得するメソッド
    GetEventNotifier(eventId) {
        return () => { // 無名関数を返す
            this.NotifyEventListeners(eventId); // イベントリスナーに通知を行う
        };
    }

    // イベントリスナーに通知を行うメソッド
    NotifyEventListeners(eventId, ...args) {
        if (!this.eventListeners.has(eventId)) { // 指定されたイベントIDにリスナーが登録されていない場合
            return; // 何もしない
        }
        let listeners = this.eventListeners.get(eventId); // イベントIDに対応するリスナーリストを取得
        for (let listener of listeners) { // 各リスナーに対して
            listener(...args); // 引数を渡してリスナー関数を呼び出す
        }
    }
}
