import React from 'react';
import { Task } from '../../types';
import { useTodo } from '../../context/TodoContext';
import { TaskEditor } from './TaskEditor';
import { SubtaskList } from './SubtaskList';
import { Check, GripVertical, Repeat, Bell, ChevronRight, Hash } from 'lucide-react';

interface TaskItemProps {
  task: Task;
  onDragStart?: (e: React.DragEvent, taskId: string) => void;
  onDragOver?: (e: React.DragEvent, taskId: string) => void;
  onDrop?: (e: React.DragEvent, taskId: string) => void;
  dropPosition?: 'before' | 'after' | null;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onDragStart,
  onDragOver,
  onDrop,
  dropPosition,
}) => {
  const {
    tasks,
    lists,
    currentView,
    sort,
    selectedTaskId,
    expandedTaskId,
    toggleTask,
    setSelectedTaskId,
    setExpandedTaskId,
  } = useTodo();

  const isCompleted = Boolean(task.completed_at);
  const isExpanded = expandedTaskId === task.id;
  const isSelected = selectedTaskId === task.id;
  const canDrag = sort === 'manual' && currentView !== 'all';

  const subtasks = tasks.filter((t) => t.parent_id === task.id);
  const completedSubtasksCount = subtasks.filter((t) => t.completed_at).length;

  const currentList = lists.find((l) => l.id === task.list_id);

  // Smart due date formatting
  const renderDueBadge = () => {
    if (!task.due_at) return null;
    const isDateOnly = task.due_at.length === 10;
    const due = isDateOnly ? new Date(task.due_at + 'T12:00:00') : new Date(task.due_at);
    if (isNaN(due.getTime())) return null;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDate = new Date(due.getFullYear(), due.getMonth(), due.getDate());

    const diffDays = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let label = '';
    if (diffDays === 0) label = 'Today';
    else if (diffDays === 1) label = 'Tomorrow';
    else if (diffDays === -1) label = 'Yesterday';
    else {
      label = due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }

    if (!isDateOnly) {
      label += `, ${due.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
    }

    const isOverdue = !isCompleted && (isDateOnly ? diffDays < 0 : due < now);

    return (
      <span
        className={`text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-md font-medium inline-flex items-center gap-1 ${
          isOverdue
            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold'
            : diffDays === 0
            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
        }`}
      >
        {label}
      </span>
    );
  };

  const getPriorityBadge = () => {
    switch (task.priority) {
      case 1:
        return (
          <span className="text-[10px] sm:text-[11px] font-bold text-rose-600 dark:text-rose-400 px-1 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40" title="High Priority">
            !!!
          </span>
        );
      case 2:
        return (
          <span className="text-[10px] sm:text-[11px] font-bold text-amber-600 dark:text-amber-400 px-1 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40" title="Medium Priority">
            !!
          </span>
        );
      case 3:
        return (
          <span className="text-[10px] sm:text-[11px] font-bold text-blue-600 dark:text-blue-400 px-1 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40" title="Low Priority">
            !
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      draggable={canDrag}
      onDragStart={(e) => onDragStart && onDragStart(e, task.id)}
      onDragOver={(e) => onDragOver && onDragOver(e, task.id)}
      onDrop={(e) => onDrop && onDrop(e, task.id)}
      className={`group bg-white dark:bg-[#151a29] border border-slate-200/80 dark:border-[#262d42] rounded-xl overflow-hidden transition-all duration-150 mb-2 relative ${
        isSelected ? 'ring-2 ring-indigo-500/40' : ''
      } ${dropPosition === 'before' ? 'border-t-2 border-t-indigo-500' : ''} ${
        dropPosition === 'after' ? 'border-b-2 border-b-indigo-500' : ''
      }`}
    >
      {/* Main Task Row */}
      <div
        onClick={() => {
          setSelectedTaskId(task.id);
          setExpandedTaskId(isExpanded ? null : task.id);
        }}
        className="flex items-start sm:items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 cursor-pointer select-none"
      >
        {/* Checkbox with generous touch area */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleTask(task.id);
          }}
          className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer flex-shrink-0 mt-0.5 sm:mt-0 ${
            isCompleted
              ? 'bg-indigo-600 border-indigo-600 text-white'
              : 'border-slate-300 dark:border-slate-600 hover:border-indigo-500 bg-white dark:bg-[#151a29]'
          }`}
        >
          {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
        </button>

        {/* Drag handle (desktop only) */}
        {canDrag && (
          <span className="hidden sm:inline-block opacity-0 group-hover:opacity-100 text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 cursor-grab">
            <GripVertical className="w-4 h-4" />
          </span>
        )}

        {/* Title */}
        <div className="flex-1 min-w-0 pr-1">
          <span
            className={`text-sm font-medium break-words ${
              isCompleted
                ? 'line-through text-slate-400 dark:text-slate-500'
                : 'text-slate-800 dark:text-slate-100'
            }`}
          >
            {task.title}
          </span>
        </div>

        {/* Metadata Badges */}
        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 flex-shrink-0 justify-end">
          {getPriorityBadge()}

          {task.recur && (
            <span className="text-slate-400 dark:text-slate-500 p-0.5" title="Recurring task">
              <Repeat className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </span>
          )}

          {task.reminder_at && (
            <span className="text-indigo-500 dark:text-indigo-400 p-0.5" title="Reminder set">
              <Bell className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </span>
          )}

          {/* Subtasks counter */}
          {subtasks.length > 0 && (
            <span className="text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
              {completedSubtasksCount}/{subtasks.length}
            </span>
          )}

          {renderDueBadge()}

          {/* List chip in "All tasks" view */}
          {currentView === 'all' && currentList && (
            <span className="hidden sm:inline-flex text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium items-center gap-1">
              <Hash className="w-3 h-3 text-slate-400" />
              {currentList.name}
            </span>
          )}

          <ChevronRight
            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 transition-transform duration-200 ${
              isExpanded ? 'rotate-90' : ''
            }`}
          />
        </div>
      </div>

      {/* Expanded Editor Form */}
      {isExpanded && <TaskEditor task={task} />}

      {/* Subtasks Section */}
      {(subtasks.length > 0 || isExpanded) && (
        <SubtaskList parentId={task.id} subtasks={subtasks} />
      )}
    </div>
  );
};
