import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5208') + '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('leetec_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('leetec_token');
      localStorage.removeItem('leetec_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (data: any) => api.post('/auth/register', data),
};

export const studentsAPI = {
  getAll: (schoolId: number) => api.get(`/students/school/${schoolId}`),
  getById: (id: number) => api.get(`/students/${id}`),
  enrol: (data: any) => api.post('/students/enrol', data),
  search: (schoolId: number, query: string) =>
    api.get(`/students/search?schoolId=${schoolId}&query=${query}`),
  updateStatus: (id: number, status: string) =>
    api.put(`/students/${id}/status?status=${status}`),
  addFamily: (id: number, data: any) =>
    api.post(`/students/${id}/family`, data),
  addGuardian: (id: number, data: any) =>
    api.post(`/students/${id}/guardian`, data),
  addEmergencyContact: (id: number, data: any) =>
    api.post(`/students/${id}/emergency-contact`, data),
  addInvoicing: (id: number, data: any) =>
    api.post(`/students/${id}/invoicing`, data),
  deleteStudent: (id: number) => api.delete(`/students/${id}`),
};

export const feesAPI = {
  getTerms: (schoolId: number) => api.get(`/fees/terms/school/${schoolId}`),
  createTerm: (data: any) => api.post('/fees/terms', data),
  activateTerm: (id: number) => api.put(`/fees/terms/${id}/activate`),
  getCategories: (schoolId: number) => api.get(`/fees/categories/school/${schoolId}`),
  createCategory: (data: any) => api.post('/fees/categories', data),
  deleteCategory: (id: number) => api.delete(`/fees/categories/${id}`),
  getPackages: (termId: number) => api.get(`/fees/packages/term/${termId}`),
  createPackage: (data: any) => api.post('/fees/packages', data),
  updatePackage: (id: number, data: any) => api.put(`/fees/packages/${id}`, data),
  getStudentBalances: (termId: number, schoolId?: number) =>
    api.get(`/fees/student-balances/${termId}?schoolId=${schoolId || 1}`),
  chargeIndividual: (data: any) => api.post('/fees/charge-individual', data),
  generateInvoices: (data: any) => api.post('/fees/invoices/generate', data),
  sendBulkInvoiceEmails: (data: any) => api.post('/fees/invoices/send-bulk-email', data),
  sendSingleInvoiceEmail: (data: any) => api.post('/fees/invoices/send-single-email', data),
  getTermInvoices: (schoolId: number, termId: number) =>
    api.get(`/fees/invoices/school/${schoolId}/term/${termId}`),
  getStudentInvoices: (studentId: number) =>
    api.get(`/fees/invoices/student/${studentId}`),
  postPayment: (data: any) => api.post('/fees/payments', data),
  deleteInvoiceItem: (id: number) => api.delete(`/fees/invoice-items/${id}`),
  deleteInvoice: (id: number) => api.delete(`/fees/invoices/${id}`),
  refundInvoice: (data: any) => api.post('/fees/refunds', data),
};

export const portalAPI = {
  register: (data: any) => api.post('/student-portal/register', data),
  login: (email: string, password: string) =>
    api.post('/student-portal/login', { email, password }),
  getPendingAccounts: () => api.get('/student-portal/pending-accounts'),
  approveAccount: (id: number) => api.put(`/student-portal/approve/${id}`),
  suspendAccount: (id: number) => api.put(`/student-portal/suspend/${id}`),
  forgotPassword: (email: string) =>
    api.post('/student-portal/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) =>
    api.post('/student-portal/reset-password', { token, newPassword }),
  getDashboard: (studentId: number) =>
    api.get(`/student-portal/dashboard/${studentId}`),
  getReportCard: (studentId: number, termId: number) =>
    api.get(`/student-portal/report-card?studentId=${studentId}&termId=${termId}`),
};

export const termRegistrationsAPI = {
  getDashboard: (termId: number, schoolId?: number) =>
    api.get(`/termregistrations/dashboard/${termId}?schoolId=${schoolId || 1}`),
  getUnregistered: (termId: number, schoolId?: number) =>
    api.get(`/termregistrations/unregistered/${termId}?schoolId=${schoolId || 1}`),
  register: (data: any) =>
    api.post('/termregistrations/register', data),
  promoteSingle: (data: any) =>
    api.post('/termregistrations/promote-single', data),
  promoteBulk: (data: any) =>
    api.post('/termregistrations/promote-bulk', data),
  updatePaymentStatus: (id: number, status: string) =>
    api.put(`/termregistrations/${id}/payment-status?status=${status}`),
  remove: (id: number) =>
    api.delete(`/termregistrations/${id}`),
};

export const subjectsAPI = {
  getAll: (schoolId: number, campus?: string, curriculumType?: string) => {
    const params = new URLSearchParams();
    if (campus) params.append('campus', campus);
    if (curriculumType && curriculumType !== 'All') params.append('curriculumType', curriculumType);
    const qs = params.toString();
    return api.get(`/subjects/school/${schoolId}${qs ? `?${qs}` : ''}`);
  },
  seed: (data: { schoolId: number; campus: string; curriculumType: string }) =>
    api.post('/subjects/seed', data),
  create: (data: any) => api.post('/subjects', data),
  update: (id: number, data: any) => api.put(`/subjects/${id}`, data),
  delete: (id: number) => api.delete(`/subjects/${id}`),
};

export const marksAPI = {
  getEntrySheet: (params: { termId: number; campus: string; form: string; subjectId: number; assessmentType: string; schoolId?: number; teacherId?: number }) => {
    const qs = new URLSearchParams({
      termId: String(params.termId),
      campus: params.campus,
      form: params.form,
      subjectId: String(params.subjectId),
      assessmentType: params.assessmentType,
      schoolId: String(params.schoolId || 1),
    });
    if (params.teacherId) qs.append('teacherId', String(params.teacherId));
    return api.get(`/marks/entry-sheet?${qs.toString()}`);
  },
  bulkSave: (data: any) => api.post('/marks/bulk-save', data),
  getStudentMarks: (studentId: number, termId: number) =>
    api.get(`/marks/student/${studentId}?termId=${termId}`),
};

export const reportsAPI = {
  getAHJReportCard: (studentId: number, termId: number) =>
    api.get(`/reports/ahj-report-card/${studentId}?termId=${termId}`),
  getReportCard: (studentId: number, termId: number) =>
    api.get(`/reports/report-card/${studentId}?termId=${termId}`),
  getStudentView: (studentId: number, termId: number) =>
    api.get(`/reports/student-view/${studentId}?termId=${termId}`),
};

export const announcementsAPI = {
  getAll: (schoolId = 1, campus?: string, includeInactive = false) => {
    const params = new URLSearchParams({ schoolId: String(schoolId) });
    if (campus) params.append('campus', campus);
    if (includeInactive) params.append('includeInactive', 'true');
    return api.get(`/announcements?${params.toString()}`);
  },
  create: (data: { schoolId: number; title: string; content: string; targetCampus: string }) =>
    api.post('/announcements', data),
  delete: (id: number) => api.delete(`/announcements/${id}`),
};

export const bulkReportsAPI = {
  getCompletionStatus: (termId: number, schoolId = 1) =>
    api.get(`/reports/completion-status?termId=${termId}&schoolId=${schoolId}`),
  publishReports: (schoolId: number, termId: number, studentIds: number[]) =>
    api.post('/reports/publish', { schoolId, termId, studentIds }),
};

export const superadminAPI = {
  getStats: () => api.get('/superadmin/stats'),
  getSchools: () => api.get('/superadmin/schools'),
  createSchool: (data: any) => api.post('/superadmin/schools', data),
  toggleSchoolActive: (id: number) => api.put(`/superadmin/schools/${id}/toggle-active`),
  getUsers: () => api.get('/superadmin/users'),
};

export const usersAPI = {
  getAll: (schoolId = 1, role?: string) => {
    const params = new URLSearchParams({ schoolId: String(schoolId) });
    if (role) params.append('role', role);
    return api.get(`/users?${params.toString()}`);
  },
};

export const adminAPI = {
  createTeacher: (data: {
    firstName: string;
    surname: string;
    email: string;
    password: string;
    phoneNumber?: string;
    schoolId?: number;
  }) => api.post('/admin/create-teacher', data),
  getTeachers: (schoolId = 1) => api.get(`/admin/teachers?schoolId=${schoolId}`),
  getStudentCredentials: (termId: number, schoolId = 1) =>
    api.get(`/admin/student-credentials?termId=${termId}&schoolId=${schoolId}`),
};

export const teacherAuthAPI = {
  login: (email: string, password: string) =>
    api.post('/teacher-auth/login', { email, password }),
};

export const activationAPI = {
  activate: (token: string, password: string, confirmPassword: string) =>
    api.post('/auth/activate', { token, password, confirmPassword }),
};

export const teacherAssignmentsAPI = {
  getAll: (schoolId = 1) => api.get(`/teacher-assignments?schoolId=${schoolId}`),
  getMySubjects: (teacherId: number) =>
    api.get(`/teacher-assignments/my-subjects?teacherId=${teacherId}`),
  create: (data: { schoolId: number; teacherId: number; subjectId: number; campus: string; form: string }) =>
    api.post('/teacher-assignments', data),
  delete: (id: number) => api.delete(`/teacher-assignments/${id}`),
};

export default api;
