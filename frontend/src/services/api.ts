import axios from 'axios';

const API_BASE_URL = 'http://localhost:5208/api';

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
  generateInvoices: (data: any) => api.post('/fees/invoices/generate', data),
  getTermInvoices: (schoolId: number, termId: number) =>
    api.get(`/fees/invoices/school/${schoolId}/term/${termId}`),
  getStudentInvoices: (studentId: number) =>
    api.get(`/fees/invoices/student/${studentId}`),
  postPayment: (data: any) => api.post('/fees/payments', data),
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
};

export const superadminAPI = {
  getStats: () => api.get('/superadmin/stats'),
  getSchools: () => api.get('/superadmin/schools'),
  createSchool: (data: any) => api.post('/superadmin/schools', data),
  toggleSchoolActive: (id: number) => api.put(`/superadmin/schools/${id}/toggle-active`),
  getUsers: () => api.get('/superadmin/users'),
};

export default api;
