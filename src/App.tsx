import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import AdminLayout from "./components/layout/AdminLayout";
import AdminLogin from "./pages/Auth/AdminLogin";
import AdminSignup from "./pages/Auth/AdminSignup";
import { isAuthenticated } from "./lib/authToken";

/** 대시보드 더미 페이지입니다. */
function Dashboard() {
  return <h1>대시보드</h1>;
}

/** 현장점검 관리 더미 페이지입니다. */
function Inspection() {
  return <h1>현장점검 관리</h1>;
}

/** 지원 신청 관리 더미 페이지입니다. */
function Support() {
  return <h1>지원 신청 관리</h1>;
}

/** 시공 관리 더미 페이지입니다. */
function Construction() {
  return <h1>시공 관리</h1>;
}

/**
 * 로그인 상태가 아니면 로그인 페이지로 리다이렉트하는 라우트 가드입니다.
 * 운영자 전용 라우트를 보호하는 데 사용합니다.
 */
function RequireAuth() {
  return isAuthenticated() ? <Outlet /> : <Navigate to="/login" replace />;
}

/**
 * 이미 로그인한 운영자가 로그인/회원가입 페이지에 접근하면
 * 대시보드로 리다이렉트하는 라우트 가드입니다.
 */
function RedirectIfAuthed() {
  return isAuthenticated() ? <Navigate to="/" replace /> : <Outlet />;
}

/**
 * 어드민 웹의 최상위 라우팅을 정의하는 루트 컴포넌트입니다.
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RedirectIfAuthed />}>
          <Route path="/login" element={<AdminLogin />} />
          <Route path="/signup" element={<AdminSignup />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<AdminLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/inspection" element={<Inspection />} />
            <Route path="/support" element={<Support />} />
            <Route path="/construction" element={<Construction />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
