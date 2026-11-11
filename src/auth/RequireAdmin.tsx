import { useEffect, useState, useSyncExternalStore } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { refreshSession } from "../api/auth";
import type { AdminSession } from "./session";
import { getSession, isAccessValid, subscribeSession } from "./session";

export default function RequireAdmin() {
  const location = useLocation();
  const session = useSyncExternalStore(
    subscribeSession,
    getSession,
    () => null,
  );

  const [refreshError, setRefreshError] = useState<{
    session: AdminSession;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!session) return;
    let active = true;
    let timer: number | undefined;
    let retryDelay = 1000;
    let refreshing = false;
    const refresh = () => {
      if (!active || getSession() !== session || refreshing) return;

      clearTimeout(timer);
      refreshing = true;
      void refreshSession()
        .catch((error: unknown) => {
          if (!active || getSession() !== session) return;

          setRefreshError({
            session,
            message:
              error instanceof Error
                ? error.message
                : "인증 서버에 연결할 수 없습니다.",
          });
          timer = window.setTimeout(refresh, retryDelay);
          retryDelay = Math.min(retryDelay * 2, 30000);
        })
        .finally(() => {
          refreshing = false;
        });
    };

    const delay = Math.max(
      0,
      Math.min(
        Date.parse(session.expiresAt),
        Date.parse(session.refreshExpiresAt),
      ) - Date.now(),
    );

    timer = window.setTimeout(refresh, Math.min(delay, 2147483647));
    const checkExpiry = () => {
      if (!isAccessValid(getSession())) refresh();
    };

    window.addEventListener("focus", checkExpiry);

    return () => {
      active = false;
      clearTimeout(timer);
      window.removeEventListener("focus", checkExpiry);
    };
  }, [session]);

  if (!session)
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search + location.hash }}
      />
    );
  if (!isAccessValid(session))
    return (
      <p role="status">
        {refreshError?.session === session
          ? `${refreshError.message} 잠시 후 자동으로 다시 시도합니다.`
          : "인증 정보를 확인하고 있습니다."}
      </p>
    );

  return <Outlet />;
}
