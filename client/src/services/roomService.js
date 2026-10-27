import api, { unwrap } from './api';

const clean = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length)));

export const roomService = {
  list: (params) => api.get('/rooms', { params: clean(params) }).then(unwrap),
  meta: () => api.get('/rooms/meta').then(unwrap),
  get: (id) => api.get(`/rooms/${id}`).then(unwrap),
  availability: (params) => api.get('/rooms/availability', { params: clean(params) }).then(unwrap),

  // Admin
  adminList: (params) => api.get('/admin/rooms', { params: clean(params) }).then(unwrap),
  adminGet: (id) => api.get(`/admin/rooms/${id}`).then(unwrap),
  create: (data) => api.post('/rooms', data).then(unwrap),
  update: (id, data) => api.patch(`/rooms/${id}`, data).then(unwrap),
  remove: (id, { permanent = false } = {}) => api.delete(`/rooms/${id}`, { params: permanent ? { permanent: 'true' } : {} }).then(unwrap),
  uploadImages: (id, files) => {
    const form = new FormData();
    for (const file of files) form.append('images', file);
    return api.post(`/rooms/${id}/images`, form, { timeout: 60000 }).then(unwrap);
  },
  deleteImage: (id, imageId) => api.delete(`/rooms/${id}/images/${imageId}`).then(unwrap),
};

export { clean };
