import { ApiError } from '../utils/ApiError.js';

const formatIssues = (issues) =>
  issues.map((issue) => ({ field: issue.path.join('.') || undefined, message: issue.message }));

// Replaces req.body / req.query / req.params with the parsed (typed, stripped) values.
export const validate = (schemas) => (req, _res, next) => {
  const issues = [];
  for (const part of ['params', 'query', 'body']) {
    if (!schemas[part]) continue;
    const result = schemas[part].safeParse(req[part] ?? {});
    if (result.success) req[part] = result.data;
    else issues.push(...formatIssues(result.error.issues));
  }
  if (issues.length) {
    return next(ApiError.badRequest(issues[0].message, { code: 'VALIDATION_ERROR', details: issues }));
  }
  return next();
};
