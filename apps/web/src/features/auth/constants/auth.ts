export const AUTH_ROUTES = {
  login: '/auth/login',
  signup: '/auth/signup',
  forgotPassword: '/auth/forgot-password',
  resetPassword: '/auth/reset-password',
  account: '/account',
  foundationPreview: '/auth/foundation',
} as const;

export const AUTH_OAUTH_RETURN_TO_KEY = 'alsera-auth-return-to';

export const AUTH_VALIDATION = {
  emailMaxLength: 254,
  passwordMinLength: 8,
  passwordMaxLength: 128,
  nameMinLength: 2,
  nameMaxLength: 80,
} as const;
