// Strips MongoDB operator keys ($gt, $where, ...) and dotted paths from untrusted
// input so request data can never be turned into a query operator.
function clean(value, depth = 0) {
  if (depth > 10 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => clean(item, depth + 1));
  for (const key of Object.keys(value)) {
    if (key.startsWith('$') || key.includes('.') || key === '__proto__' || key === 'constructor' || key === 'prototype') {
      delete value[key];
    } else {
      value[key] = clean(value[key], depth + 1);
    }
  }
  return value;
}

export function sanitizeRequest(req, _res, next) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) clean(req.body);
  if (req.query) clean(req.query);
  if (req.params) clean(req.params);
  next();
}
