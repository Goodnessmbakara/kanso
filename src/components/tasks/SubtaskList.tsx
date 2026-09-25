import React, { useState } from 'react';
import { Task } from '../../types';
import { useTodo } from '../../context/TodoContext';
import { Plus, Check, Trash2 } from 'lucide-react';

interface SubtaskListProps {
  parentId: string;
  subtasks: Task[];
}

export const SubtaskList: React.FC<SubtaskListProps> = ({ parentId, subtasks }) => {
  const { addTask, toggleTask, deleteTask } = useTodo();
  const [subtaskTitle, setSubtaskTitle] = useState('');

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subtaskTitle.trim()) return;
    await addTask(subtaskTitle.trim(), parentId);
    setSubtaskTitle('');
  };

  return (
    <div className="pl-9 pr-3 pb-3 space-y-1.5 border-t border-slate-100 dark:border-slate-800/60 pt-2">
      {/* Existing subtasks */}
      {subtasks.map((subtask) => {
        const isCompleted = Boolean(subtask.completed_at);
        return (
          <div
            key={subtask.id}
            className="flex items-center justify-between group/sub py-1 px-2 rounded-lg hover:bg-slate-100/60 dark:hover:bg-slate-800/40 text-xs"
          >
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <button
                type="button"
                onClick={() => toggleTask(subtask.id)}
                className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                  isCompleted
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'border-slate-300 dark:border-slate-600 hover:border-indigo-500'
                }`}
              >
                {isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
              </button>
              <span
                className={`truncate ${
                  isCompleted
                    ? 'line-through text-slate-400 dark:text-slate-500'
                    : 'text-slate-700 dark:text-slate-200'
                }`}
              >
                {subtask.title}
              </span>
            </div>

            <button
              onClick={() => deleteTask(subtask.id)}
              className="opacity-0 group-hover/sub:opacity-100 p-1 text-slate-400 hover:text-rose-500 rounded transition-all cursor-pointer"
              title="Delete subtask"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        );
      })}

      {/* Add subtask input */}
      <form onSubmit={handleAddSubtask} className="flex items-center gap-2 pt-1">
        <Plus className="w-3.5 h-3.5 text-slate-400" />
        <input
          type="text"
          value={subtaskTitle}
          onChange={(e) => setSubtaskTitle(e.target.value)}
          placeholder="Add subtask..."
          className="flex-1 text-xs bg-transparent text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none"
        />
      </form>
    </div>
  );
};
