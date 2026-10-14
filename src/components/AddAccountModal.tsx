import React, { useState } from 'react';
import { X, Mail, Check, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface AddAccountModalProps {
  onClose: () => void;
}

export const AddAccountModal: React.FC<AddAccountModalProps> = ({ onClose }) => {
  const { addAccount } = useApp();

  const [email, setEmail] = useState('');
  const [senderName, setSenderName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [dailyLimit, setDailyLimit] = useState(50);
  const [color, setColor] = useState('#6366f1');

  const colors = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !senderName.trim()) return;

    addAccount({
      email: email.trim().toLowerCase(),
      senderName: senderName.trim(),
      avatar: avatarUrl.trim(),
      color,
      status: 'active',
      dailyLimit: Number(dailyLimit) || 50,
      warmupScore: 99,
      provider: 'gmail',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-[#0f1423] border border-[#212b48] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1b233a] bg-[#0c101d]">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Connect Email Account</h2>
              <p className="text-xs text-zinc-400">Add an email address to send cold outreach</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#182037] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Clean Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Gmail / Google Workspace Address *
            </label>
            <input
              type="email"
              required
              placeholder="e.g. yourname@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#090d16] border border-[#1b233a] text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Your Display Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Alex Morgan"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#090d16] border border-[#1b233a] text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Daily Sending Limit
            </label>
            <input
              type="number"
              min={5}
              max={500}
              value={dailyLimit}
              onChange={(e) => setDailyLimit(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#090d16] border border-[#1b233a] text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              Recommended: 40-60 emails/day per mailbox to maintain 99%+ deliverability.
            </p>
          </div>

          {/* Avatar & Color Picker */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Avatar Image URL (Optional)
              </label>
              <input
                type="url"
                placeholder="https://... or leave empty to use initials badge"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#090d16] border border-[#1b233a] text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Avatar Accent Color
              </label>
              <div className="flex items-center gap-2">
                {colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-7 w-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      color === c ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c }}
                  >
                    {color === c && <Check className="h-3.5 w-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Avatar Preview */}
            <div className="p-3 rounded-xl bg-[#080b13] border border-[#192138] flex items-center gap-3">
              {avatarUrl.trim() ? (
                <div className="relative shrink-0">
                  <img
                    src={avatarUrl.trim()}
                    alt="Preview"
                    className="h-9 w-9 rounded-xl object-cover border border-[#232f50]"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div
                    className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-[#080b13]"
                    style={{ backgroundColor: color }}
                  />
                </div>
              ) : (
                <div
                  className="h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-sm shrink-0 border border-white/10"
                  style={{ backgroundColor: color }}
                >
                  {senderName.trim() ? senderName.trim().slice(0, 2).toUpperCase() : 'ME'}
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-white">
                  {senderName.trim() || 'Your Display Name'}
                </p>
                <p className="text-[10px] text-zinc-400">
                  {avatarUrl.trim() ? 'Custom photo avatar connected' : 'Initials badge avatar'}
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1b233a]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              Connect Mailbox
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
