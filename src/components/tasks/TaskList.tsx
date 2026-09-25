import React, { useState, useMemo } from 'react';
import { useTodo } from '../../context/TodoContext';
import { TaskItem } from './TaskItem';
import { Task } from '../../types';
import { CheckCircle2 } from 'lucide-react';

export const TaskList: React.FC = () => {
  const { tasks, currentView, filter, sort, search, reorderTask, clearCompleted } = useTodo();

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);

  // Filter root tasks (parent_id is null)
  const visibleTasks = useMemo(() => {
    const inScope = tasks.filter(
      (t) => !t.parent_id && (currentView === 'all' || t.list_id === currentView)
    );

    const query = search.trim().toLowerCase();
    const matchesSearch = (t: Task) => {
      if (!query) return true;
      if (t.title.toLowerCase().includes(query)) return true;
      if (t.notes && t.notes.toLowerCase().includes(query)) return true;
      // Search in subtasks as well
      const children = tasks.filter((c) => c.parent_id === t.id);
      return children.some(
        (c) => c.title.toLowerCase().includes(query) || (c.notes && c.notes.toLowerCase().includes(query))
      );
    };

    let result = inScope.filter((t) => {
      if (filter === 'active' && t.completed_at) return false;
      if (filter === 'done' && !t.completed_at) return false;
      return matchesSearch(t);
    });

    // Sorting
    if (sort === 'due') {
      const nullsLast = (t: Task) => t.due_at || '9999-99-99';
      result = [...result].sort((a, b) => nullsLast(a).localeCompare(nullsLast(b)));
    } else if (sort === 'priority') {
      result = [...result].sort((a, b) => {
        const prioA = a.priority === 0 ? 99 : a.priority;
        const prioB = b.priority === 0 ? 99 : b.priority;
        return prioA - prioB || a.sort_order - b.sort_order;
      });
    } else if (sort === 'newest') {
      result = [...result].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    } else {
      // Manual
      result = [...result].sort((a, b) => a.sort_order - b.sort_order || (a.created_at || '').localeCompare(b.created_at || ''));
    }

    return result;
  }, [tasks, currentView, filter, sort, search]);

  // Statistics for footer
  const stats = useMemo(() => {
    const scope = tasks.filter((t) => !t.parent_id && (currentView === 'all' || t.list_id === currentView));
    const done = scope.filter((t) => t.completed_at).length;
    const active = scope.length - done;
    return { active, done };
  }, [tasks, currentView]);

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', id);
    } catch {}
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const isBefore = e.clientY < rect.top + rect.height / 2;
    setDropTargetId(targetId);
    setDropPosition(isBefore ? 'before' : 'after');
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId || !dropPosition) return;
    reorderTask(draggedId, targetId, dropPosition);
    setDraggedId(null);
    setDropTargetId(null);
    setDropPosition(null);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Tasks List */}
      <div className="flex-1 overflow-y-auto">
        {visibleTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 dark:text-slate-500">
            <CheckCircle2 className="w-12 h-12 stroke-[1.2] mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Nothing here yet</p>
            <p className="text-xs text-slate-400 mt-1">Add your first task above to get started.</p>
          </div>
        ) : (
          visibleTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              dropPosition={dropTargetId === task.id ? dropPosition : null}
            />
          ))
        )}
      </div>

      {/* List Footer */}
      <div className="flex items-center justify-between pt-3 pb-4 border-t border-slate-200/80 dark:border-[#262d42] text-xs text-slate-500 dark:text-slate-400">
        <span>
          {stats.active} active · {stats.done} completed
        </span>

        {stats.done > 0 && (
          <button
            onClick={clearCompleted}
            className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Clear completed
          </button>
        )}
      </div>
    </div>
  );
};
