import React, { useState } from 'react';
import { Calendar, Clock, Send, X, Plus, Sparkles, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Lead } from '../types';

export const FollowUpsView: React.FC<{
  onOpenThread: (lead: Lead) => void;
}> = ({ onOpenThread }) => {
  const { leads, dispatchFollowUpForLead, forceFollowUpDueNow } = useApp();

  const [activeTab, setActiveTab] = useState<'today' | 'all'>('all');
  const [sentLeadIds, setSentLeadIds] = useState<string[]>([]);

  // Filter leads that have follow-ups scheduled and haven't bounced or replied
  const activeFollowUpLeads = leads.filter(
    (l) => l.status !== 'replied' && l.status !== 'bounced'
  );

  // Due leads
  const dueLeads = leads.filter(
    (l) =>
      l.status === 'followup_due' ||
      ((l.status === 'outreach_sent' || l.status === 'opened') &&
        l.nextFollowUpAt !== null &&
        Date.now() >= l.nextFollowUpAt)
  );

  const handleSendFollowUp = (leadId: string) => {
    setSentLeadIds((prev) => [...prev, leadId]);
    dispatchFollowUpForLead(leadId, true);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Top Header matching Screenshot 5 */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Follow-ups</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Today (Asia/Dhaka): 14 Oct 2026 · leads that replied or bounced are hidden
        </p>
      </div>

      {/* Filter Tabs matching Screenshot 5 */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveTab('today')}
          className={`px-3.5 py-1.5 rounded-xl font-medium text-xs transition-colors cursor-pointer ${
            activeTab === 'today'
              ? 'bg-purple-600 text-white font-semibold'
              : 'bg-[#121524] text-zinc-400 hover:text-white border border-[#1e2338]'
          }`}
        >
          Today ({dueLeads.length})
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`px-3.5 py-1.5 rounded-xl font-medium text-xs transition-colors cursor-pointer ${
            activeTab === 'all'
              ? 'bg-purple-600 text-white font-semibold'
              : 'bg-[#121524] text-zinc-400 hover:text-white border border-[#1e2338]'
          }`}
        >
          All active ({activeFollowUpLeads.length})
        </button>
      </div>

      {/* Due now Card matching Screenshot 5 */}
      <div className="bg-[#121524] border border-[#1d2238] rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-amber-400" />
          <h2 className="font-bold text-sm text-white">Due now</h2>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[11px] font-bold">
            {dueLeads.length}
          </span>
        </div>

        {dueLeads.length === 0 ? (
          <p className="text-xs text-zinc-500 py-2">Nothing due today.</p>
        ) : (
          <div className="space-y-3 pt-1">
            {dueLeads.map((l) => (
              <div
                key={l.id}
                className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/40 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">
                      {l.firstName} {l.lastName}
                    </span>
                    <span className="text-zinc-400 font-mono">({l.email})</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      ⚡ Overdue by &gt; 1s
                    </span>
                  </div>
                  <p className="text-zinc-400 mt-1">
                    "{l.firstName}, something about your store" · Step #2 Follow-up ready to dispatch
                  </p>
                </div>

                <button
                  onClick={() => handleSendFollowUp(l.id)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/25 transition-all cursor-pointer self-start md:self-auto"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send follow-up #1</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scheduled Card matching Screenshot 5 */}
      <div className="bg-[#121524] border border-[#1d2238] rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-purple-400" />
          <h2 className="font-bold text-sm text-white">Scheduled</h2>
          <span className="px-2 py-0.5 rounded-full bg-purple-600/20 text-purple-300 font-mono text-[11px] font-bold">
            {activeFollowUpLeads.length}
          </span>
        </div>

        {/* Prospect Scheduled Cards matching Screenshot 5 */}
        <div className="space-y-3.5">
          {activeFollowUpLeads.map((lead) => {
            const isOpened = lead.openedCount > 0;
            const isSent = sentLeadIds.includes(lead.id);

            return (
              <div
                key={lead.id}
                className="p-4 rounded-xl bg-[#0e101c] border border-[#1a1e30] space-y-3 text-xs hover:border-[#242b45] transition-colors"
              >
                {/* Header line: Rudy rudy@burgeonoutdoor.com [Opened] [• Opened] */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-sm">
                        {lead.firstName} {lead.lastName}
                      </span>
                      <span className="text-zinc-400 font-mono">{lead.email}</span>

                      {/* Status badge: Sent or Opened */}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          lead.status === 'opened' || isOpened
                            ? 'bg-purple-950/50 text-purple-300 border border-purple-800/50'
                            : 'bg-cyan-950/40 text-cyan-400 border border-cyan-800/50'
                        }`}
                      >
                        {lead.status === 'opened' || isOpened ? 'Opened' : 'Sent'}
                      </span>
                    </div>

                    {/* Subline matching screenshot */}
                    <p className="text-zinc-400 mt-1 text-[11px]">
                      "{lead.firstName}, something about your store" · sent 12 Oct 2026, 10:09 pm · 0 follow-ups sent
                    </p>
                  </div>

                  {/* Right Action Button matching Screenshot 5 */}
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-zinc-500 font-mono mb-1">
                      Next: 15 Oct 2026, 8:00 pm
                    </p>
                    <button
                      onClick={() => handleSendFollowUp(lead.id)}
                      disabled={isSent}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all cursor-pointer"
                    >
                      <Send className="h-3 w-3" />
                      <span>{isSent ? 'Sent!' : 'Send follow-up #1'}</span>
                    </button>
                  </div>
                </div>

                {/* Steps Pills matching Screenshot 5 */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {[
                    { num: 1, date: '15 Oct 2026, 8:00 pm' },
                    { num: 2, date: '17 Oct 2026, 8:00 pm' },
                    { num: 3, date: '19 Oct 2026, 8:00 pm' },
                    { num: 4, date: '22 Oct 2026, 8:00 pm' },
                  ].map((step) => (
                    <span
                      key={step.num}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#141727] border border-[#20253d] text-zinc-300 font-mono text-[11px]"
                    >
                      <span>#{step.num} {step.date}</span>
                      <button
                        type="button"
                        className="text-zinc-500 hover:text-red-400"
                        title="Remove step"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Quick Add Follow-up Chips matching Screenshot 5 */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] pt-1 border-t border-[#161a2c]">
                  <span className="text-zinc-500 mr-1">Add follow-up:</span>
                  {[
                    { label: '+1 min', onClick: () => forceFollowUpDueNow(lead.id) },
                    { label: '+1 hour', onClick: () => {} },
                    { label: '+3 days', onClick: () => {} },
                    { label: '+5 days', onClick: () => {} },
                    { label: '+7 days', onClick: () => {} },
                    { label: 'Custom date & time', onClick: () => {} },
                  ].map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={chip.onClick}
                      className="px-2 py-0.5 rounded-md bg-[#131728] hover:bg-[#1a2036] border border-[#1f243a] text-zinc-400 hover:text-white transition-colors cursor-pointer text-[10px]"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
