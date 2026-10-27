export const EMAIL_RULES = {
  required: 'Email is required',
  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' },
};

export const PHONE_RULES = {
  required: 'Phone number is required',
  pattern: { value: /^\+?[0-9\s-]{7,20}$/, message: 'Enter a valid phone number' },
};

export const NAME_RULES = {
  required: 'Name is required',
  minLength: { value: 2, message: 'Name must be at least 2 characters' },
  maxLength: { value: 80, message: 'Name must be at most 80 characters' },
};

// Mirrors the server's password policy so users get instant feedback.
export const PASSWORD_RULES = {
  required: 'Password is required',
  minLength: { value: 8, message: 'Use at least 8 characters' },
  maxLength: { value: 128, message: 'Use at most 128 characters' },
  validate: {
    lower: (v) => /[a-z]/.test(v) || 'Include a lowercase letter',
    upper: (v) => /[A-Z]/.test(v) || 'Include an uppercase letter',
    digit: (v) => /[0-9]/.test(v) || 'Include a number',
  },
};

export function passwordStrength(value = '') {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/[0-9]/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  return Math.min(4, score);
}
