export interface PollingOptions {
  request: (signal: AbortSignal) => Promise<void>;
  allowed: () => boolean;
  interval?: number;
}

// 취소된 요청도 정리될 때까지 기다려야 조회를 재개할 때 요청이 겹치지 않는다.
export function createPagePolling({
  request,
  allowed,
  interval = 30000,
}: PollingOptions) {
  let disposed = false;
  let controller: AbortController | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending = false;
  let failures = 0;

  function clearTimer() {
    clearTimeout(timer);
    timer = undefined;
  }

  async function run() {
    if (disposed || !allowed()) return;
    clearTimer();
    if (controller) {
      pending = controller.signal.aborted;

      return;
    }

    const current = new AbortController();

    controller = current;
    pending = false;
    try {
      await request(current.signal);
      if (!current.signal.aborted) failures = 0;
    } catch {
      if (!current.signal.aborted) failures += 1;
    } finally {
      controller = undefined;
      if (!disposed && allowed()) {
        if (pending) {
          pending = false;
          void run();
        } else {
          timer = setTimeout(
            () => void run(),
            Math.min(interval * 2 ** Math.min(failures, 2), 120000),
          );
        }
      }
    }
  }

  function suspend() {
    clearTimer();
    pending = false;
    controller?.abort();
  }

  return {
    refresh: () => void run(),
    suspend,
    dispose() {
      disposed = true;
      suspend();
    },
  };
}
