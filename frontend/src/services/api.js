import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestPath = error.config?.url || '';
    const isAuthEndpoint = requestPath.includes('/auth/login') || requestPath.includes('/auth/register');

    // Only force logout redirect for protected API requests, not login/register failures.
    if ((status === 401 || status === 403) && !isAuthEndpoint) {
      // Token expired or invalid, redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const auth = {
  register: (username, password) =>
    api.post('/auth/register', { username, password }),

  login: (username, password) =>
    api.post('/auth/login', { username, password }),

  getMe: () =>
    api.get('/auth/me'),

  changePassword: (currentPassword, newPassword) =>
    api.put('/auth/change-password', { currentPassword, newPassword })
};

// Libraries API
export const libraries = {
  getAll: () =>
    api.get('/libraries'),

  add: (libraryData) =>
    api.post('/libraries', libraryData),

  update: (id, libraryData) =>
    api.put(`/libraries/${id}`, libraryData),

  delete: (id) =>
    api.delete(`/libraries/${id}`),

  testConnection: (libraryData) =>
    api.post('/libraries/test', libraryData),

  test: (id) =>
    api.post(`/libraries/${id}/test`)
};

// Videos API
export const videos = {
  list: (libraryId, prefix = '') =>
    api.get(`/videos/${libraryId}`, { params: { prefix } }),

  getStreamUrl: (libraryId, key) =>
    `/api/stream/${libraryId}/${encodeURIComponent(key)}?token=${localStorage.getItem('token')}`
};

export default api;
