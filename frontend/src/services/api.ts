import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor — attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401 / token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true });
        const { token } = res.data;
        localStorage.setItem('token', token);
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch (_) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => api.post('/auth/reset-password', { token, password })
};

// Users
export const usersApi = {
  list: (params?: object) => api.get('/users', { params }),
  get: (id: string) => api.get(`/users/${id}`),
  create: (data: object) => api.post('/users', data),
  update: (id: string, data: object) => api.put(`/users/${id}`, data),
  deactivate: (id: string) => api.delete(`/users/${id}`),
  resetPassword: (id: string, password: string) => api.put(`/users/${id}/reset-password`, { password }),
  roles: () => api.get('/users/roles/list')
};

// Expenses
export const expensesApi = {
  list: (params?: object) => api.get('/expenses', { params }),
  get: (id: string) => api.get(`/expenses/${id}`),
  create: (data: FormData) => api.post('/expenses', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id: string, data: FormData) => api.put(`/expenses/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  cancel: (id: string) => api.delete(`/expenses/${id}`),
  approve: (id: string, data: object) => api.post(`/expenses/${id}/approve`, data),
  reject: (id: string, data: object) => api.post(`/expenses/${id}/reject`, data),
  requestCorrection: (id: string, data: object) => api.post(`/expenses/${id}/request-correction`, data),
  summary: (params?: object) => api.get('/expenses/dashboard/summary', { params })
};

// Reimbursements
export const reimbursementsApi = {
  list: (params?: object) => api.get('/reimbursements', { params }),
  summary: () => api.get('/reimbursements/summary'),
  approve: (id: string, data: object) => api.post(`/reimbursements/${id}/approve`, data),
  reject: (id: string, data: object) => api.post(`/reimbursements/${id}/reject`, data),
  pay: (id: string, data: FormData) => api.post(`/reimbursements/${id}/pay`, data, { headers: { 'Content-Type': 'multipart/form-data' } })
};

// Departments
export const departmentsApi = {
  list: () => api.get('/departments'),
  create: (data: object) => api.post('/departments', data),
  update: (id: string, data: object) => api.put(`/departments/${id}`, data),
  delete: (id: string) => api.delete(`/departments/${id}`)
};

// Categories
export const categoriesApi = {
  list: () => api.get('/categories'),
  create: (data: object) => api.post('/categories', data),
  update: (id: string, data: object) => api.put(`/categories/${id}`, data),
  delete: (id: string) => api.delete(`/categories/${id}`)
};

// Reports
export const reportsApi = {
  expenses: (params?: object) => api.get('/reports/expenses', { params }),
  monthly: (params?: object) => api.get('/reports/monthly', { params }),
  categories: (params?: object) => api.get('/reports/categories', { params }),
  departments: (params?: object) => api.get('/reports/departments', { params }),
  users: (params?: object) => api.get('/reports/users', { params }),
  reimbursements: (params?: object) => api.get('/reports/reimbursements', { params }),
  paymentMethods: (params?: object) => api.get('/reports/payment-methods', { params })
};

// Notifications
export const notificationsApi = {
  list: (params?: object) => api.get('/notifications', { params }),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/mark-all-read')
};

// Audit Logs
export const auditApi = {
  list: (params?: object) => api.get('/audit-logs', { params })
};

// Company
export const companyApi = {
  get: () => api.get('/company'),
  update: (data: object) => api.put('/company', data)
};

// Export
export const exportApi = {
  excel: (params?: object) => api.get('/export/excel', { params, responseType: 'blob' }),
  csv: (params?: object) => api.get('/export/csv', { params, responseType: 'blob' }),
  pdf: (params?: object) => api.get('/export/pdf', { params, responseType: 'blob' })
};

export default api;
