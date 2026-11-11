import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  getSession,
  getSessionGeneration,
  subscribeSession,
} from "../auth/session";
import { createPagePolling } from "./pagePolling";

type QueryState<T> = { key: string; data?: T; error: string };

export function usePagePolling<T>({
  queryKey,
  revision = 0,
  paused = false,
  load,
  errorMessage,
}: {
  queryKey: string;
  revision?: number;
  paused?: boolean;
  load: (signal: AbortSignal) => Promise<T>;
  errorMessage: (error: unknown) => string;
}) {
  const lastRevision = useRef(revision);
  const [state, setState] = useState<QueryState<T>>();
  const request = useEffectEvent(async (signal: AbortSignal) => {
    const generation = getSessionGeneration();
    const current = () =>
      !signal.aborted &&
      generation === getSessionGeneration() &&
      !!getSession();

    try {
      const data = await load(signal);

      if (current())
        setState((previous) => {
          if (
            previous?.key === queryKey &&
            JSON.stringify(previous.data) === JSON.stringify(data)
          )
            return previous.error ? { ...previous, error: "" } : previous;

          return { key: queryKey, data, error: "" };
        });
    } catch (error) {
      if (current())
        setState((previous) => ({
          key: queryKey,
          data: previous?.key === queryKey ? previous.data : undefined,
          error:
            previous?.key === queryKey && previous.data !== undefined
              ? `데이터 갱신에 실패했습니다. 기존 데이터를 표시하며 잠시 후 다시 시도합니다. ${errorMessage(error)}`
              : errorMessage(error),
        }));
      throw error;
    }
  });

  useEffect(() => {
    // A confirmed mutation/manual retry may refresh once even with a dialog open.
    // Pausing still blocks all scheduled polling requests.
    let manualRefresh = revision !== lastRevision.current;

    lastRevision.current = revision;
    const allowed = () => {
      const session = getSession();

      return (
        (!paused || manualRefresh) &&
        document.visibilityState !== "hidden" &&
        !!session &&
        Date.parse(session.refreshExpiresAt) > Date.now()
      );
    };

    const polling = createPagePolling({
      request: async (signal) => {
        try {
          await request(signal);
        } finally {
          manualRefresh = false;
        }
      },
      allowed,
    });
    const update = () => {
      if (allowed()) polling.refresh();
      else polling.suspend();
    };

    const unsubscribe = subscribeSession(() => {
      // Token rotation is not a reason to start another business request.
      if (!allowed()) polling.suspend();
    });

    // Defer the first request so StrictMode's setup/cleanup probe cannot send it twice.
    const initial = setTimeout(update, 0);

    document.addEventListener("visibilitychange", update);

    return () => {
      clearTimeout(initial);
      document.removeEventListener("visibilitychange", update);
      unsubscribe();
      polling.dispose();
    };
  }, [queryKey, revision, paused]);

  const matching = state?.key === queryKey ? state : undefined;

  return {
    data: matching?.data,
    error: matching?.error || "",
    loading: !matching,
  };
}
