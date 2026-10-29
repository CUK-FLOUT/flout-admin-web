import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function AdminLayout() {
  const { pathname } = useLocation();
  const isSupport = pathname === "/support" || pathname.startsWith("/support/");
  const [viewport, setViewport] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  useEffect(() => {
    const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  // Scale the 1440 × 900 support design as a whole; keep other routes unchanged.
  const supportScale = Math.max(1, Math.min(viewport.width / 1440, viewport.height / 900));
  const supportStyle = isSupport ? {
    "--support-scale": supportScale,
    "--support-viewport-height": String(viewport.height / supportScale) + "px",
  } as CSSProperties : undefined;
  return (
    <div style={supportStyle} className={"admin-shell flex bg-[#f4f5f6] text-[#202b36] lg:overflow-hidden " + (isSupport
      ? "min-h-[var(--support-viewport-height)] [zoom:var(--support-scale)] lg:h-[var(--support-viewport-height)]"
      : "min-h-dvh lg:h-dvh")}>
      <Sidebar />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Header />

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto px-4 pb-[14px] pt-[22px] lg:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
