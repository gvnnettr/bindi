import { API_URL } from './config';

export class ApiError extends Error {
  status: number;
  body: any;
  constructor(status: number, message: string, body: any) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(
  path: string,
  init: RequestInit,
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init.headers as Record<string, string> | undefined),
  };
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const msg =
      (body && (body.message || body.error)) ||
      `HTTP ${res.status}`;
    throw new ApiError(res.status, Array.isArray(msg) ? msg.join(', ') : msg, body);
  }
  return body as T;
}

export const api = {
  get: <T>(path: string, token?: string | null) =>
    request<T>(path, { method: 'GET' }, token),
  post: <T>(path: string, body: any, token?: string | null) =>
    request<T>(
      path,
      { method: 'POST', body: JSON.stringify(body ?? {}) },
      token,
    ),
  patch: <T>(path: string, body: any, token?: string | null) =>
    request<T>(
      path,
      { method: 'PATCH', body: JSON.stringify(body ?? {}) },
      token,
    ),
  del: <T>(path: string, token?: string | null) =>
    request<T>(path, { method: 'DELETE' }, token),
};
