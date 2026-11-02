export { AuthProvider } from './context/AuthProvider';
export { AuthContext, type AuthContextValue } from './context/AuthContext';
export { useAuth } from './hooks/useAuth';
export { default as ProtectedRoute } from './guards/ProtectedRoute';
export { default as GuestRoute } from './guards/GuestRoute';
export {
  signInWithEmail,
  signInWithProvider,
  signOutUser,
  signUpWithEmail,
} from './services/authService';
export {
  clearSession,
  recoverSession,
  refreshSession,
  subscribeToAuthState,
  type AuthStateListener,
} from './services/sessionManager';
export { AUTH_OAUTH_RETURN_TO_KEY, AUTH_ROUTES, AUTH_VALIDATION } from './constants/auth';
export {
  getPasswordRequirements,
  getPasswordStrength,
  validateConfirmPassword,
  validateEmail,
  validateName,
  validatePassword,
  validateSignupPassword,
} from './utils/validation';
export { AuthServiceError, getAuthErrorMessage, toAuthServiceError } from './utils/authErrors';
export { getAuthRedirectState, type AuthRedirectState } from './utils/authNavigation';
export type { AuthErrorCode, AuthState, AuthStatus, ValidationResult } from './types/auth';
export type { PasswordStrength } from './utils/validation';
export type { Database, Json } from './types/database';
