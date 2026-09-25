import React, { useState } from 'react';
import { useTodo } from '../../context/TodoContext';
import { Check, Plus, Users, Sun, Moon, HelpCircle, LogOut, X } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    user,
    lists,
    members,
    currentView,
    syncStatus,
    theme,
    isMobileSidebarOpen,
    activeCount,
    setCurrentView,
    createList,
    cycleTheme,
    setIsShortcutsModalOpen,
    setIsMobileSidebarOpen,
    logout,
  } = useTodo();

  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');

  const sharedListIds = new Set(members.map((m) => m.list_id));

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    await createList(newListName.trim());
    setNewListName('');
    setIsCreatingList(false);
    setIsMobileSidebarOpen(false);
  };

  const selectList = (view: string) => {
    setCurrentView(view);
    setIsMobileSidebarOpen(false);
  };

  const getSyncDotClass = () => {
    switch (syncStatus) {
      case 'synced':
        return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]';
      case 'queued':
        return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse';
      case 'offline':
        return 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]';
    }
  };

  const getSyncTitle = () => {
    switch (syncStatus) {
      case 'synced':
        return 'Synced with edge database';
      case 'queued':
        return 'Offline changes queued for sync';
      case 'offline':
        return 'Offline — changes saved locally';
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 md:w-64 flex-shrink-0 flex flex-col h-full bg-white dark:bg-[#151a29] border-r border-slate-200/80 dark:border-[#262d42] transition-transform duration-200 ease-in-out md:static md:translate-x-0 select-none shadow-2xl md:shadow-none ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-4 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center shadow-xs">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
            <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">Kanso</span>
          </div>

          {/* Close button for mobile drawer */}
          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="md:hidden p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lists Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          <div className="flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            <span>Lists</span>
            <button
              onClick={() => setIsCreatingList(true)}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Create list"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* All tasks view */}
          <button
            onClick={() => selectList('all')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
              currentView === 'all'
                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-semibold'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <span className="truncate">All tasks</span>
            {activeCount() > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                {activeCount()}
              </span>
            )}
          </button>

          {/* Custom Lists */}
          {lists.map((list) => {
            const isActive = currentView === list.id;
            const count = activeCount(list.id);
            const isShared = sharedListIds.has(list.id);

            return (
              <button
                key={list.id}
                onClick={() => selectList(list.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer group ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isShared && (
                    <Users className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
                  )}
                  <span className="truncate">{list.name}</span>
                </div>
                {count > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                    {count}
                  </span>
                )}
              </button>
            );
          })}

          {/* Inline list creation input */}
          {isCreatingList ? (
            <form onSubmit={handleCreateList} className="px-2 pt-1">
              <input
                type="text"
                autoFocus
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsCreatingList(false);
                }}
                onBlur={() => {
                  if (!newListName.trim()) setIsCreatingList(false);
                }}
                placeholder="List name..."
                className="w-full text-sm px-3 py-2 bg-white dark:bg-[#1c2234] border border-indigo-500 rounded-xl outline-none text-slate-900 dark:text-white shadow-xs"
              />
            </form>
          ) : (
            <button
              onClick={() => setIsCreatingList(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New list</span>
            </button>
          )}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-200/80 dark:border-[#262d42] flex items-center justify-between text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2 min-w-0 flex-1 mr-2" title={getSyncTitle()}>
            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${getSyncDotClass()}`} />
            <span className="text-xs truncate font-medium text-slate-600 dark:text-slate-300">
              {user?.email}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={cycleTheme}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Toggle theme (t)"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={() => {
                setIsShortcutsModalOpen(true);
                setIsMobileSidebarOpen(false);
              }}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Keyboard shortcuts (?)"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <button
              onClick={logout}
              className="p-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
