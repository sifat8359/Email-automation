import React, { useState } from 'react';
import { X, Mail, Plus, Check, Edit2, RotateCcw, Power } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface AccountSwitcherModalProps {
  onClose: () => void;
  onOpenAddAccount: () => void;
}

export const AccountSwitcherModal: React.FC<AccountSwitcherModalProps> = ({
  onClose,
  onOpenAddAccount,
}) => {
  const {
    accounts,
    selectedAccountIdFilter,
    setSelectedAccountIdFilter,
    updateAccount,
  } = useApp();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [limitVal, setLimitVal] = useState<number>(50);
  const [sentVal, setSentVal] = useState<number>(0);

  const startEdit = (acc: any) => {
    setEditingId(acc.id);
    setLimitVal(acc.dailyLimit);
    setSentVal(acc.sentToday);
  };

  const saveEdit = (id: string) => {
    updateAccount(id, {
      dailyLimit: Math.max(1, Number(limitVal)),
      sentToday: Math.max(0, Number(sentVal)),
    });
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-[#0f1423] border border-[#212b48] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1b233a] bg-[#0c101d]">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Outreach Sending Mailboxes</h2>
              <p className="text-[11px] text-zinc-400">Select active sender or edit daily quotas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#182037] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Account list */}
        <div className="p-4 space-y-2.5 max-h-[60vh] overflow-y-auto">
          {accounts.map((acc) => {
            const isSelected = selectedAccountIdFilter === acc.id;
            const isEditing = editingId === acc.id;

            return (
              <div
                key={acc.id}
                className={`p-3.5 rounded-[12px] border-2 transition-all duration-150 ${
                  isSelected
                    ? 'bg-[rgba(91,141,239,0.08)] border-[var(--accent)] shadow-[0_0_0_1px_rgba(91,141,239,0.2)]'
                    : 'bg-[#171B22] border-[var(--border)] hover:border-zinc-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    className="flex items-center gap-2.5 cursor-pointer flex-1"
                    onClick={() => setSelectedAccountIdFilter(acc.id)}
                  >
                    <div
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: acc.color }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-white leading-tight">
                          {acc.senderName}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 font-mono mt-0.5">{acc.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() =>
                        updateAccount(acc.id, {
                          status: acc.status === 'active' ? 'paused' : 'active',
                        })
                      }
                      className={`p-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                        acc.status === 'active'
                          ? 'text-emerald-400 hover:bg-emerald-950/40'
                          : 'text-zinc-500 hover:bg-zinc-800'
                      }`}
                      title={acc.status === 'active' ? 'Account Active (click to pause)' : 'Account Paused'}
                    >
                      <Power className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={() => startEdit(acc)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1a233b] cursor-pointer"
                      title="Edit quota"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <div className="mt-3 pt-3 border-t border-[#1e2740] space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-[10px] text-zinc-400 block mb-1">Sent Today</label>
                        <input
                          type="number"
                          value={sentVal}
                          onChange={(e) => setSentVal(Number(e.target.value))}
                          className="w-full px-2 py-1 rounded bg-[#090d16] border border-[#222d4a] text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-400 block mb-1">Daily Limit</label>
                        <input
                          type="number"
                          value={limitVal}
                          onChange={(e) => setLimitVal(Number(e.target.value))}
                          className="w-full px-2 py-1 rounded bg-[#090d16] border border-[#222d4a] text-white"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-2 py-1 text-xs text-zinc-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => saveEdit(acc.id)}
                        className="px-2.5 py-1 rounded bg-indigo-600 text-white text-xs font-semibold"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-zinc-400 pt-2 border-t border-[#182035]">
                    <span>
                      Sent: <strong className="text-zinc-200">{acc.sentToday}</strong> / {acc.dailyLimit}
                    </span>
                    <button
                      onClick={() => updateAccount(acc.id, { sentToday: 0 })}
                      className="text-zinc-500 hover:text-indigo-400 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Reset today</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1b233a] bg-[#0c101d] flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              onOpenAddAccount();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Connect Account</span>
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
