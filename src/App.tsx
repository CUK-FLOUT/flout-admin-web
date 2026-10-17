import { BrowserRouter, Routes, Route } from "react-router-dom";
import AdminLayout from "./components/layout/AdminLayout";
import AdminLogin from "./pages/Auth/AdminLogin";
import AdminSignup from "./pages/Auth/AdminSignup";

function Dashboard() {
  return <h1>대시보드</h1>;
}

function Inspection() {
  return <h1>현장점검 관리</h1>;
}

function Support() {
  return <h1>지원 신청 관리</h1>;
}

function Construction() {
  return <h1>시공 관리</h1>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AdminLogin />} />
        <Route path="/signup" element={<AdminSignup />} />

        <Route element={<AdminLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inspection" element={<Inspection />} />
          <Route path="/support" element={<Support />} />
          <Route path="/construction" element={<Construction />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
