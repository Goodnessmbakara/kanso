import React from 'react';
import { useTodo } from '../../context/TodoContext';
import { X } from 'lucide-react';

export const ShortcutsModal: React.FC = () => {
  const { isShortcutsModalOpen, setIsShortcutsModalOpen } = useTodo();

  if (!isShortcutsModalOpen) return null;

  const shortcuts = [
    { key: 'n', desc: 'Add task' },
    { key: '/', desc: 'Search tasks' },
    { key: 'j / k', desc: 'Move selection down / up' },
    { key: 'x', desc: 'Toggle complete' },
    { key: 'e / Enter', desc: 'Edit selected task' },
    { key: 'd', desc: 'Delete selected task' },
    { key: 't', desc: 'Toggle theme (dark/light)' },
    { key: '?', desc: 'Keyboard shortcuts help' },
    { key: 'Esc', desc: 'Close modal or collapse editor' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#151a29] border border-slate-200 dark:border-[#262d42] rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Keyboard shortcuts</h2>
          <button
            onClick={() => setIsShortcutsModalOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <table className="w-full text-xs">
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {shortcuts.map((s) => (
              <tr key={s.key} className="py-2">
                <td className="py-2 text-slate-600 dark:text-slate-300 font-medium">{s.desc}</td>
                <td className="py-2 text-right">
                  <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[11px] font-mono text-slate-700 dark:text-slate-300 shadow-2xs">
                    {s.key}
                  </kbd>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Quick add: </span>
          Supports <b className="text-indigo-600 dark:text-indigo-400">#list</b>,{' '}
          <b className="text-rose-600 dark:text-rose-400">!1–!3</b> priority,{' '}
          <b className="text-purple-600 dark:text-purple-400">@9am</b> time, and dates like{' '}
          <b className="text-emerald-600 dark:text-emerald-400">tomorrow</b>, <b>friday</b>, <b>in 3 days</b>, <b>dec 25</b>.
        </div>
      </div>
    </div>
  );
};
