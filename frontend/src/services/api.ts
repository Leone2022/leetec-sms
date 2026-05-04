import axios from 'axios';

const API_BASE_URL = 'http://localhost:5208/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auto attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('leetec_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto handle 401 unauthorized
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

// Auth
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: any) =>
    api.post('/auth/register', data),
};

// Students
export const studentsAPI = {
  getAll: (schoolId: number) =>
    api.get(`/students/school/${schoolId}`),
  getById: (id: number) =>
    api.get(`/students/${id}`),
  enrol: (data: any) =>
    api.post('/students/enrol', data),
  search: (schoolId: number, query: string) =>
    api.get(`/students/search?schoolId=${schoolId}&query=${query}`),
};

// Fees
export const feesAPI = {
  getTerms: (schoolId: number) =>
    api.get(`/fees/terms/school/${schoolId}`),
  createTerm: (data: any) =>
    api.post('/fees/terms', data),
  activateTerm: (id: number) =>
    api.put(`/fees/terms/${id}/activate`),
  getCategories: (schoolId: number) =>
    api.get(`/fees/categories/school/${schoolId}`),
  createCategory: (data: any) =>
    api.post('/fees/categories', data),
  getPackages: (termId: number) =>
    api.get(`/fees/packages/term/${termId}`),
  createPackage: (data: any) =>
    api.post('/fees/packages', data),
  generateInvoices: (data: any) =>
    api.post('/fees/invoices/generate', data),
  getTermInvoices: (schoolId: number, termId: number) =>
    api.get(`/fees/invoices/school/${schoolId}/term/${termId}`),
  getStudentInvoices: (studentId: number) =>
    api.get(`/fees/invoices/student/${studentId}`),
  postPayment: (data: any) =>
    api.post('/fees/payments', data),
};

// Student Portal
export const portalAPI = {
  register: (data: any) =>
    api.post('/student-portal/register', data),
  login: (email: string, password: string) =>
    api.post('/student-portal/login', { email, password }),
  getPendingAccounts: () =>
    api.get('/student-portal/pending-accounts'),
  approveAccount: (id: number) =>
    api.put(`/student-portal/approve/${id}`),
  forgotPassword: (email: string) =>
    api.post('/student-portal/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) =>
    api.post('/student-portal/reset-password', { token, newPassword }),
  getDashboard: (studentId: number) =>
    api.get(`/student-portal/dashboard/${studentId}`),
};

export default api;