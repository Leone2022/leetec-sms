import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import LoginPage from './pages/LoginPage.tsx';
import DashboardPage from './pages/DashboardPage.tsx';
import StudentsPage from './pages/StudentsPage.tsx';
import FeesPage from './pages/FeesPage.tsx';
import TermsPage from './pages/TermsPage.tsx';
import FeeSetupPage from './pages/FeeSetupPage.tsx';
import ApprovalsPage from './pages/ApprovalsPage.tsx';
import SuperAdminPage from './pages/SuperAdminPage.tsx';
import StudentPortalLoginPage from './pages/StudentPortalLoginPage.tsx';
import StudentDashboardPage from './pages/StudentDashboardPage.tsx';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/student-login" element={<StudentPortalLoginPage />} />
      <Route path="/student-dashboard" element={<StudentDashboardPage />} />

      {/* Protected Admin Routes */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/students" element={<ProtectedRoute><StudentsPage /></ProtectedRoute>} />
      <Route path="/fees" element={<ProtectedRoute><FeesPage /></ProtectedRoute>} />
      <Route path="/terms" element={<ProtectedRoute><TermsPage /></ProtectedRoute>} />
      <Route path="/fee-setup" element={<ProtectedRoute><FeeSetupPage /></ProtectedRoute>} />
      <Route path="/approvals" element={<ProtectedRoute><ApprovalsPage /></ProtectedRoute>} />
      <Route path="/super-admin" element={<ProtectedRoute><SuperAdminPage /></ProtectedRoute>} />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
