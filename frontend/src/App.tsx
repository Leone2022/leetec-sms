import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Pages (we'll create these next)
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import StudentsPage from './pages/StudentsPage';
import FeesPage from './pages/FeesPage';
import StudentPortalLoginPage from './pages/StudentPortalLoginPage';
import StudentDashboardPage from './pages/StudentDashboardPage';

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
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      } />
      <Route path="/approvals" element={
        <ProtectedRoute>
          <Navigate to="/dashboard" replace />
        </ProtectedRoute>
      } />
      <Route path="/students" element={
        <ProtectedRoute>
          <StudentsPage />
        </ProtectedRoute>
      } />
      <Route path="/fees" element={
        <ProtectedRoute>
          <FeesPage />
        </ProtectedRoute>
      } />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;