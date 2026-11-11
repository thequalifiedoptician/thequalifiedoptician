import type { Location } from 'react-router-dom';

export type AuthRedirectState = {
  from: string;
};

export function getSafeAuthReturnPath(value: unknown, fallback = '/'): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return fallback;
  }
  return value;
}

export function getAuthRedirectState(
  location: Pick<Location, 'pathname' | 'search' | 'hash'>,
  returnTo?: string,
): AuthRedirectState {
  return {
    from: returnTo ?? `${location.pathname}${location.search}${location.hash}`,
  };
}
