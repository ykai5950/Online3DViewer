// タスクランナークラスの定義
export class TaskRunner {
    constructor() {
        // タスクの数
        this.count = null;
        // 現在のタスクのインデックス
        this.current = null;
        // コールバック関数群
        this.callbacks = null;
    }

    // タスクを実行するメソッド
    Run(count, callbacks) {
        // タスクの数、現在のタスクのインデックス、コールバック関数を設定
        this.count = count;
        this.current = 0;
        this.callbacks = callbacks;
        // タスクの数が0の場合は、即座にタスクを完了として扱う
        if (count === 0) {
            this.TaskReady();
        } else {
            // タスクの実行を開始
            this.RunOnce();
        }
    }

    // タスクをバッチ処理して実行するメソッド
    RunBatch(count, batchCount, callbacks) {
        // バッチ処理のステップ数を計算
        let stepCount = 0;
        if (count > 0) {
            stepCount = parseInt((count - 1) / batchCount, 10) + 1;
        }
        // タスクを実行
        this.Run(stepCount, {
            // 各バッチごとにタスクを実行するメソッドを呼び出す
            runTask: (index, ready) => {
                const firstIndex = index * batchCount;
                const lastIndex = Math.min((index + 1) * batchCount, count) - 1;
                callbacks.runTask(firstIndex, lastIndex, ready);
            },
            // 全てのタスクが完了した際に実行されるコールバック関数
            onReady: callbacks.onReady
        });
    }

    // 一度だけタスクを実行するメソッド
    RunOnce() {
        // 非同期処理を用いてタスクを実行
        setTimeout(() => {
            this.callbacks.runTask(this.current, this.TaskReady.bind(this));
        }, 0);
    }

    // タスクが完了したことを通知するメソッド
    TaskReady() {
        // 現在のタスクのインデックスを更新
        this.current += 1;
        // まだ残っているタスクがあれば、次のタスクを実行する
        if (this.current < this.count) {
            this.RunOnce();
        } else {
            // 全てのタスクが完了した場合は、完了を通知するコールバック関数を実行
            if (this.callbacks.onReady) {
                this.callbacks.onReady();
            }
        }
    }
}

// 非同期にタスクを実行する関数
export function RunTaskAsync(task) {
    // 一定時間後にタスクを実行
    setTimeout(() => {
        task();
    }, 10);
}

// タスクランナーを使用してタスクを実行する関数
export function RunTasks(count, callbacks) {
    // タスクランナーのインスタンスを生成してタスクを実行
    let taskRunner = new TaskRunner();
    taskRunner.Run(count, callbacks);
}

// タスクランナーを使用してバッチ処理でタスクを実行する関数
export function RunTasksBatch(count, batchCount, callbacks) {
    // タスクランナーのインスタンスを生成してバッチ処理でタスクを実行
    let taskRunner = new TaskRunner();
    taskRunner.RunBatch(count, batchCount, callbacks);
}

// 条件が満たされるまで待機する関数
export function WaitWhile(expression) {
    // 再帰的に条件をポーリングし、条件が満たされるまで待機
    function Waiter(expression) {
        if (expression()) {
            setTimeout(() => {
                Waiter(expression);
            }, 10);
        }
    }
    Waiter(expression);
}
