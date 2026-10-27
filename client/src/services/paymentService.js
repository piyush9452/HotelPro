import api, { unwrap } from './api';

export const paymentService = {
  config: () => api.get('/payments/config').then(unwrap),
  createOrder: (bookingId) => api.post('/payments/create-order', { bookingId }).then(unwrap),
  verify: (data) => api.post('/payments/verify', data).then(unwrap),
  reportFailure: (data) => api.post('/payments/failure', data).then(unwrap),
  // Development-only mock gateway; the server rejects this in production.
  mockCheckout: (orderId, outcome) => api.post('/payments/mock/checkout', { orderId, outcome }).then(unwrap),
};

let razorpayScript = null;
export function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (!razorpayScript) {
    razorpayScript = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(window.Razorpay);
      script.onerror = () => {
        razorpayScript = null;
        reject(new Error('Could not load the payment window. Please check your connection.'));
      };
      document.body.appendChild(script);
    });
  }
  return razorpayScript;
}
