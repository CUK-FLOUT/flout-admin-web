import { useNavigate } from "react-router-dom";
import { clearAccessToken } from "../../lib/authToken";

/**
 * 어드민 레이아웃 상단 헤더입니다. 로그아웃 버튼을 포함합니다.
 */
export default function Header() {
  const navigate = useNavigate();

  /**
   * 저장된 액세스 토큰을 삭제하고 로그인 페이지로 이동합니다.
   */
  function handleLogout() {
    clearAccessToken();
    navigate("/login", { replace: true });
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-8">
      <h2 className="text-lg font-semibold">FLOUT 운영자 시스템</h2>

      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">관리자</span>
        <button
          type="button"
          onClick={handleLogout}
          className="cursor-pointer rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          로그아웃
        </button>
      </div>
    </header>
  );
}
