function resolveApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:4001';
}

export const API_URL = resolveApiBase();

export interface ApiError extends Error {
  status: number;
  data: unknown;
}

export async function apiFetch<T>(
  path: string,
  opts: RequestInit = {},
): Promise<T> {
  const base = resolveApiBase();
  const res = await fetch(`${base}/api${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers ?? {}),
    },
    cache: 'no-store',
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(
      (data as { message?: string })?.message ?? `HTTP ${res.status}`,
    ) as ApiError;
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data as T;
}

export async function apiPost<T>(path: string, body: unknown, token?: string) {
  return apiFetch<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

export async function apiGet<T>(path: string, token?: string) {
  return apiFetch<T>(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

export async function apiPatch<T>(path: string, body: unknown, token?: string) {
  return apiFetch<T>(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

export async function apiDelete<T>(path: string, token?: string) {
  return apiFetch<T>(path, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

export async function apiUpload<T>(
  path: string,
  file: File,
  token?: string,
  fieldName = 'file',
): Promise<T> {
  const base = resolveApiBase();
  const fd = new FormData();
  fd.append(fieldName, file);
  const res = await fetch(`${base}/api${path}`, {
    method: 'POST',
    body: fd,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: 'no-store',
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(
      (data as { message?: string })?.message ?? `HTTP ${res.status}`,
    ) as ApiError;
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data as T;
}
