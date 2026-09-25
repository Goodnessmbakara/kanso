import React, { useState, useMemo } from 'react';
import { useTodo } from '../../context/TodoContext';
import { parseQuickAdd } from '../../lib/naturalLanguage';
import { Plus, Hash, AlertCircle, Calendar, Clock } from 'lucide-react';

export const QuickAdd: React.FC = () => {
  const { addTask } = useTodo();
  const [input, setInput] = useState('');

  // Live parse as user types to render intelligent preview badges
  const parsed = useMemo(() => {
    if (!input.trim()) return null;
    return parseQuickAdd(input);
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    await addTask(input);
    setInput('');
  };

  const getPriorityLabel = (p: number) => {
    switch (p) {
      case 1:
        return 'High';
      case 2:
        return 'Med';
      case 3:
        return 'Low';
      default:
        return '';
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-[#151a29] border border-slate-200/90 dark:border-[#262d42] rounded-xl shadow-xs transition-all focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 p-2 sm:p-2.5 mb-3 sm:mb-4"
    >
      <div className="flex items-center gap-2">
        <div className="text-indigo-600 dark:text-indigo-400 pl-0.5">
          <Plus className="w-5 h-5 stroke-[2.2]" />
        </div>
        <input
          id="quickadd-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add a task… (or 'n')"
          className="flex-1 bg-transparent text-base sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:cursor-not-allowed flex-shrink-0"
        >
          Add
        </button>
      </div>

      {/* Dynamic detected tokens preview */}
      {parsed && (parsed.listName || parsed.priority > 0 || parsed.date || parsed.time) && (
        <div className="flex flex-wrap items-center gap-1.5 pt-2 mt-2 border-t border-slate-100 dark:border-slate-800/80 animate-in fade-in duration-150">
          <span className="text-[11px] font-medium text-slate-400 mr-0.5">Detected:</span>

          {parsed.listName && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40">
              <Hash className="w-3 h-3" />
              {parsed.listName}
            </span>
          )}

          {parsed.priority > 0 && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                parsed.priority === 1
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/40'
                  : parsed.priority === 2
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/40'
                  : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/40'
              }`}
            >
              <AlertCircle className="w-3 h-3" />
              {getPriorityLabel(parsed.priority)}
            </span>
          )}

          {parsed.date && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
              <Calendar className="w-3 h-3" />
              {parsed.date}
            </span>
          )}

          {parsed.time && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40">
              <Clock className="w-3 h-3" />
              {parsed.time}
            </span>
          )}
        </div>
      )}
    </form>
  );
};
