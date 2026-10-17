import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

/**
 * 운영자 어드민 공통 레이아웃입니다. 사이드바와 헤더를 두고
 * 하위 라우트 내용을 Outlet으로 렌더링합니다.
 */
export default function AdminLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header />

        <main className="flex-1 bg-gray-50 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
