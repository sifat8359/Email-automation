import React, { useState } from 'react';
import { Search, ExternalLink, Sparkles, Eye, Plus, Send } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Lead } from '../types';
import { cleanWebsiteUrl, ensureValidUrl } from '../utils/templateEngine';

export const LeadsView: React.FC<{
  onOpenThread: (lead: Lead) => void;
  onNavigateToCompose: () => void;
}> = ({ onOpenThread, onNavigateToCompose }) => {
  const { leads, simulateLeadReply, simulateLeadOpen } = useApp();

  const [activeFilter, setActiveFilter] = useState<'all' | 'sent' | 'opened' | 'replied' | 'bounced' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Counts matching leads
  const totalCount = leads.length;
  const openedCount = leads.filter((l) => l.status === 'opened' || (l.openedCount > 0 && l.status === 'outreach_sent')).length;
  const sentCount = leads.filter((l) => l.status === 'outreach_sent' && l.openedCount === 0).length;
  const repliedCount = leads.filter((l) => l.status === 'replied').length;
  const bouncedCount = leads.filter((l) => l.status === 'bounced').length;
  const pendingCount = leads.filter((l) => l.status !== 'replied' && l.status !== 'bounced').length;

  const filteredLeads = leads.filter((l) => {
    if (activeFilter === 'sent' && (l.status !== 'outreach_sent' || l.openedCount > 0)) return false;
    if (activeFilter === 'opened' && !(l.status === 'opened' || (l.openedCount > 0 && l.status === 'outreach_sent'))) return false;
    if (activeFilter === 'replied' && l.status !== 'replied') return false;
    if (activeFilter === 'bounced' && l.status !== 'bounced') return false;
    if (activeFilter === 'pending' && (l.status === 'replied' || l.status === 'bounced')) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        l.firstName.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.companyName.toLowerCase().includes(q) ||
        l.website.toLowerCase().includes(q)
      );
    }

    return true;
  });

  const renderStatusBadge = (status: string, openedCount: number = 0) => {
    if (status === 'replied') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/50 text-emerald-400 border border-emerald-800/50">
          Replied
        </span>
      );
    }
    if (status === 'bounced') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-950/50 text-red-400 border border-red-800/50">
          Bounced
        </span>
      );
    }
    if (status === 'followup_due') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950/50 text-amber-400 border border-amber-800/50">
          Follow-up Due
        </span>
      );
    }
    if (status === 'opened' || (openedCount > 0 && status === 'outreach_sent')) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-950/50 text-purple-300 border border-purple-800/50">
          Opened
        </span>
      );
    }
    if (status === 'ready_for_outreach') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
          Ready
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-950/40 text-cyan-400 border border-cyan-800/50">
        Sent
      </span>
    );
  };

  return (
    <div className="space-y-5 animate-fade-in max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Leads</h1>
          <p className="text-xs text-zinc-400 mt-1">
            {leads.length} total · Click any lead to view full sent email history &amp; follow-ups
          </p>
        </div>

        <button
          onClick={onNavigateToCompose}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md shadow-purple-600/25 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Lead &amp; Outreach</span>
        </button>
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'all', label: `All ${totalCount}` },
            { id: 'sent', label: `Sent ${sentCount}` },
            { id: 'opened', label: `Opened ${openedCount}` },
            { id: 'replied', label: `Replied ${repliedCount}` },
            { id: 'bounced', label: `Bounced ${bouncedCount}` },
            { id: 'pending', label: `Pending Follow-up ${pendingCount}` },
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => setActiveFilter(chip.id as any)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer text-xs ${
                activeFilter === chip.id
                  ? 'bg-purple-600 text-white font-semibold shadow-sm'
                  : 'bg-[#121524] text-zinc-400 hover:text-white border border-[#1e2338]'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search name or email"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#121524] border border-[#1e2338] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Main Leads Table */}
      <div className="bg-[#121524] border border-[#1d2238] rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#1b2034] bg-[#0f111e] text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                <th className="py-3 px-3.5">NAME</th>
                <th className="py-3 px-3.5">EMAIL</th>
                <th className="py-3 px-3.5">COMPANY</th>
                <th className="py-3 px-3.5">WEBSITE</th>
                <th className="py-3 px-3.5">SENT</th>
                <th className="py-3 px-3.5">SUBJECT</th>
                <th className="py-3 px-3.5">STATUS</th>
                <th className="py-3 px-3.5">FOLLOW-UPS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#181d30]">
              {filteredLeads.map((l) => {
                return (
                  <tr
                    key={l.id}
                    onClick={() => onOpenThread(l)}
                    className="hover:bg-[#161a2e] transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-3.5 font-medium text-white whitespace-nowrap">
                      {l.firstName} {l.lastName}
                    </td>

                    <td className="py-3 px-3.5 text-zinc-400 font-mono text-[11px] whitespace-nowrap">
                      {l.email}
                    </td>

                    <td className="py-3 px-3.5 text-zinc-200 font-medium whitespace-nowrap">
                      {l.companyName}
                    </td>

                    <td className="py-3 px-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <a
                        href={ensureValidUrl(l.website)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 hover:underline font-mono text-[11px]"
                      >
                        {cleanWebsiteUrl(l.website)}
                      </a>
                    </td>

                    <td className="py-3 px-3.5 text-zinc-400 text-[11px] whitespace-nowrap">
                      13 Oct 2026, 10:09 pm
                    </td>

                    <td className="py-3 px-3.5 text-zinc-300 truncate max-w-[200px]">
                      {l.firstName}, something about your store
                    </td>

                    <td className="py-3 px-3.5 whitespace-nowrap">
                      {renderStatusBadge(l.status, l.openedCount)}
                    </td>

                    <td className="py-3 px-3.5 text-zinc-400 text-[11px] whitespace-nowrap font-mono">
                      0/4 sent · next 16 Oct
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
