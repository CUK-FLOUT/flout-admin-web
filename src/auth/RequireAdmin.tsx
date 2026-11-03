import { useEffect, useState, useSyncExternalStore } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { refreshSession } from "../api/auth";
import type { AdminSession } from "./session";
import { getSession, isAccessValid, subscribeSession } from "./session";

export default function RequireAdmin() {
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
    const refresh = () => {
      void refreshSession().catch((error: unknown) => {
        if (active)
          setRefreshError({
            session,
            message:
              error instanceof Error
                ? error.message
                : "인증 서버에 연결할 수 없습니다.",
          });
      });
    };

    const delay = Math.max(
      0,
      Math.min(
        Date.parse(session.expiresAt),
        Date.parse(session.refreshExpiresAt),
      ) - Date.now(),
    );
    const timer = window.setTimeout(refresh, Math.min(delay, 2147483647));
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

  if (!session) return <Navigate to="/login" replace />;
  if (!isAccessValid(session))
    return (
      <p role="status">
        {refreshError?.session === session
          ? `${refreshError.message} 창을 다시 활성화하면 재시도합니다.`
          : "인증 정보를 확인하고 있습니다."}
      </p>
    );

  return <Outlet />;
}
