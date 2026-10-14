import React, { useState } from 'react';
import { Send, Calendar, Clock, X, Plus, Sparkles, Check, ChevronDown, Mail } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface FollowUpScheduleItem {
  id: string;
  stepNumber: number;
  delayAmount: number;
  delayUnit: 'minutes' | 'hours' | 'days';
  time: string;
}

export const ComposeView: React.FC<{ onNavigateToLeads: () => void }> = ({ onNavigateToLeads }) => {
  const { accounts, selectedAccountIdFilter, sendManualOutreach, addLead } = useApp();

  const [selectedAccountId, setSelectedAccountId] = useState(
    (selectedAccountIdFilter && selectedAccountIdFilter !== 'all'
      ? selectedAccountIdFilter
      : accounts[0]?.id) || accounts[0]?.id || ''
  );

  const currentAccount =
    accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  const [isSenderDropdownOpen, setIsSenderDropdownOpen] = useState(false);

  const [toEmail, setToEmail] = useState('jane@company.com');
  const [clientName, setClientName] = useState('Jane');
  const [companyName, setCompanyName] = useState('Acme Inc.');
  const [websiteLink, setWebsiteLink] = useState('https://acme.com');
  const [subject, setSubject] = useState('Quick question about Acme Inc.');
  const [body, setBody] = useState(`Hi Jane,

I came across Acme Inc. via acme.com and was really impressed by your team's expansion.

Are you looking to scale your store's customer acquisition this quarter?

Best,
${currentAccount?.senderName || 'Sifat'}`);

  const [followUpSteps, setFollowUpSteps] = useState<FollowUpScheduleItem[]>([
    { id: 'f-1', stepNumber: 1, delayAmount: 1, delayUnit: 'minutes', time: '10:00 pm' }, // 1 minute follow up support!
    { id: 'f-2', stepNumber: 2, delayAmount: 3, delayUnit: 'days', time: '08:00 pm' },
    { id: 'f-3', stepNumber: 3, delayAmount: 5, delayUnit: 'days', time: '08:00 pm' },
  ]);

  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const addFollowUpStep = () => {
    const nextNum = followUpSteps.length + 1;
    setFollowUpSteps((prev) => [
      ...prev,
      {
        id: 'f-' + Date.now(),
        stepNumber: nextNum,
        delayAmount: nextNum * 2,
        delayUnit: 'days',
        time: '08:00 pm',
      },
    ]);
  };

  const removeFollowUpStep = (id: string) => {
    setFollowUpSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const updateFollowUpStep = (id: string, updates: Partial<FollowUpScheduleItem>) => {
    setFollowUpSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toEmail.trim() || !clientName.trim()) return;

    setIsSending(true);

    // Create lead and send 1st manual outreach
    const newLeadId = 'lead-' + Date.now();
    addLead({
      firstName: clientName,
      lastName: '',
      email: toEmail,
      companyName,
      website: websiteLink,
      title: 'Executive',
      status: 'ready_for_outreach',
      assignedAccountId: currentAccount.id,
      sequenceId: 'seq-default',
    });

    setTimeout(() => {
      sendManualOutreach(newLeadId, currentAccount.id, subject, body);
      setIsSending(false);
      setSentSuccess(true);
      setTimeout(() => {
        onNavigateToLeads();
      }, 900);
    }, 600);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Top Header matching Screenshot 3 */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Compose &amp; Send</h1>
        <p className="text-xs text-zinc-400 mt-1">
          A tracking pixel is added automatically to every email.
        </p>
      </div>

      {sentSuccess ? (
        <div className="p-8 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-emerald-500 text-zinc-950 mx-auto flex items-center justify-center font-bold">
            <Check className="h-6 w-6" />
          </div>
          <h2 className="text-base font-bold text-white">Initial Outreach Sent!</h2>
          <p className="text-xs text-zinc-300">
            Follow-up sequence activated for {clientName} ({toEmail}). Redirecting to Leads...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSend} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Compose Fields + Expanded Body + Send Button */}
          <div className="lg:col-span-7 space-y-4">
            {/* FROM (CUSTOM HIGH-END DROPDOWN SELECTOR) */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  FROM
                </label>
                {currentAccount && (
                  <span className="text-[11px] text-zinc-500 font-mono">
                    {currentAccount.dailyLimit - currentAccount.sentToday} sends remaining today
                  </span>
                )}
              </div>

              {/* Trigger Button */}
              <button
                type="button"
                onClick={() => setIsSenderDropdownOpen((prev) => !prev)}
                className={`w-full px-3.5 py-2.5 rounded-xl bg-[#121524] border transition-all flex items-center justify-between cursor-pointer text-left ${
                  isSenderDropdownOpen
                    ? 'border-purple-500 ring-2 ring-purple-500/20 shadow-lg'
                    : 'border-[#1e2338] hover:border-[#2d3552]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="h-6 w-6 rounded-lg flex items-center justify-center font-bold text-xs text-white shadow-sm shrink-0"
                    style={{ backgroundColor: currentAccount?.color || '#a855f7' }}
                  >
                    {currentAccount?.senderName?.charAt(0) || 'G'}
                  </div>
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-sm font-semibold text-white">
                      {currentAccount?.senderName}
                    </span>
                    <span className="text-xs text-zinc-400 font-mono">
                      &lt;{currentAccount?.email}&gt;
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 ml-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-purple-950/50 text-purple-300 border border-purple-800/40">
                    {currentAccount ? `${currentAccount.sentToday}/${currentAccount.dailyLimit} sent` : ''}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-zinc-400 transition-transform duration-200 ${
                      isSenderDropdownOpen ? 'rotate-180 text-purple-400' : ''
                    }`}
                  />
                </div>
              </button>

              {/* Backdrop to close on outside click */}
              {isSenderDropdownOpen && (
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setIsSenderDropdownOpen(false)}
                />
              )}

              {/* Floating Custom Dropdown Menu */}
              {isSenderDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-[#101322] border border-[#232942] rounded-2xl shadow-2xl shadow-black/80 p-1.5 space-y-1 backdrop-blur-md animate-fade-in">
                  <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                    Select Sending Mailbox
                  </div>
                  {accounts.map((acc) => {
                    const isSelected = acc.id === currentAccount?.id;
                    const remaining = acc.dailyLimit - acc.sentToday;
                    return (
                      <button
                        type="button"
                        key={acc.id}
                        onClick={() => {
                          setSelectedAccountId(acc.id);
                          setIsSenderDropdownOpen(false);
                          setBody((prev) => {
                            const oldName = currentAccount?.senderName;
                            if (oldName && prev.endsWith(oldName)) {
                              return prev.slice(0, prev.length - oldName.length) + acc.senderName;
                            }
                            return prev;
                          });
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all duration-150 cursor-pointer border-2 ${
                          isSelected
                            ? 'border-[var(--accent)] bg-[rgba(91,141,239,0.08)] text-white shadow-[0_0_0_1px_rgba(91,141,239,0.2)]'
                            : 'hover:bg-white/[0.03] text-zinc-300 border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="h-7 w-7 rounded-lg flex items-center justify-center font-bold text-xs text-white shadow-sm shrink-0"
                            style={{ backgroundColor: acc.color }}
                          >
                            {acc.senderName.charAt(0)}
                          </div>
                          <div className="truncate">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs text-white">{acc.senderName}</span>
                              <span className="text-[11px] text-zinc-400 font-mono">
                                &lt;{acc.email}&gt;
                              </span>
                            </div>
                            <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                              Daily quota: {acc.sentToday} / {acc.dailyLimit} sent · {remaining} remaining
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* TO Field */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                TO
              </label>
              <input
                type="email"
                required
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#121524] border border-[#1e2338] text-sm text-white focus:outline-none focus:border-purple-500 transition-colors font-mono"
              />
            </div>

            {/* 3 Columns Row: CLIENT NAME | COMPANY NAME | WEBSITE LINK */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  CLIENT NAME
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#121524] border border-[#1e2338] text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  COMPANY NAME
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#121524] border border-[#1e2338] text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  WEBSITE LINK
                </label>
                <input
                  type="text"
                  required
                  value={websiteLink}
                  onChange={(e) => setWebsiteLink(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#121524] border border-[#1e2338] text-sm text-white focus:outline-none focus:border-purple-500 transition-colors font-mono"
                />
              </div>
            </div>

            {/* SUBJECT */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                SUBJECT
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#121524] border border-[#1e2338] text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            {/* BODY (Expanded down more) */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                BODY
              </label>
              <textarea
                rows={14}
                required
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#121524] border border-[#1e2338] text-sm text-white focus:outline-none focus:border-purple-500 transition-colors resize-y min-h-[320px] leading-relaxed"
              />
            </div>

            {/* Submit button: named only "Send" */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-zinc-500 font-mono">
                Sender: <span className="text-zinc-300 font-medium">{currentAccount?.email}</span>
              </span>
              <button
                type="submit"
                disabled={isSending}
                className="flex items-center gap-2 px-7 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
              >
                {isSending ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Send</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Follow-ups for this lead */}
          <div className="lg:col-span-5 bg-[#121524] border border-[#1e2338] rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-400" />
              <h3 className="font-bold text-sm text-white">
                Follow-ups for this lead
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-purple-600/30 text-purple-300 font-mono text-[11px] font-bold">
                {followUpSteps.length}
              </span>
              <span className="text-[11px] text-zinc-400">default from Settings</span>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Only applies to this email. Each one becomes due at its time, you get a reminder, and it's sent as a reply in the same thread. Times are Asia/Dhaka.
            </p>

            {/* Dynamic Step Rows matching Screenshot 3 */}
            <div className="space-y-2.5 pt-1">
              {followUpSteps.map((step) => (
                <div
                  key={step.id}
                  className="p-3 rounded-xl bg-[#0e101c] border border-[#1a1e30] space-y-2 text-xs hover:border-[#242b45] transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-zinc-400 font-bold text-xs">#{step.stepNumber}</span>
                      <input
                        type="number"
                        min={1}
                        max={90}
                        value={step.delayAmount}
                        onChange={(e) =>
                          updateFollowUpStep(step.id, {
                            delayAmount: Math.max(1, Number(e.target.value)),
                          })
                        }
                        className="w-14 px-2 py-1 rounded-lg bg-[#141727] border border-[#21263d] text-white font-mono text-center focus:outline-none text-xs"
                      />
                      <select
                        value={step.delayUnit}
                        onChange={(e) =>
                          updateFollowUpStep(step.id, { delayUnit: e.target.value as any })
                        }
                        className="px-2 py-1 rounded-lg bg-[#141727] border border-[#21263d] text-white focus:outline-none cursor-pointer text-xs"
                      >
                        <option value="minutes">minute(s) later</option>
                        <option value="hours">hour(s) later</option>
                        <option value="days">days later</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFollowUpStep(step.id)}
                      className="p-1 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                      title="Remove follow up step"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-zinc-400 font-mono text-[11px] pt-1 border-t border-[#161a2c]">
                    <div className="flex items-center gap-1 text-zinc-500">
                      <Clock className="h-3 w-3" />
                      <span>{step.time}</span>
                    </div>
                    <span className="text-purple-300/80 font-medium">
                      {step.delayAmount} {step.delayUnit} later
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addFollowUpStep}
              className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-semibold pt-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add follow-up step</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
