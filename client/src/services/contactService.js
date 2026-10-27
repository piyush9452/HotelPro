import api, { unwrap } from './api';

export const contactService = {
  send: (data) => api.post('/contact', data).then(unwrap),
};
