import axios from 'axios';

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8001/api').replace(/\/$/, '');

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 20000,
});

// CSRF: the token is fetched once and attached to every state-changing request.
let csrfTokenPromise = null;
const UNSAFE = new Set(['post', 'put', 'patch', 'delete']);

function fetchCsrfToken() {
  if (!csrfTokenPromise) {
    csrfTokenPromise = axios
      .get(`${API_URL}/csrf-token`, { withCredentials: true })
      .then((res) => res.data.data.csrfToken)
      .catch((err) => {
        csrfTokenPromise = null;
        throw err;
      });
  }
  return csrfTokenPromise;
}

api.interceptors.request.use(async (config) => {
  if (UNSAFE.has((config.method || 'get').toLowerCase())) {
    config.headers['X-CSRF-Token'] = await fetchCsrfToken();
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error;
    const code = response?.data?.error?.code;

    if (response?.status === 403 && code === 'CSRF_INVALID' && config && !config._csrfRetried) {
      csrfTokenPromise = null;
      config._csrfRetried = true;
      return api(config);
    }
    if (response?.status === 401 && (code === 'SESSION_EXPIRED' || code === 'SESSION_INVALID')) {
      window.dispatchEvent(new CustomEvent('auth:expired', { detail: response.data.error.message }));
    }
    return Promise.reject(error);
  },
);

export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (error?.response?.data?.error?.message) return error.response.data.error.message;
  if (error?.code === 'ECONNABORTED') return 'The server took too long to respond. Please try again.';
  if (error?.request && !error.response) return 'Cannot reach the server. Please check your connection and try again.';
  return error?.message || fallback;
}

export const getErrorCode = (error) => error?.response?.data?.error?.code;

/** Maps server-side field validation errors onto react-hook-form fields. Returns true if any were applied. */
export function applyServerErrors(error, setError, fields = []) {
  const details = error?.response?.data?.error?.details;
  if (!Array.isArray(details)) return false;
  let applied = false;
  for (const d of details) {
    const name = d.field;
    if (name && (!fields.length || fields.includes(name))) {
      setError(name, { type: 'server', message: d.message });
      applied = true;
    }
  }
  return applied;
}

// Unwraps the standard { success, data, meta, message } envelope.
export const unwrap = (res) => res.data;

export default api;
