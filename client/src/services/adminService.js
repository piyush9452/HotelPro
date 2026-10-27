import api, { unwrap } from './api';
import { clean } from './roomService';

export const adminService = {
  dashboard: () => api.get('/admin/dashboard').then(unwrap),
  reports: (params) => api.get('/admin/reports', { params: clean(params) }).then(unwrap),
  downloadReport: async (params) => {
    const res = await api.get('/admin/reports', { params: clean({ ...params, format: 'csv' }), responseType: 'blob' });
    const disposition = res.headers['content-disposition'] || '';
    const filename = /filename="([^"]+)"/.exec(disposition)?.[1] || `hotelpro-${params.type}.csv`;
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
  users: (params) => api.get('/admin/users', { params: clean(params) }).then(unwrap),
  user: (id) => api.get(`/admin/users/${id}`).then(unwrap),
  setUserStatus: (id, isActive, reason) => api.patch(`/admin/users/${id}/status`, { isActive, reason }).then(unwrap),
  bookings: (params) => api.get('/admin/bookings', { params: clean(params) }).then(unwrap),
  booking: (id) => api.get(`/admin/bookings/${id}`).then(unwrap),
  setBookingStatus: (id, status, note) => api.patch(`/admin/bookings/${id}/status`, { status, note }).then(unwrap),
  auditLogs: (params) => api.get('/admin/audit-logs', { params: clean(params) }).then(unwrap),
  messages: (params) => api.get('/admin/messages', { params: clean(params) }).then(unwrap),
  setMessageStatus: (id, status) => api.patch(`/admin/messages/${id}`, { status }).then(unwrap),
};
