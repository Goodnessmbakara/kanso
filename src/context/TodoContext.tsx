import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { User, List, Task, ListMember, FilterType, SortType, SyncStatus, BootstrapResponse } from '../types';
import { apiRequest, getCachedBootstrap, saveCachedBootstrap, notifySyncStatus } from '../lib/api';
import { replayMutationQueue, getQueuedMutations } from '../lib/syncQueue';
import { parseQuickAdd } from '../lib/naturalLanguage';

interface ToastInfo {
  id: string;
  message: string;
  undoAction?: () => void;
}

interface TodoContextType {
  user: User | null;
  lists: List[];
  tasks: Task[];
  members: ListMember[];
  currentView: string; // 'all' or listId
  filter: FilterType;
  sort: SortType;
  search: string;
  selectedTaskId: string | null;
  expandedTaskId: string | null;
  syncStatus: SyncStatus;
  theme: 'light' | 'dark';
  toasts: ToastInfo[];
  isShareModalOpen: boolean;
  isShortcutsModalOpen: boolean;
  isMobileSidebarOpen: boolean;
  activeCount: (listId?: string) => number;
  setCurrentView: (view: string) => void;
  setFilter: (filter: FilterType) => void;
  setSort: (sort: SortType) => void;
  setSearch: (search: string) => void;
  setSelectedTaskId: (id: string | null) => void;
  setExpandedTaskId: (id: string | null) => void;
  setIsShareModalOpen: (open: boolean) => void;
  setIsShortcutsModalOpen: (open: boolean) => void;
  setIsMobileSidebarOpen: (open: boolean) => void;
  showToast: (message: string, undoAction?: () => void) => void;
  cycleTheme: () => void;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  createList: (name: string) => Promise<List>;
  renameList: (listId: string, name: string) => Promise<void>;
  deleteList: (listId: string) => Promise<void>;
  shareList: (listId: string, email: string) => Promise<void>;
  unshareList: (listId: string, targetUserId: string) => Promise<void>;
  addTask: (input: string, parentId?: string) => Promise<void>;
  toggleTask: (taskId: string) => Promise<void>;
  updateTask: (taskId: string, changes: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  reorderTask: (draggedId: string, targetId: string, position: 'before' | 'after') => Promise<void>;
  clearCompleted: () => Promise<void>;
}

const TodoContext = createContext<TodoContextType | null>(null);

export const TodoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const cached = getCachedBootstrap();
  const [user, setUser] = useState<User | null>(cached?.user || null);
  const [lists, setLists] = useState<List[]>(cached?.lists || []);
  const [tasks, setTasks] = useState<Task[]>(cached?.tasks || []);
  const [members, setMembers] = useState<ListMember[]>(cached?.members || []);

  const [currentView, setCurrentView] = useState<string>(() => localStorage.getItem('todo_view') || 'all');
  const [filter, setFilter] = useState<FilterType>(() => (localStorage.getItem('todo_filter') as FilterType) || 'all');
  const [sort, setSort] = useState<SortType>(() => (localStorage.getItem('todo_sort') as SortType) || 'manual');
  const [search, setSearch] = useState<string>('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastInfo[]>([]);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('todo_theme') as 'light' | 'dark' | null;
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Calculate sync status
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => {
    if (!navigator.onLine) return 'offline';
    return getQueuedMutations().length > 0 ? 'queued' : 'synced';
  });

  const updateSyncStatus = useCallback(() => {
    if (!navigator.onLine) {
      setSyncStatus('offline');
    } else {
      setSyncStatus(getQueuedMutations().length > 0 ? 'queued' : 'synced');
    }
  }, []);

  // Theme application
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
    localStorage.setItem('todo_theme', theme);
  }, [theme]);

  const cycleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const showToast = useCallback((message: string, undoAction?: () => void) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, undoAction }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  // Sync cache with state
  useEffect(() => {
    if (user) {
      saveCachedBootstrap({ user, lists, tasks, members });
    }
  }, [user, lists, tasks, members]);

  // Persist view, filter, sort
  useEffect(() => {
    localStorage.setItem('todo_view', currentView);
  }, [currentView]);
  useEffect(() => {
    localStorage.setItem('todo_filter', filter);
  }, [filter]);
  useEffect(() => {
    localStorage.setItem('todo_sort', sort);
  }, [sort]);

  // Sync queue management & online/offline listeners
  const fetchFreshData = useCallback(async () => {
    if (!navigator.onLine) return;
    try {
      const data = await apiRequest<BootstrapResponse>('GET', '/api/bootstrap');
      setUser(data.user);
      setLists(data.lists);
      setTasks(data.tasks);
      setMembers(data.members);
      updateSyncStatus();
    } catch (err: any) {
      if (err?.status === 401) {
        setUser(null);
      }
    }
  }, [updateSyncStatus]);

  useEffect(() => {
    const handleOnline = () => {
      updateSyncStatus();
      replayMutationQueue(() => {
        updateSyncStatus();
        fetchFreshData();
        showToast('Online: all offline changes synced');
      });
    };
    const handleOffline = () => {
      updateSyncStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('todo:sync-status-changed', updateSyncStatus);

    // Initial sync replay if needed
    if (navigator.onLine && getQueuedMutations().length > 0) {
      replayMutationQueue(() => {
        updateSyncStatus();
        fetchFreshData();
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('todo:sync-status-changed', updateSyncStatus);
    };
  }, [updateSyncStatus, fetchFreshData, showToast]);

  // Initial bootstrap fetch
  useEffect(() => {
    if (user && navigator.onLine) {
      fetchFreshData();
    }
  }, []);

  // Active tasks counter
  const activeCount = useCallback((listId?: string) => {
    return tasks.filter(
      (t) => !t.parent_id && !t.completed_at && (!listId || t.list_id === listId)
    ).length;
  }, [tasks]);

  // ------------------- AUTH ACTIONS -------------------
  const login = async (email: string, pass: string) => {
    const data = await apiRequest<BootstrapResponse>('POST', '/api/auth/login', { email, password: pass });
    setUser(data.user);
    setLists(data.lists);
    setTasks(data.tasks);
    setMembers(data.members);
    showToast(`Welcome back, ${data.user.email}!`);
  };

  const register = async (email: string, pass: string) => {
    const data = await apiRequest<BootstrapResponse>('POST', '/api/auth/register', { email, password: pass });
    setUser(data.user);
    setLists(data.lists);
    setTasks(data.tasks);
    setMembers(data.members);
    showToast('Account created successfully!');
  };

  const logout = async () => {
    await apiRequest('POST', '/api/auth/logout').catch(() => {});
    setUser(null);
    setLists([]);
    setTasks([]);
    setMembers([]);
    localStorage.removeItem('todo_cached_bootstrap');
    showToast('Signed out');
  };

  // ------------------- LIST ACTIONS -------------------
  const createList = async (name: string): Promise<List> => {
    const listId = crypto.randomUUID();
    const newList: List = {
      id: listId,
      owner_id: user?.id || '',
      name: name.trim(),
      created_at: new Date().toISOString(),
    };

    setLists((prev) => [...prev, newList]);
    setCurrentView(listId);

    const res = await apiRequest<{ list: List }>('POST', '/api/lists', { id: listId, name: newList.name });
    if (res?.list) {
      setLists((prev) => prev.map((l) => (l.id === listId ? res.list : l)));
    }
    showToast(`List "${newList.name}" created`);
    return newList;
  };

  const renameList = async (listId: string, name: string) => {
    setLists((prev) => prev.map((l) => (l.id === listId ? { ...l, name } : l)));
    await apiRequest('PATCH', `/api/lists/${listId}`, { name });
  };

  const deleteList = async (listId: string) => {
    const target = lists.find((l) => l.id === listId);
    if (!target) return;

    setLists((prev) => prev.filter((l) => l.id !== listId));
    setTasks((prev) => prev.filter((t) => t.list_id !== listId));
    setMembers((prev) => prev.filter((m) => m.list_id !== listId));
    if (currentView === listId) setCurrentView('all');

    await apiRequest('DELETE', `/api/lists/${listId}`);
    showToast(`Deleted list "${target.name}"`);
  };

  // ------------------- SHARING ACTIONS -------------------
  const shareList = async (listId: string, email: string) => {
    const res = await apiRequest<{ ok: boolean; members: ListMember[] }>('POST', `/api/lists/${listId}/share`, { email });
    if (res?.members) {
      setMembers((prev) => [
        ...prev.filter((m) => m.list_id !== listId),
        ...res.members.map((m) => ({ ...m, list_id: listId })),
      ]);
      showToast(`Shared with ${email}`);
    }
  };

  const unshareList = async (listId: string, targetUserId: string) => {
    const res = await apiRequest<{ ok: boolean; members: ListMember[] }>('DELETE', `/api/lists/${listId}/share/${targetUserId}`);
    if (res?.members) {
      setMembers((prev) => [
        ...prev.filter((m) => m.list_id !== listId),
        ...res.members.map((m) => ({ ...m, list_id: listId })),
      ]);
      showToast('Access revoked');
    }
  };

  // ------------------- TASK ACTIONS -------------------
  const addTask = async (rawInput: string, parentId?: string) => {
    const parsed = parseQuickAdd(rawInput);
    if (!parsed.title) return;

    let targetListId = currentView !== 'all' ? currentView : lists[0]?.id;
    if (parentId) {
      const parent = tasks.find((t) => t.id === parentId);
      if (parent) targetListId = parent.list_id;
    } else if (parsed.listName) {
      // Find or create matching list
      const matched = lists.find((l) => l.name.toLowerCase() === parsed.listName?.toLowerCase());
      if (matched) {
        targetListId = matched.id;
      } else {
        const created = await createList(parsed.listName);
        targetListId = created.id;
      }
    }

    if (!targetListId) {
      // Create default "Inbox" if no lists exist
      const inbox = await createList('Inbox');
      targetListId = inbox.id;
    }

    // Determine sort order
    const siblings = tasks.filter((t) => t.list_id === targetListId && (t.parent_id || null) === (parentId || null));
    const nextOrder = (Math.max(0, ...siblings.map((s) => s.sort_order || 0))) + 1;

    const taskId = crypto.randomUUID();
    const newTask: Task = {
      id: taskId,
      list_id: targetListId,
      parent_id: parentId || null,
      title: parsed.title,
      notes: '',
      due_at: parsed.due_at,
      reminder_at: parsed.reminder_at,
      priority: parsed.priority,
      completed_at: null,
      sort_order: nextOrder,
      recur: null,
      created_by: user?.id || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Optimistic insert
    setTasks((prev) => [...prev, newTask]);

    const res = await apiRequest<{ task: Task }>('POST', '/api/tasks', newTask);
    if (res?.task) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? res.task : t)));
    }
  };

  const toggleTask = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const completed_at = task.completed_at ? null : new Date().toISOString();
    const updated = { ...task, completed_at, updated_at: new Date().toISOString() };

    setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));

    const res = await apiRequest<{ task: Task; spawned?: Task }>('PATCH', `/api/tasks/${taskId}`, { completed_at });
    if (res?.spawned) {
      setTasks((prev) => [...prev, res.spawned!]);
      showToast('Recurring task — next occurrence scheduled!');
    }
  };

  const updateTask = async (taskId: string, changes: Partial<Task>) => {
    const now = new Date().toISOString();
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...changes, updated_at: now } : t)));
    const res = await apiRequest<{ task: Task; spawned?: Task }>('PATCH', `/api/tasks/${taskId}`, changes);
    if (res?.spawned) {
      setTasks((prev) => [...prev, res.spawned!]);
      showToast('Next recurrence scheduled');
    }
  };

  const deleteTask = async (taskId: string) => {
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;

    // Collect entire subtree
    const getSubtree = (id: string): Task[] => {
      const children = tasks.filter((t) => t.parent_id === id);
      return [tasks.find((t) => t.id === id)!, ...children.flatMap((c) => getSubtree(c.id))].filter(Boolean);
    };

    const doomed = getSubtree(taskId);
    setTasks((prev) => prev.filter((t) => !doomed.some((d) => d.id === t.id)));

    if (selectedTaskId === taskId) setSelectedTaskId(null);
    if (expandedTaskId === taskId) setExpandedTaskId(null);

    await apiRequest('DELETE', `/api/tasks/${taskId}`);

    showToast(`Deleted "${target.title.length > 25 ? target.title.slice(0, 24) + '…' : target.title}"`, async () => {
      // Undo callback
      setTasks((prev) => [...prev, ...doomed]);
      for (const item of doomed) {
        await apiRequest('POST', '/api/tasks', item);
      }
    });
  };

  const reorderTask = async (draggedId: string, targetId: string, position: 'before' | 'after') => {
    const dragged = tasks.find((t) => t.id === draggedId);
    const target = tasks.find((t) => t.id === targetId);
    if (!dragged || !target || dragged.parent_id !== target.parent_id || dragged.list_id !== target.list_id) return;

    const siblings = tasks
      .filter((t) => t.list_id === dragged.list_id && (t.parent_id || null) === (dragged.parent_id || null))
      .sort((a, b) => a.sort_order - b.sort_order);

    const filtered = siblings.filter((t) => t.id !== draggedId);
    const targetIndex = filtered.findIndex((t) => t.id === targetId);
    const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;

    filtered.splice(insertIndex, 0, dragged);

    // Reassign sequential sort orders
    const updatedSiblings = filtered.map((item, index) => ({
      ...item,
      sort_order: index,
    }));

    setTasks((prev) =>
      prev.map((t) => {
        const found = updatedSiblings.find((u) => u.id === t.id);
        return found ? found : t;
      })
    );

    // Update dragged task on backend
    const updatedDragged = updatedSiblings.find((u) => u.id === draggedId);
    if (updatedDragged) {
      await apiRequest('PATCH', `/api/tasks/${draggedId}`, { sort_order: updatedDragged.sort_order });
    }
  };

  const clearCompleted = async () => {
    const inScope = tasks.filter((t) => currentView === 'all' || t.list_id === currentView);
    const completedTasks = inScope.filter((t) => t.completed_at);
    if (completedTasks.length === 0) return;

    setTasks((prev) => prev.filter((t) => !completedTasks.some((c) => c.id === t.id)));

    for (const task of completedTasks) {
      await apiRequest('DELETE', `/api/tasks/${task.id}`);
    }
    showToast(`Cleared ${completedTasks.length} completed tasks`);
  };

  const value = useMemo(
    () => ({
      user,
      lists,
      tasks,
      members,
      currentView,
      filter,
      sort,
      search,
      selectedTaskId,
      expandedTaskId,
      syncStatus,
      theme,
      toasts,
      isShareModalOpen,
      isShortcutsModalOpen,
      isMobileSidebarOpen,
      activeCount,
      setCurrentView,
      setFilter,
      setSort,
      setSearch,
      setSelectedTaskId,
      setExpandedTaskId,
      setIsShareModalOpen,
      setIsShortcutsModalOpen,
      setIsMobileSidebarOpen,
      showToast,
      cycleTheme,
      login,
      register,
      logout,
      createList,
      renameList,
      deleteList,
      shareList,
      unshareList,
      addTask,
      toggleTask,
      updateTask,
      deleteTask,
      reorderTask,
      clearCompleted,
    }),
    [
      user,
      lists,
      tasks,
      members,
      currentView,
      filter,
      sort,
      search,
      selectedTaskId,
      expandedTaskId,
      syncStatus,
      theme,
      toasts,
      isShareModalOpen,
      isShortcutsModalOpen,
      isMobileSidebarOpen,
      activeCount,
      cycleTheme,
      showToast,
    ]
  );

  return <TodoContext.Provider value={value}>{children}</TodoContext.Provider>;
};

export const useTodo = () => {
  const context = useContext(TodoContext);
  if (!context) {
    throw new Error('useTodo must be used within a TodoProvider');
  }
  return context;
};
