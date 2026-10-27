import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import InspectionManagement from "./pages/Inspection/InspectionManagement";
import PriorityManagement from "./pages/Priority/PriorityManagement";
import GisApplications from "./pages/GIS/GisApplications";
import AdminLayout from "./components/layout/AdminLayout";
import AdminLogin from "./pages/Auth/AdminLogin";

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
        <Route path="/signup" element={<Navigate to="/login" replace />} />

        <Route element={<AdminLayout />}>
          <Route path="/" element={<Navigate to="/gis" replace />} />
          <Route path="/gis" element={<GisApplications />} />
          <Route path="/gis/:requestId" element={<GisApplications />} />

          <Route path="/priority" element={<PriorityManagement />} />
          <Route path="/priority/:requestId" element={<PriorityManagement />} />

          <Route
            path="/infrastructure"
            element={
              <p className="text-sm text-[#596672]">
                공공 인프라 화면은 아직 연결하지 않았습니다.
              </p>
            }
          />

          <Route path="/inspection" element={<InspectionManagement />} />
          <Route path="/inspection/:requestId" element={<InspectionManagement />} />
          <Route path="/support" element={<Support />} />
          <Route path="/construction" element={<Construction />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
