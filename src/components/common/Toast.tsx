import React from 'react';
import { useTodo } from '../../context/TodoContext';
import { RotateCcw } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts } = useTodo();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none items-center">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-slate-900/95 dark:bg-slate-800/95 text-white px-4 py-2.5 rounded-xl shadow-xl backdrop-blur-md flex items-center gap-3 text-sm font-medium border border-white/10 animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <span>{toast.message}</span>
          {toast.undoAction && (
            <button
              onClick={() => toast.undoAction!()}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Undo
            </button>
          )}
        </div>
      ))}
    </div>
  );
};
