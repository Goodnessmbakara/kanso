import React, { useState } from 'react';
import { useTodo } from '../../context/TodoContext';
import { FilterType, SortType } from '../../types';
import { Pencil, Users, Trash2, Search, WifiOff, Menu, Hash } from 'lucide-react';

export const Header: React.FC = () => {
  const {
    user,
    lists,
    currentView,
    filter,
    sort,
    search,
    syncStatus,
    members,
    setFilter,
    setSort,
    setSearch,
    setCurrentView,
    renameList,
    deleteList,
    setIsShareModalOpen,
    setIsMobileSidebarOpen,
  } = useTodo();

  const [isRenaming, setIsRenaming] = useState(false);
  const currentList = lists.find((l) => l.id === currentView);
  const [renameValue, setRenameValue] = useState(currentList?.name || '');

  const isOwner = currentList && currentList.owner_id === user?.id;
  const listMembers = currentList ? members.filter((m) => m.list_id === currentList.id) : [];

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentList || !renameValue.trim()) return;
    await renameList(currentList.id, renameValue.trim());
    setIsRenaming(false);
  };

  const handleDelete = () => {
    if (!currentList) return;
    if (window.confirm(`Delete list "${currentList.name}" and all its tasks?`)) {
      deleteList(currentList.id);
    }
  };

  return (
    <div className="flex flex-col border-b border-slate-200/80 dark:border-[#262d42] bg-white/80 dark:bg-[#151a29]/80 backdrop-blur-md sticky top-0 z-20 transition-colors">
      {/* Offline notification banner */}
      {syncStatus === 'offline' && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs px-3 sm:px-6 py-1.5 flex items-center justify-center gap-1.5 font-medium text-center">
          <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">Offline mode — changes saved locally and will auto-sync.</span>
        </div>
      )}

      {/* Title & Actions Row */}
      <div className="flex items-center justify-between px-3 sm:px-6 pt-3.5 sm:pt-5 pb-2 sm:pb-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile hamburger menu toggle */}
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="md:hidden p-2 -ml-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          {isRenaming && currentList ? (
            <form onSubmit={handleRenameSubmit} className="flex items-center gap-2">
              <input
                type="text"
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => {
                  if (renameValue.trim()) handleRenameSubmit({ preventDefault: () => {} } as any);
                  else setIsRenaming(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsRenaming(false);
                }}
                className="text-lg sm:text-2xl font-bold bg-white dark:bg-[#1c2234] border border-indigo-500 rounded-lg px-2.5 py-0.5 outline-none text-slate-900 dark:text-white"
              />
            </form>
          ) : (
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight truncate">
              {currentList ? currentList.name : 'All tasks'}
            </h1>
          )}

          {currentList && listMembers.length > 0 && (
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[11px] sm:text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer flex-shrink-0"
            >
              <Users className="w-3 h-3" />
              <span>{listMembers.length} shared</span>
            </button>
          )}
        </div>

        {/* List actions */}
        {currentList && (
          <div className="flex items-center gap-0.5 text-slate-500 dark:text-slate-400 flex-shrink-0">
            <button
              onClick={() => {
                setRenameValue(currentList.name);
                setIsRenaming(true);
              }}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Rename list"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Share list"
            >
              <Users className="w-4 h-4" />
            </button>
            {isOwner && (
              <button
                onClick={handleDelete}
                className="p-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                title="Delete list"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Mobile Horizontal Quick List Bar (Swipeable chips like reference app) */}
      <div className="md:hidden px-3 pb-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setCurrentView('all')}
          className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
            currentView === 'all'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
          }`}
        >
          All tasks
        </button>
        {lists.map((l) => (
          <button
            key={l.id}
            onClick={() => setCurrentView(l.id)}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
              currentView === l.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Hash className="w-3 h-3 opacity-60" />
            <span>{l.name}</span>
          </button>
        ))}
      </div>

      {/* Toolbar Row: Tabs, Search, Sort */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 px-3 sm:px-6 pb-3">
        {/* Filter Tabs */}
        <div className="flex items-center bg-slate-100 dark:bg-[#1c2234] p-0.5 rounded-lg justify-between sm:justify-start">
          {(['all', 'active', 'done'] as FilterType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`flex-1 sm:flex-none px-3 py-1 text-xs font-semibold rounded-md capitalize transition-all cursor-pointer text-center ${
                filter === tab
                  ? 'bg-white dark:bg-[#151a29] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-1 sm:max-w-md justify-between sm:justify-end">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="search-input"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full text-base sm:text-xs pl-8 pr-7 py-1.5 bg-slate-100 dark:bg-[#1c2234] border border-transparent focus:border-indigo-500 rounded-lg outline-none text-slate-900 dark:text-white placeholder:text-slate-400 transition-colors"
            />
            {!search && (
              <span className="hidden sm:inline-block absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono px-1 py-0.5 bg-white dark:bg-[#151a29] border border-slate-200 dark:border-slate-700 rounded text-slate-400">
                /
              </span>
            )}
          </div>

          {/* Sort Selector */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortType)}
            className="text-xs py-1.5 px-2 bg-slate-100 dark:bg-[#1c2234] border border-transparent focus:border-indigo-500 rounded-lg text-slate-700 dark:text-slate-300 outline-none cursor-pointer flex-shrink-0"
          >
            <option value="manual">Manual</option>
            <option value="due">Due date</option>
            <option value="priority">Priority</option>
            <option value="newest">Newest</option>
          </select>
        </div>
      </div>
    </div>
  );
};
