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
import SubjectsPage from './pages/SubjectsPage.tsx';
import MarksEntryPage from './pages/MarksEntryPage.tsx';
import BulkReportsPage from './pages/BulkReportsPage.tsx';
import AnnouncementsPage from './pages/AnnouncementsPage.tsx';
import TeacherAssignmentsPage from './pages/TeacherAssignmentsPage.tsx';
import StudentPortalLoginPage from './pages/StudentPortalLoginPage.tsx';
import TeacherLoginPage from './pages/TeacherLoginPage.tsx';
import TeacherDashboardPage from './pages/TeacherDashboardPage.tsx';
import StudentDashboardPage from './pages/StudentDashboardPage.tsx';
import ActivatePage from './pages/ActivatePage.tsx';
import PortalAccountsPage from './pages/PortalAccountsPage.tsx';

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
      <Route path="/subjects" element={<ProtectedRoute><SubjectsPage /></ProtectedRoute>} />
      <Route path="/marks-entry" element={<ProtectedRoute><MarksEntryPage /></ProtectedRoute>} />
      <Route path="/bulk-reports" element={<ProtectedRoute><BulkReportsPage /></ProtectedRoute>} />
      <Route path="/announcements" element={<ProtectedRoute><AnnouncementsPage /></ProtectedRoute>} />
      <Route path="/teacher-assignments" element={<ProtectedRoute><TeacherAssignmentsPage /></ProtectedRoute>} />

      {/* Student Activation */}
      <Route path="/activate" element={<ActivatePage />} />

      {/* Portal Accounts */}
      <Route path="/portal-accounts" element={<ProtectedRoute><PortalAccountsPage /></ProtectedRoute>} />

      {/* Teacher Portal */}
      <Route path="/teacher-login" element={<TeacherLoginPage />} />
      <Route path="/teacher-dashboard" element={<TeacherDashboardPage />} />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
