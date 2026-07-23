'use client';

const PROVIDER_TOKEN_KEY = 'sp.provider.token';
const ADMIN_TOKEN_KEY = 'sp.admin.token';
const PARENT_TOKEN_KEY = 'sp.parent.token';

export const providerSession = {
  get: () =>
    typeof window === 'undefined'
      ? null
      : window.localStorage.getItem(PROVIDER_TOKEN_KEY),
  set: (token: string) => window.localStorage.setItem(PROVIDER_TOKEN_KEY, token),
  clear: () => window.localStorage.removeItem(PROVIDER_TOKEN_KEY),
};

export const adminSession = {
  get: () =>
    typeof window === 'undefined'
      ? null
      : window.localStorage.getItem(ADMIN_TOKEN_KEY),
  set: (token: string) => window.localStorage.setItem(ADMIN_TOKEN_KEY, token),
  clear: () => window.localStorage.removeItem(ADMIN_TOKEN_KEY),
};

export const parentSession = {
  get: () =>
    typeof window === 'undefined'
      ? null
      : window.localStorage.getItem(PARENT_TOKEN_KEY),
  set: (token: string) => window.localStorage.setItem(PARENT_TOKEN_KEY, token),
  clear: () => window.localStorage.removeItem(PARENT_TOKEN_KEY),
};
