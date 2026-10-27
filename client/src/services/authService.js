import api, { unwrap } from './api';

export const authService = {
  me: () => api.get('/auth/me').then(unwrap),
  session: () => api.get('/auth/session').then(unwrap),
  login: (data) => api.post('/auth/login', data).then(unwrap),
  register: (data) => api.post('/auth/register', data).then(unwrap),
  logout: () => api.post('/auth/logout').then(unwrap),
  updateProfile: (data) => api.patch('/auth/me', data).then(unwrap),
  changePassword: (data) => api.post('/auth/change-password', data).then(unwrap),
  forgotPassword: (data) => api.post('/auth/forgot-password', data).then(unwrap),
  resetPassword: (data) => api.post('/auth/reset-password', data).then(unwrap),
};
