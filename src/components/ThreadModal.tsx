import React, { useState } from 'react';
import { X, Send, ExternalLink, Mail, CheckCircle2, CornerDownLeft, Eye, MessageSquare } from 'lucide-react';
import { Lead } from '../types';
import { useApp } from '../context/AppContext';
import { formatFullDate, cleanWebsiteUrl, ensureValidUrl } from '../utils/templateEngine';

interface ThreadModalProps {
  lead: Lead | null;
  onClose: () => void;
  onOpenManualOutreach?: (lead: Lead) => void;
}

export const ThreadModal: React.FC<ThreadModalProps> = ({ lead, onClose, onOpenManualOutreach }) => {
  const { accounts, sendInboxReply } = useApp();
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);

  if (!lead) return null;

  const assignedAccount = accounts.find((a) => a.id === lead.assignedAccountId) || accounts[0];

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setIsSending(true);
    setTimeout(() => {
      sendInboxReply(lead.id, replyText.trim());
      setReplyText('');
      setIsSending(false);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-3xl bg-[#0f1423] border border-[#212b48] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1b233a] bg-[#0c101d]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-extrabold flex items-center justify-center text-sm shadow-md">
              {lead.firstName[0]}
              {lead.lastName?.[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  {lead.firstName} {lead.lastName}
                </h2>
                <span className="text-xs text-zinc-400 font-mono">({lead.email})</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                <span className="text-zinc-200 font-medium">{lead.companyName}</span>
                {lead.website && (
                  <>
                    <span>•</span>
                    <a
                      href={ensureValidUrl(lead.website)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-indigo-400 hover:underline"
                    >
                      <span>{cleanWebsiteUrl(lead.website)}</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </>
                )}
                <span>•</span>
                <span>
                  Mailbox: <strong className="text-white">{assignedAccount.email}</strong>
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#182037] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Message Thread History */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 bg-[#090d16]">
          {lead.history.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 space-y-2">
              <Mail className="h-8 w-8 mx-auto text-zinc-600" />
              <p className="text-sm font-medium">No emails sent yet to this lead.</p>
              <p className="text-xs">
                This lead is currently in the sequence queue ready for automated dispatch.
              </p>
            </div>
          ) : (
            lead.history.map((msg) => {
              const isOutbound = msg.direction === 'outbound';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    isOutbound ? 'items-end' : 'items-start'
                  } transition-all`}
                >
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500 px-1 mb-1">
                    <span>{isOutbound ? `You (${msg.accountEmail || assignedAccount.email})` : lead.firstName}</span>
                    <span>•</span>
                    <span>{formatFullDate(msg.timestamp)}</span>
                  </div>

                  <div
                    className={`max-w-[85%] rounded-2xl p-4 border shadow-sm ${
                      isOutbound
                        ? 'bg-indigo-600/15 border-indigo-500/30 text-indigo-100'
                        : 'bg-[#141c30] border-[#212d4a] text-zinc-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 pb-2 mb-2 border-b border-white/10 text-xs">
                      <span className="font-semibold text-zinc-300">
                        {msg.subject}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-zinc-500">
                        {msg.status}
                      </span>
                    </div>

                    <div className="text-xs leading-relaxed whitespace-pre-wrap font-sans">
                      {msg.body}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Generous Reply Composer at Bottom */}
        <form onSubmit={handleSendReply} className="p-4 border-t border-[#1b233a] bg-[#0c101d] space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Direct Reply to {lead.firstName}:</span>
            <span className="font-mono text-[11px]">from {assignedAccount.email}</span>
          </div>

          <textarea
            rows={4}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={`Type your reply to ${lead.firstName}...`}
            className="w-full px-4 py-2.5 rounded-xl bg-[#090d16] border border-[#1b233a] text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
          />

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSending || !replyText.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              <Send className={`h-3.5 w-3.5 ${isSending ? 'animate-spin' : ''}`} />
              <span>{isSending ? 'Sending...' : 'Send Direct Reply'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
