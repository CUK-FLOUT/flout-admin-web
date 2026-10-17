import { NavLink } from "react-router-dom";

const menus = [
  { name: "대시보드", path: "/" },
  { name: "현장점검 관리", path: "/inspection" },
  { name: "지원 신청 관리", path: "/support" },
  { name: "시공 관리", path: "/construction" },
];

/**
 * 운영자 어드민 좌측 내비게이션 사이드바입니다.
 */
export default function Sidebar() {
  return (
    <aside className="w-60 shrink-0 bg-slate-900 p-6 text-white">
      <h1 className="mb-10 text-2xl font-bold">FLOUT</h1>

      <nav className="flex flex-col gap-3">
        {menus.map((menu) => (
          <NavLink
            key={menu.path}
            to={menu.path}
            end={menu.path === "/"}
            className={({ isActive }) =>
              `rounded-lg p-3 ${
                isActive ? "bg-blue-600" : "hover:bg-slate-700"
              }`
            }
          >
            {menu.name}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
