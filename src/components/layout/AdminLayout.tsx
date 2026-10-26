import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function AdminLayout() {
  return (
    <div className="admin-shell flex min-h-dvh bg-[#f4f5f6] text-[#202b36] lg:h-dvh lg:overflow-hidden">
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
