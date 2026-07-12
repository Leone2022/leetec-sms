import { Routes, Route, Navigate } from 'react-router-dom';

import LoginPage from './pages/LoginPage.tsx';
import DashboardPage from './pages/DashboardPage.tsx';
import StudentsPage from './pages/StudentsPage.tsx';
import FeesPage from './pages/FeesPage.tsx';
import TermsPage from './pages/TermsPage.tsx';
import FeeSetupPage from './pages/FeeSetupPage.tsx';
// import BursariesPage from './pages/BursariesPage.tsx';
import SuperAdminPage from './pages/SuperAdminPage.tsx';
import SubjectsPage from './pages/SubjectsPage.tsx';
import MarksEntryPage from './pages/MarksEntryPage.tsx';
import BulkReportsPage from './pages/BulkReportsPage.tsx';
import AnnouncementsPage from './pages/AnnouncementsPage.tsx';
import TeacherAssignmentsPage from './pages/TeacherAssignmentsPage.tsx';
import SubjectRequestsPage from './pages/SubjectRequestsPage.tsx';
import StudentPortalLoginPage from './pages/StudentPortalLoginPage.tsx';
import TeacherLoginPage from './pages/TeacherLoginPage.tsx';
import TeacherDashboardPage from './pages/TeacherDashboardPage.tsx';
import StudentDashboardPage from './pages/StudentDashboardPage.tsx';
import ActivatePage from './pages/ActivatePage.tsx';
import PortalAccountsPage from './pages/PortalAccountsPage.tsx';
import ResetPasswordPage from './pages/ResetPasswordPage.tsx';

// Roles that should not reach the admin console (they have their own portals)
const NON_ADMIN_ROLES = ['Student', 'ClassTeacher', 'SubjectTeacher', 'Teacher'];

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('leetec_token');
  const user = JSON.parse(localStorage.getItem('leetec_user') || 'null');
  if (!token || !user) return <Navigate to="/login" />;
  if (NON_ADMIN_ROLES.includes(user.role)) return <Navigate to="/login" />;
  return <>{children}</>;
};

const TeacherRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('teacher_token');
  const teacher = JSON.parse(localStorage.getItem('teacher_info') || 'null');
  if (!token || !teacher) return <Navigate to="/teacher-login" />;
  return <>{children}</>;
};

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/student-login" element={<StudentPortalLoginPage />} />
      <Route path="/student-dashboard" element={<StudentDashboardPage />} />

      {/* Protected Admin Routes */}
      <Route path="/dashboard" element={<AdminRoute><DashboardPage /></AdminRoute>} />
      <Route path="/students" element={<AdminRoute><StudentsPage /></AdminRoute>} />
      <Route path="/subject-requests" element={<AdminRoute><SubjectRequestsPage /></AdminRoute>} />
      <Route path="/fees" element={<AdminRoute><FeesPage /></AdminRoute>} />
      <Route path="/terms" element={<AdminRoute><TermsPage /></AdminRoute>} />
      <Route path="/fee-setup" element={<AdminRoute><FeeSetupPage /></AdminRoute>} />
      {/* <Route path="/bursaries" element={<AdminRoute><BursariesPage /></AdminRoute>} /> */}
      <Route path="/super-admin" element={<AdminRoute><SuperAdminPage /></AdminRoute>} />
      <Route path="/subjects" element={<AdminRoute><SubjectsPage /></AdminRoute>} />
      <Route path="/marks-entry" element={<AdminRoute><MarksEntryPage /></AdminRoute>} />
      <Route path="/bulk-reports" element={<AdminRoute><BulkReportsPage /></AdminRoute>} />
      <Route path="/announcements" element={<AdminRoute><AnnouncementsPage /></AdminRoute>} />
      <Route path="/teacher-assignments" element={<AdminRoute><TeacherAssignmentsPage /></AdminRoute>} />

      {/* Student Activation */}
      <Route path="/activate" element={<ActivatePage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Portal Accounts */}
      <Route path="/portal-accounts" element={<AdminRoute><PortalAccountsPage /></AdminRoute>} />

      {/* Teacher Portal */}
      <Route path="/teacher-login" element={<TeacherLoginPage />} />
      <Route path="/teacher-dashboard" element={<TeacherRoute><TeacherDashboardPage /></TeacherRoute>} />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
