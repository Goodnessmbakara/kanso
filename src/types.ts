export interface User {
  id: string;
  email: string;
}

export interface List {
  id: string;
  owner_id: string;
  name: string;
  created_at: string;
}

export interface ListMember {
  list_id: string;
  user_id: string;
  email: string;
  created_at: string;
}

export interface Task {
  id: string;
  list_id: string;
  parent_id?: string | null;
  title: string;
  notes: string;
  due_at?: string | null;
  reminder_at?: string | null;
  priority: number; // 0 = None, 1 = High, 2 = Medium, 3 = Low
  completed_at?: string | null;
  sort_order: number;
  recur?: string | null; // e.g. '{"unit":"day","every":1}'
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type FilterType = 'all' | 'active' | 'done';
export type SortType = 'manual' | 'due' | 'priority' | 'newest';
export type SyncStatus = 'synced' | 'queued' | 'offline';

export interface BootstrapResponse {
  user: User;
  lists: List[];
  tasks: Task[];
  members: ListMember[];
}

export interface ParsedQuickAdd {
  title: string;
  listName: string | null;
  priority: number;
  date: string | null; // YYYY-MM-DD
  time: string | null; // HH:mm
  due_at: string | null;
  reminder_at: string | null;
}
