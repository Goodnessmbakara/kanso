import React, { useState } from 'react';
import { Task } from '../../types';
import { useTodo } from '../../context/TodoContext';
import { Trash2 } from 'lucide-react';

interface TaskEditorProps {
  task: Task;
  isSubtask?: boolean;
}

const RECUR_OPTIONS = [
  { value: '', label: 'None' },
  { value: JSON.stringify({ unit: 'day', every: 1 }), label: 'Every day' },
  { value: JSON.stringify({ unit: 'week', weekdays: [1, 2, 3, 4, 5] }), label: 'Weekdays (Mon–Fri)' },
  { value: JSON.stringify({ unit: 'week', every: 1 }), label: 'Every week' },
  { value: JSON.stringify({ unit: 'month', every: 1 }), label: 'Every month' },
];

export const TaskEditor: React.FC<TaskEditorProps> = ({ task, isSubtask = false }) => {
  const { lists, updateTask, deleteTask, setExpandedTaskId } = useTodo();

  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes || '');

  // Extract date and time
  const initialDate = task.due_at ? task.due_at.slice(0, 10) : '';
  const initialTime = task.due_at && task.due_at.includes('T') ? task.due_at.slice(11, 16) : '';

  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);
  const [priority, setPriority] = useState(task.priority);
  const [recur, setRecur] = useState(task.recur || '');
  const [listId, setListId] = useState(task.list_id);

  const saveChanges = async () => {
    let due_at: string | null = null;
    let reminder_at: string | null = null;

    if (date && time) {
      const d = new Date(`${date}T${time}:00`);
      if (!isNaN(d.getTime())) {
        due_at = d.toISOString();
        reminder_at = due_at;
      }
    } else if (date) {
      due_at = date;
    }

    const changes: Partial<Task> = {
      title: title.trim() || task.title,
      notes,
      priority,
      due_at,
      reminder_at,
      recur: recur || null,
      list_id: listId,
    };

    await updateTask(task.id, changes);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveChanges();
    setExpandedTaskId(null);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-3 bg-slate-50/90 dark:bg-[#1c2234]/90 border-t border-slate-200/80 dark:border-[#262d42] space-y-3"
    >
      <div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title"
          className="w-full text-base sm:text-sm font-medium bg-white dark:bg-[#151a29] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
        />
      </div>

      <div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes or description..."
          rows={2}
          className="w-full text-base sm:text-xs bg-white dark:bg-[#151a29] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 text-slate-900 dark:text-white resize-y"
        />
      </div>

      {/* Grid of properties: 1 column on mobile, 2 on sm, 3 on md */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
        <div>
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Due Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-white dark:bg-[#151a29] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-2 text-slate-900 dark:text-white outline-none focus:border-indigo-500 text-base sm:text-xs"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Time (Reminder)</label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full bg-white dark:bg-[#151a29] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-2 text-slate-900 dark:text-white outline-none focus:border-indigo-500 text-base sm:text-xs"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(parseInt(e.target.value, 10))}
            className="w-full bg-white dark:bg-[#151a29] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-2 text-slate-900 dark:text-white outline-none focus:border-indigo-500 cursor-pointer text-base sm:text-xs"
          >
            <option value="0">None</option>
            <option value="1">High</option>
            <option value="2">Medium</option>
            <option value="3">Low</option>
          </select>
        </div>

        {!isSubtask && (
          <>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Repeat</label>
              <select
                value={recur}
                onChange={(e) => setRecur(e.target.value)}
                className="w-full bg-white dark:bg-[#151a29] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-2 text-slate-900 dark:text-white outline-none focus:border-indigo-500 cursor-pointer text-base sm:text-xs"
              >
                {RECUR_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 md:col-span-1">
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">List</label>
              <select
                value={listId}
                onChange={(e) => setListId(e.target.value)}
                className="w-full bg-white dark:bg-[#151a29] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-2 text-slate-900 dark:text-white outline-none focus:border-indigo-500 cursor-pointer text-base sm:text-xs"
              >
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      {/* Editor Actions Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/50">
        <button
          type="button"
          onClick={() => deleteTask(task.id)}
          className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 py-1.5 px-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExpandedTaskId(null)}
            className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </form>
  );
};
