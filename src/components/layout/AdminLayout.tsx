import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function AdminLayout() {
  return (
    <div className="admin-shell flex min-h-dvh w-full bg-[#f4f5f6] text-[#202b36] lg:fixed lg:inset-0 lg:h-dvh lg:overflow-hidden">
      <Sidebar />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Header />

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto px-4 pt-[22px] pb-[14px] [scrollbar-gutter:stable] [&:has(>[data-layout=inspection])]:[scrollbar-gutter:auto] [&:has(>[data-layout=construction])]:[scrollbar-gutter:auto] lg:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
