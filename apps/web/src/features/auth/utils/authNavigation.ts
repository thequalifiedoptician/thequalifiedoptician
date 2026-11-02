import type { Location } from 'react-router-dom';

export type AuthRedirectState = {
  from: string;
};

export function getAuthRedirectState(
  location: Pick<Location, 'pathname' | 'search' | 'hash'>,
): AuthRedirectState {
  return {
    from: `${location.pathname}${location.search}${location.hash}`,
  };
}
