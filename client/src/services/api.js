import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT token to requests if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('aegis_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Automatically handle 401 Unauthorized responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('aegis_token');
      localStorage.removeItem('aegis_user');
    }
    return Promise.reject(error);
  }
);

// Authentication API Services
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getBases: () => api.get('/auth/bases'),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
};

// Reports & Analytics API Services
export const reportsAPI = {
  getSummary: (params = {}) => api.get('/reports/summary', { params }),
};

// Dashboard API Services
export const dashboardAPI = {
  getSummary: (params = {}) => api.get('/dashboard/summary', { params }),
  getMovement: (params = {}) => api.get('/dashboard/movement', { params }),
  getMovementDetails: (params = {}) => api.get('/dashboard/movement-details', { params }),
  getFilters: () => api.get('/dashboard/filters'),
};

// Assets API Services
export const assetsAPI = {
  getAll: (params = {}) => api.get('/assets', { params }),
  getById: (id) => api.get(`/assets/${id}`),
  create: (data) => api.post('/assets', data),
  update: (id, data) => api.put(`/assets/${id}`, data),
  delete: (id) => api.delete(`/assets/${id}`),
};

// Purchases API Services
export const purchasesAPI = {
  getAll: (params = {}) => api.get('/purchases', { params }),
  getById: (id) => api.get(`/purchases/${id}`),
  create: (data) => api.post('/purchases', data),
};

// Transfers API Services
export const transfersAPI = {
  getAll: (params = {}) => api.get('/transfers', { params }),
  getById: (id) => api.get(`/transfers/${id}`),
  create: (data) => api.post('/transfers', data),
};

// Assignments API Services
export const assignmentsAPI = {
  getAll: (params = {}) => api.get('/assignments', { params }),
  getById: (id) => api.get(`/assignments/${id}`),
  create: (data) => api.post('/assignments', data),
  returnAssignment: (id) => api.put(`/assignments/${id}/return`),
};

// Expenditures API Services
export const expendituresAPI = {
  getAll: (params = {}) => api.get('/expenditures', { params }),
  getById: (id) => api.get(`/expenditures/${id}`),
  create: (data) => api.post('/expenditures', data),
};

// Audit Logs API Services
export const auditAPI = {
  getAll: (params = {}) => api.get('/audit', { params }),
};

export default api;
