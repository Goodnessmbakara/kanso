export interface QueuedMutation {
  id: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  path: string;
  body?: any;
  createdAt: number;
}

const QUEUE_KEY = 'todo_offline_queue_v1';

export function getQueuedMutations(): QueuedMutation[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveQueuedMutations(queue: QueuedMutation[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {}
}

export function enqueueMutation(method: 'POST' | 'PATCH' | 'DELETE', path: string, body?: any): void {
  const queue = getQueuedMutations();
  queue.push({
    id: crypto.randomUUID(),
    method,
    path,
    body,
    createdAt: Date.now(),
  });
  saveQueuedMutations(queue);
}

export async function replayMutationQueue(
  onSuccess?: () => void,
  onError?: (err: any) => void
): Promise<boolean> {
  const queue = getQueuedMutations();
  if (queue.length === 0 || !navigator.onLine) return true;

  const pending = [...queue];

  for (let i = 0; i < pending.length; i++) {
    const item = pending[i];
    try {
      const res = await fetch(item.path, {
        method: item.method,
        headers: item.body ? { 'Content-Type': 'application/json' } : undefined,
        body: item.body ? JSON.stringify(item.body) : undefined,
      });

      if (res.status === 401) {
        // User is logged out, stop replay
        if (onError) onError(new Error('Session expired during sync'));
        return false;
      }
    } catch (err) {
      // Still offline or network dropped mid-sync
      saveQueuedMutations(pending.slice(i));
      if (onError) onError(err);
      return false;
    }
  }

  // All cleared
  saveQueuedMutations([]);
  if (onSuccess) onSuccess();
  return true;
}
