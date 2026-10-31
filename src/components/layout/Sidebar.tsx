import { NavLink } from "react-router-dom";

import logo from "../../assets/login/FLOUT_logo.png";
import map from "../../assets/layout/nav-map.png";
import search from "../../assets/layout/nav-search.png";
import clipboard from "../../assets/layout/nav-clipboard.png";
import heart from "../../assets/layout/nav-heart.png";
import toolbox from "../../assets/layout/nav-toolbox.png";
import building from "../../assets/layout/nav-building.png";

const menus = [
  { name: "GIS 신청 관리", path: "/gis", icon: map },
  { name: "우선점검 관리", path: "/priority", icon: search },
  { name: "현장점검 관리", path: "/inspection", icon: clipboard },
  { name: "지원 관리", path: "/support", icon: heart },
  { name: "시공 관리", path: "/construction", icon: toolbox },
  { name: "공공 인프라", path: "/infrastructure", icon: building },
];

export default function Sidebar() {
  return (
    <aside className="flex w-[210px] shrink-0 flex-col overflow-y-auto bg-[#234f73] text-white max-md:w-[76px]">
      <NavLink
        to="/gis"
        aria-label="FLOUT 운영자 홈"
        className="flex min-h-[72px] shrink-0 items-center gap-[10px] px-4 py-[14px] max-md:px-[10px]"
      >
        <img
          src={logo}
          alt=""
          width={56}
          height={44}
          className="h-11 w-14 shrink-0 rounded object-cover"
        />

        <span className="flex flex-col gap-[3px] max-md:hidden">
          <strong className="text-[22px] leading-[26px]">FLOUT</strong>
          <span className="text-sm leading-[19px]">운영자</span>
        </span>
      </NavLink>

      <nav aria-label="운영자 메뉴" className="px-[10px] pt-4">
        <p className="flex h-[42px] items-center px-3 text-[11px] font-bold max-md:hidden">
          신청 관리
        </p>

        <div className="space-y-[3px]">
          {menus.map((menu) => (
            <NavLink
              key={menu.path}
              to={menu.path}
              title={menu.name}
              className={({ isActive }) =>
                `flex min-h-[42px] items-center gap-[10px] rounded-[7px] px-3 text-[15px] leading-[21px] max-md:justify-center ${
                  isActive
                    ? "bg-[#eef3f7] font-bold text-[#234f73]"
                    : "font-medium text-white hover:bg-[#183b58]"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <img
                    src={menu.icon}
                    alt=""
                    width={17}
                    height={17}
                    className={`shrink-0 ${
                      menu.path === "/gis" && !isActive
                        ? "brightness-0 invert"
                        : ""
                    }`}
                  />
                  <span className="max-md:hidden">{menu.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="mx-4 mt-14 px-3 py-3 text-sm leading-5 max-md:hidden">
        <p className="mb-1 font-bold">업무 흐름</p>
        <p>접수 &gt; 점검 &gt; 지원 &gt; 시공</p>
        <p className="mt-1">공공 문제는 별도 검토</p>
      </div>
    </aside>
  );
}
