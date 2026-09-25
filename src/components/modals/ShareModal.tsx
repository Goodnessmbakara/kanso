import React, { useState } from 'react';
import { useTodo } from '../../context/TodoContext';
import { X, UserPlus, Trash2, Mail } from 'lucide-react';

export const ShareModal: React.FC = () => {
  const { lists, currentView, members, isShareModalOpen, setIsShareModalOpen, shareList, unshareList } = useTodo();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isShareModalOpen) return null;

  const currentList = lists.find((l) => l.id === currentView);
  if (!currentList) return null;

  const listMembers = members.filter((m) => m.list_id === currentList.id);

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError('');
    setIsSubmitting(true);
    try {
      await shareList(currentList.id, email.trim());
      setEmail('');
    } catch (err: any) {
      setError(err.message || 'Failed to share list');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#151a29] border border-slate-200 dark:border-[#262d42] rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Share "{currentList.name}"</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Anyone shared on this list can view and edit its tasks.
            </p>
          </div>
          <button
            onClick={() => setIsShareModalOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Share Form */}
        <form onSubmit={handleShare} className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#1c2234] border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting || !email.trim()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          {error && <p className="text-xs text-rose-500 dark:text-rose-400">{error}</p>}
        </form>

        {/* Members List */}
        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Members with access</h3>
          {listMembers.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-2">
              Not shared with anyone yet. Enter an email above to invite a collaborator.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {listMembers.map((member) => (
                <div key={member.user_id} className="flex items-center justify-between py-2 text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300">{member.email}</span>
                  <button
                    onClick={() => unshareList(currentList.id, member.user_id)}
                    className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors cursor-pointer"
                    title="Remove access"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
