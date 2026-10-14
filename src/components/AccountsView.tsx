import React, { useState } from 'react';
import {
  Mail,
  Plus,
  Check,
  Edit2,
  Trash2,
  Pause,
  Play,
  RotateCcw,
  Zap,
  Flame,
  ShieldCheck,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GmailAccount } from '../types';

export const AccountsView: React.FC<{ onOpenAddAccount: () => void }> = ({ onOpenAddAccount }) => {
  const {
    accounts,
    dueCountsByAccount,
    replyCountsByAccount,
    updateAccount,
    deleteAccount,
  } = useApp();

  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editLimitValue, setEditLimitValue] = useState<number>(50);
  const [editSentTodayValue, setEditSentTodayValue] = useState<number>(0);
  const [editAvatarUrl, setEditAvatarUrl] = useState<string>('');

  const startEditing = (acc: GmailAccount) => {
    setEditingAccountId(acc.id);
    setEditLimitValue(acc.dailyLimit);
    setEditSentTodayValue(acc.sentToday);
    setEditAvatarUrl(acc.avatar || '');
  };

  const saveEditing = (accId: string) => {
    updateAccount(accId, {
      dailyLimit: Math.max(1, Number(editLimitValue)),
      sentToday: Math.max(0, Number(editSentTodayValue)),
      avatar: editAvatarUrl.trim(),
    });
    setEditingAccountId(null);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0f1423] border border-[#1b233a] rounded-2xl p-5 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Email Accounts & Warmup</h1>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Deliverability Center
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Connected sending mailboxes for your cold outreach campaigns. The scheduler automatically balances volume across accounts.
          </p>
        </div>

        <button
          onClick={onOpenAddAccount}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Connect New Account</span>
        </button>
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((acc) => {
          const isEditing = editingAccountId === acc.id;
          const percentage = Math.min(100, Math.round((acc.sentToday / acc.dailyLimit) * 100));

          return (
            <div
              key={acc.id}
              className="bg-[#0f1423] border border-[#1d263f] hover:border-[#283556] rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4 transition-all"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#182037]">
                  <div className="flex items-center gap-3">
                    {acc.avatar && acc.avatar.trim() !== '' ? (
                      <div className="relative shrink-0">
                        <img
                          src={acc.avatar}
                          alt={acc.senderName}
                          className="h-10 w-10 rounded-xl object-cover border border-[#232f50] shadow-md"
                        />
                        <div
                          className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-[#0f1423]"
                          style={{ backgroundColor: acc.color }}
                        />
                      </div>
                    ) : (
                      <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center font-extrabold text-sm text-white shrink-0 shadow-md border border-white/10"
                        style={{ backgroundColor: acc.color }}
                      >
                        {acc.senderName ? acc.senderName.slice(0, 2).toUpperCase() : acc.email.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-sm text-white leading-tight">{acc.senderName}</h3>
                      <p className="text-xs text-zinc-400 font-mono mt-0.5">{acc.email}</p>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 ${
                      acc.status === 'active'
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    }`}
                  >
                    <div
                      className={`h-1.5 w-1.5 rounded-full ${
                        acc.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
                      }`}
                    />
                    <span>{acc.status}</span>
                  </span>
                </div>

                {/* Warmup Health & Stats */}
                <div className="grid grid-cols-2 gap-2 my-3">
                  <div className="p-2.5 rounded-xl bg-[#090d16] border border-[#1b233a]">
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-semibold uppercase">
                      <Flame className="h-3 w-3 text-amber-400" />
                      <span>Warmup Score</span>
                    </div>
                    <p className="text-base font-extrabold text-emerald-400 mt-1">
                      {acc.warmupScore || 100}%
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#090d16] border border-[#1b233a]">
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-semibold uppercase">
                      <ShieldCheck className="h-3 w-3 text-indigo-400" />
                      <span>Provider</span>
                    </div>
                    <p className="text-base font-extrabold text-white mt-1 capitalize">
                      {acc.provider}
                    </p>
                  </div>
                </div>

                {/* Daily limit progress bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Sent Today: <strong>{acc.sentToday}</strong> / {acc.dailyLimit}</span>
                    <span className="font-semibold">{percentage}%</span>
                  </div>
                  <div className="w-full bg-[#141b2c] h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        percentage >= 90 ? 'bg-amber-500' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                {/* Inline Edit Form */}
                {isEditing && (
                  <div className="mt-3 p-3 rounded-xl bg-[#090d16] border border-indigo-500/40 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-zinc-400 uppercase font-semibold block">Sent Today</label>
                        <input
                          type="number"
                          value={editSentTodayValue}
                          onChange={(e) => setEditSentTodayValue(Number(e.target.value))}
                          className="w-full px-2 py-1 rounded bg-[#121829] border border-[#1e2740] text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-400 uppercase font-semibold block">Daily Limit</label>
                        <input
                          type="number"
                          value={editLimitValue}
                          onChange={(e) => setEditLimitValue(Number(e.target.value))}
                          className="w-full px-2 py-1 rounded bg-[#121829] border border-[#1e2740] text-xs text-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 uppercase font-semibold block">Avatar URL (Optional)</label>
                      <input
                        type="url"
                        placeholder="https://... or empty for initials"
                        value={editAvatarUrl}
                        onChange={(e) => setEditAvatarUrl(e.target.value)}
                        className="w-full px-2 py-1 rounded bg-[#121829] border border-[#1e2740] text-xs text-white placeholder-zinc-500"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => setEditingAccountId(null)}
                        className="px-2 py-1 text-xs text-zinc-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => saveEditing(acc.id)}
                        className="px-2.5 py-1 rounded bg-indigo-600 text-white text-xs font-semibold"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-[#182037] text-xs">
                <button
                  onClick={() =>
                    updateAccount(acc.id, {
                      status: acc.status === 'active' ? 'paused' : 'active',
                    })
                  }
                  className="text-zinc-400 hover:text-white flex items-center gap-1"
                >
                  {acc.status === 'active' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  <span>{acc.status === 'active' ? 'Pause' : 'Resume'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEditing(acc)}
                    className="p-1 rounded text-zinc-400 hover:text-white"
                    title="Edit limits"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>

                  {accounts.length > 1 && (
                    <button
                      onClick={() => {
                        if (confirm(`Remove account ${acc.email}?`)) {
                          deleteAccount(acc.id);
                        }
                      }}
                      className="p-1 rounded text-zinc-500 hover:text-rose-400"
                      title="Remove account"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
