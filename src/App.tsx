import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import InspectionResults from "./pages/InspectionResults/InspectionResults";
import InspectionManagement from "./pages/Inspection/InspectionManagement";
import PriorityManagement from "./pages/Priority/PriorityManagement";
import GisApplications from "./pages/GIS/GisApplications";
import AdminLayout from "./components/layout/AdminLayout";
import AdminLogin from "./pages/Auth/AdminLogin";
import SupportManagement from "./pages/Support/SupportManagement";
import SupportReview from "./pages/Support/SupportReview";
import ConstructionManagement from "./pages/Construction/ConstructionManagement";
import InfrastructureManagement from "./pages/Infrastructure/InfrastructureManagement";
import InfrastructureReview from "./pages/Infrastructure/InfrastructureReview";


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

          <Route path="/infrastructure" element={<InfrastructureManagement />} />
          <Route path="/infrastructure/:issueId/review" element={<InfrastructureReview />} />

          <Route path="/inspection" element={<InspectionManagement />} />
          <Route
            path="/inspection/:requestId"
            element={<InspectionManagement />}
          />
          <Route
            path="/inspection/:requestId/results"
            element={<InspectionResults />}
          />
          <Route path="/support" element={<SupportManagement />} />
          <Route path="/support/:requestId" element={<SupportManagement />} />
          <Route path="/support/:requestId/review" element={<SupportReview />} />
          <Route path="/construction" element={<ConstructionManagement />} />
          <Route path="/construction/:requestId" element={<ConstructionManagement />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
