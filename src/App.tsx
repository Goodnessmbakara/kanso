import React, { useEffect } from 'react';
import { useTodo } from './context/TodoContext';
import { AuthScreen } from './components/auth/AuthScreen';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { QuickAdd } from './components/tasks/QuickAdd';
import { TaskList } from './components/tasks/TaskList';
import { ShareModal } from './components/modals/ShareModal';
import { ShortcutsModal } from './components/modals/ShortcutsModal';
import { ToastContainer } from './components/common/Toast';

export const AppContent: React.FC = () => {
  const {
    user,
    tasks,
    currentView,
    selectedTaskId,
    expandedTaskId,
    isShareModalOpen,
    isShortcutsModalOpen,
    isMobileSidebarOpen,
    setSelectedTaskId,
    setExpandedTaskId,
    setIsShareModalOpen,
    setIsShortcutsModalOpen,
    setIsMobileSidebarOpen,
    toggleTask,
    deleteTask,
    cycleTheme,
  } = useTodo();

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in form controls
      const target = e.target as HTMLElement;
      const isInput = target.matches('input, textarea, select') || target.isContentEditable;

      if (isInput) {
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Filter visible root tasks for keyboard traversal
      const inScope = tasks.filter(
        (t) => !t.parent_id && (currentView === 'all' || t.list_id === currentView)
      );
      const flatList = inScope.flatMap((t) => [t, ...tasks.filter((c) => c.parent_id === t.id)]);
      const currentIndex = flatList.findIndex((t) => t.id === selectedTaskId);
      const selectedTask = currentIndex >= 0 ? flatList[currentIndex] : null;

      switch (e.key) {
        case '/': {
          e.preventDefault();
          document.getElementById('search-input')?.focus();
          break;
        }
        case 'n': {
          e.preventDefault();
          document.getElementById('quickadd-input')?.focus();
          break;
        }
        case 'j':
        case 'ArrowDown': {
          e.preventDefault();
          const next = flatList[currentIndex + 1] || flatList[0];
          if (next) setSelectedTaskId(next.id);
          break;
        }
        case 'k':
        case 'ArrowUp': {
          e.preventDefault();
          const prev = flatList[currentIndex - 1] || flatList[flatList.length - 1];
          if (prev) setSelectedTaskId(prev.id);
          break;
        }
        case 'x': {
          if (selectedTask) {
            e.preventDefault();
            toggleTask(selectedTask.id);
          }
          break;
        }
        case 'e':
        case 'Enter': {
          if (selectedTask) {
            e.preventDefault();
            setExpandedTaskId(expandedTaskId === selectedTask.id ? null : selectedTask.id);
          }
          break;
        }
        case 'd': {
          if (selectedTask) {
            e.preventDefault();
            deleteTask(selectedTask.id);
          }
          break;
        }
        case 't': {
          e.preventDefault();
          cycleTheme();
          break;
        }
        case '?': {
          e.preventDefault();
          setIsShortcutsModalOpen(true);
          break;
        }
        case 'Escape': {
          if (isShareModalOpen) setIsShareModalOpen(false);
          else if (isShortcutsModalOpen) setIsShortcutsModalOpen(false);
          else if (isMobileSidebarOpen) setIsMobileSidebarOpen(false);
          else if (expandedTaskId) setExpandedTaskId(null);
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    tasks,
    currentView,
    selectedTaskId,
    expandedTaskId,
    isShareModalOpen,
    isShortcutsModalOpen,
    isMobileSidebarOpen,
    setSelectedTaskId,
    setExpandedTaskId,
    setIsShareModalOpen,
    setIsShortcutsModalOpen,
    setIsMobileSidebarOpen,
    toggleTask,
    deleteTask,
    cycleTheme,
  ]);

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f4f5fa] dark:bg-[#0b0f1a] transition-colors">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#f4f5fa] dark:bg-[#0b0f1a]">
        <Header />

        <div className="flex-1 flex flex-col min-h-0 px-3 sm:px-6 pt-3 sm:pt-5 max-w-4xl w-full mx-auto overflow-y-auto">
          <QuickAdd />
          <TaskList />
        </div>
      </main>

      <ShareModal />
      <ShortcutsModal />
      <ToastContainer />
    </div>
  );
};
