import axios from 'axios';

export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth Service
export const authService = {
  login: (credentials: { email: string; password: string }) =>
    api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me'),
  getDemoAccounts: () => api.get('/auth/demo-accounts'),
};

// Hierarchy Services
export const establishmentService = {
  getAll: () => api.get('/establishments'),
  getById: (id: string) => api.get(`/establishments/${id}`),
  create: (data: any) => api.post('/establishments', data),
  update: (id: string, data: any) => api.put(`/establishments/${id}`, data),
};

export const groupementService = {
  getAll: (params?: { establishmentId?: string }) => api.get('/groupements', { params }),
  create: (data: any) => api.post('/groupements', data),
  update: (id: string, data: any) => api.put(`/groupements/${id}`, data),
};

export const compagnieService = {
  getAll: (params?: { groupementId?: string; establishmentId?: string }) =>
    api.get('/compagnies', { params }),
  create: (data: any) => api.post('/compagnies', data),
  update: (id: string, data: any) => api.put(`/compagnies/${id}`, data),
};

// Students Service
export const studentService = {
  getAll: (params?: any) => api.get('/students', { params }),
  getById: (id: string) => api.get(`/students/${id}`),
  create: (data: any) => api.post('/students', data),
  update: (id: string, data: any) => api.put(`/students/${id}`, data),
};

// Requests & Workflow Service
export const requestService = {
  getAll: (params?: any) => api.get('/requests', { params }),
  getById: (id: string) => api.get(`/requests/${id}`),
  create: (data: any) => api.post('/requests', data),
  executeAction: (id: string, actionData: { action: string; comments?: string; reason?: string }) =>
    api.post(`/requests/${id}/action`, actionData),
  getTypes: () => api.get('/requests/types'),
};

// Absences Service
export const absenceService = {
  getAll: (params?: any) => api.get('/absences', { params }),
  create: (data: any) => api.post('/absences', data),
  update: (id: string, data: any) => api.put(`/absences/${id}`, data),
};

// Grades Service
export const gradeService = {
  getSubjects: () => api.get('/grades/subjects'),
  getAssessments: (params?: any) => api.get('/grades/assessments', { params }),
  createAssessment: (data: any) => api.post('/grades/assessments', data),
  getGradesByAssessment: (assessmentId: string) =>
    api.get(`/grades/assessments/${assessmentId}/grades`),
  saveGrade: (data: any) => api.post('/grades/save', data),
  submitAssessment: (assessmentId: string) =>
    api.post(`/grades/assessments/${assessmentId}/submit`),
  validateAssessment: (assessmentId: string) =>
    api.post(`/grades/assessments/${assessmentId}/validate`),
};

// Dashboard Service
export const dashboardService = {
  getStats: () => api.get('/dashboard/stats'),
};

// Users & Roles Service
export const userService = {
  getAll: () => api.get('/users'),
  getRoles: () => api.get('/users/roles'),
  create: (data: any) => api.post('/users', data),
  toggleStatus: (id: string) => api.patch(`/users/${id}/toggle-status`),
};

// Notifications Service
export const notificationService = {
  getAll: () => api.get('/notifications'),
  markAsRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.post('/notifications/mark-all-read'),
};

// Audit Logs Service
export const auditService = {
  getAll: (params?: any) => api.get('/audit-logs', { params }),
};
