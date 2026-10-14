import React, { useState } from 'react';
import { X, Send, Sparkles, Eye, Code, ExternalLink, Check, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Lead } from '../types';
import { renderTemplate } from '../utils/templateEngine';

interface ManualOutreachModalProps {
  lead: Lead | null;
  onClose: () => void;
}

export const ManualOutreachModal: React.FC<ManualOutreachModalProps> = ({ lead, onClose }) => {
  const { accounts, sequence, sendManualOutreach } = useApp();

  if (!lead) return null;

  const step1 = sequence.steps[0] || {
    subject: 'Quick question about {{companyName}} customer acquisition',
    body: 'Hi {{firstName}},\n\nI was checking out {{website}} and noticed {{companyName}}...\n\nBest,\n{{senderName}}',
    delayAmount: 1,
    delayUnit: 'minutes',
  };

  const initialAccount = accounts.find((a) => a.id === lead.assignedAccountId) || accounts[0];

  const [selectedAccountId, setSelectedAccountId] = useState(initialAccount.id);
  const activeAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  const [subject, setSubject] = useState(() => renderTemplate(step1.subject, lead, activeAccount));
  const [body, setBody] = useState(() => renderTemplate(step1.body, lead, activeAccount));
  const [isPreview, setIsPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // When sender account changes, optionally refresh senderName in template
  const handleAccountChange = (newAccId: string) => {
    setSelectedAccountId(newAccId);
    const newAcc = accounts.find((a) => a.id === newAccId) || accounts[0];
    setSubject(renderTemplate(step1.subject, lead, newAcc));
    setBody(renderTemplate(step1.body, lead, newAcc));
  };

  const handleSend = () => {
    setIsSending(true);
    setTimeout(() => {
      sendManualOutreach(lead.id, selectedAccountId, subject, body);
      setIsSending(false);
      onClose();
    }, 600);
  };

  const insertVariable = (variable: string) => {
    setBody((prev) => prev + ` ${variable}`);
  };

  const nextStep = sequence.steps[1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Step 1: Manual First Outreach
              </span>
              <span className="text-xs text-zinc-400">Review &amp; Personalize</span>
            </div>
            <h2 className="text-lg font-bold text-white mt-1">
              Send Manual Outreach to {lead.firstName} {lead.lastName}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Lead Summary Info */}
        <div className="px-6 py-3 bg-zinc-950/60 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">Prospect:</span>
            <span className="font-semibold text-white">{lead.email}</span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-300 font-medium">{lead.companyName}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-400">Website:</span>
            <a
              href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 hover:underline"
            >
              <span>{lead.website.replace(/^https?:\/\//, '')}</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Body Editor */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Sender Gmail Account Selection */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Send From Gmail Mailbox:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => handleAccountChange(acc.id)}
                  className={`flex items-start gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedAccountId === acc.id
                      ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-sm shadow-indigo-500/10'
                      : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:bg-zinc-800/50'
                  }`}
                >
                  <div
                    className="h-2.5 w-2.5 rounded-full shrink-0 mt-1"
                    style={{ backgroundColor: acc.color }}
                  />
                  <div className="truncate">
                    <p className="font-semibold text-xs truncate text-zinc-200">{acc.senderName}</p>
                    <p className="text-[11px] text-zinc-400 truncate">{acc.email}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                      {acc.sentToday}/{acc.dailyLimit} today
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quick variable injector chips */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-zinc-400">Insert Dynamic Tag:</span>
              <button
                type="button"
                onClick={() => setIsPreview(!isPreview)}
                className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer"
              >
                {isPreview ? <Code className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                <span>{isPreview ? 'Back to Editor' : 'Live Preview'}</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['{{firstName}}', '{{companyName}}', '{{website}}', '{{title}}', '{{senderName}}'].map(
                (v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVariable(v)}
                    className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-mono border border-zinc-700 cursor-pointer"
                  >
                    + {v}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Subject Line */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Subject Line:
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Body Content */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Email Body:
            </label>
            {isPreview ? (
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 whitespace-pre-line min-h-[160px]">
                {body}
              </div>
            ) : (
              <textarea
                rows={7}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-indigo-500 font-sans transition-colors resize-none"
              />
            )}
          </div>

          {/* Next Follow-up Automation Notice */}
          <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-xs text-indigo-300 flex items-start gap-2.5">
            <Sparkles className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Automated Follow-up Will Activate Next:</p>
              <p className="text-zinc-300 mt-0.5">
                Once you send this first manual outreach, Step 2 follow-up will automatically schedule for{' '}
                <span className="font-semibold text-amber-300">
                  {nextStep?.delayAmount || 1} {nextStep?.delayUnit || 'minute(s)'}
                </span>{' '}
                with condition trigger:{' '}
                <span className="text-white font-mono bg-zinc-900 px-1 py-0.5 rounded">
                  {nextStep?.triggerCondition || 'if no reply'}
                </span>
                . If due, the system alerts you and auto-dispatches using randomized delivery jitter.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-900/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSend}
            disabled={isSending || !subject.trim() || !body.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSending ? (
              <>
                <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Sending via {activeAccount.email}...</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Send Manual Outreach Now</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
