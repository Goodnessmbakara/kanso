import { enqueueMutation, getQueuedMutations } from './syncQueue';
import { BootstrapResponse } from '../types';

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export function notifySyncStatus() {
  window.dispatchEvent(new CustomEvent('todo:sync-status-changed'));
}

export async function apiRequest<T = any>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: any
): Promise<T> {
  if (!navigator.onLine && method !== 'GET') {
    enqueueMutation(method, path, body);
    notifySyncStatus();
    return { offline: true } as unknown as T;
  }

  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (method !== 'GET') {
      enqueueMutation(method, path, body);
      notifySyncStatus();
      return { offline: true } as unknown as T;
    }
    throw new ApiError('Network error — please check your internet connection');
  }

  if (res.status === 401) {
    localStorage.removeItem('todo_cached_bootstrap');
    window.dispatchEvent(new CustomEvent('todo:auth-expired'));
    throw new ApiError('Not signed in', 401);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError((data as any).error || `Request failed with status ${res.status}`, res.status);
  }

  notifySyncStatus();
  return data as T;
}

const CACHE_KEY = 'todo_cached_bootstrap';

export function getCachedBootstrap(): BootstrapResponse | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCachedBootstrap(data: BootstrapResponse): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {}
}
