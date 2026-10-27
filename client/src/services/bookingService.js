import api, { unwrap } from './api';
import { clean } from './roomService';

export const bookingService = {
  create: (data) => api.post('/bookings', data).then(unwrap),
  my: (params) => api.get('/bookings/my', { params: clean(params) }).then(unwrap),
  get: (id) => api.get(`/bookings/${id}`).then(unwrap),
  cancel: (id, reason) => api.post(`/bookings/${id}/cancel`, { reason }).then(unwrap),
};
