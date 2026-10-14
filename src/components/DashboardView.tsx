import React from 'react';
import {
  RotateCw,
  Send,
  MessageSquare,
  Mail,
  Eye,
  Calendar,
  TrendingUp,
  Percent,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Lead } from '../types';

export const DashboardView: React.FC<{
  setActiveTab: (tab: string) => void;
  onOpenThread: (lead: Lead) => void;
}> = ({ setActiveTab, onOpenThread }) => {
  const { leads, totalFollowUpsDue, dispatchAllDueNow } = useApp();

  // Metrics matching Screenshot 1
  const totalSent = leads.filter((l) => l.status !== 'ready_for_outreach').length;
  const replied = leads.filter((l) => l.status === 'replied').length;
  const bounced = leads.filter((l) => l.status === 'bounced').length;
  const opened = leads.filter((l) => l.openedCount > 0).length;
  const pendingFollowUps = leads.filter(
    (l) => l.status === 'outreach_sent' || l.status === 'opened' || l.status === 'followup_due'
  ).length;

  const replyRate = totalSent > 0 ? Math.round((replied / totalSent) * 100) : 0;
  const openRate = totalSent > 0 ? ((opened / totalSent) * 100).toFixed(1) : '0';

  // Recent 10 leads for table
  const recentLeads = leads.slice(0, 10);

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Top Header matching Screenshot 1 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Replies and bounces are checked automatically every minute · times in Asia/Dhaka
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => dispatchAllDueNow()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#121626] hover:bg-[#181d32] border border-[#1e2338] text-xs font-semibold text-zinc-200 transition-colors cursor-pointer"
          >
            <RotateCw className="h-3.5 w-3.5 text-zinc-400" />
            <span>Sync now</span>
          </button>

          <button
            onClick={() => setActiveTab('compose')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md shadow-purple-600/25 transition-all cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
            <span>New email</span>
          </button>
        </div>
      </div>

      {/* 7 Metric Cards in Grid matching Screenshot 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3.5">
        {/* TOTAL SENT */}
        <div className="bg-[#121524] border border-[#1d2238] rounded-2xl p-4 flex flex-col justify-between min-h-[105px]">
          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            <span>TOTAL SENT</span>
            <div className="h-6 w-6 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center">
              <Send className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mt-2 font-sans">{totalSent}</div>
        </div>

        {/* REPLIED */}
        <div className="bg-[#121524] border border-[#1d2238] rounded-2xl p-4 flex flex-col justify-between min-h-[105px]">
          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            <span>REPLIED</span>
            <div className="h-6 w-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <MessageSquare className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mt-2 font-sans">{replied}</div>
        </div>

        {/* BOUNCED */}
        <div className="bg-[#121524] border border-[#1d2238] rounded-2xl p-4 flex flex-col justify-between min-h-[105px]">
          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            <span>BOUNCED</span>
            <div className="h-6 w-6 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center">
              <Mail className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mt-2 font-sans">{bounced}</div>
        </div>

        {/* OPENED */}
        <div className="bg-[#121524] border border-[#1d2238] rounded-2xl p-4 flex flex-col justify-between min-h-[105px]">
          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            <span>OPENED</span>
            <div className="h-6 w-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Eye className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mt-2 font-sans">{opened}</div>
        </div>

        {/* PENDING FOLLOW-UPS */}
        <div className="bg-[#121524] border border-[#1d2238] rounded-2xl p-4 flex flex-col justify-between min-h-[105px]">
          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            <span>PENDING FOLLOW-UPS</span>
            <div className="h-6 w-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Calendar className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mt-2 font-sans">{pendingFollowUps}</div>
        </div>

        {/* REPLY RATE */}
        <div className="bg-[#121524] border border-[#1d2238] rounded-2xl p-4 flex flex-col justify-between min-h-[105px]">
          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            <span>REPLY RATE</span>
            <div className="h-6 w-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mt-2 font-sans">{replyRate}%</div>
        </div>

        {/* OPEN RATE */}
        <div className="bg-[#121524] border border-[#1d2238] rounded-2xl p-4 flex flex-col justify-between min-h-[105px]">
          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            <span>OPEN RATE</span>
            <div className="h-6 w-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Percent className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mt-2 font-sans">{openRate}%</div>
        </div>
      </div>

      {/* Recent activity card matching Screenshot 1 */}
      <div className="bg-[#121524] border border-[#1d2238] rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#1b2034]">
          <h2 className="text-sm font-bold text-white tracking-tight">Recent activity</h2>
          <button
            onClick={() => setActiveTab('leads')}
            className="text-xs text-purple-400 hover:text-purple-300 font-medium cursor-pointer"
          >
            View all
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#1b2034] text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                <th className="py-2.5 px-3">NAME</th>
                <th className="py-2.5 px-3">EMAIL</th>
                <th className="py-2.5 px-3">SENT</th>
                <th className="py-2.5 px-3">SUBJECT</th>
                <th className="py-2.5 px-3">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#181d30]">
              {recentLeads.map((l) => {
                const getStatusBadge = (status: string, openedCount: number = 0) => {
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
                  return (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-950/40 text-cyan-400 border border-cyan-800/50">
                      Sent
                    </span>
                  );
                };

                return (
                  <tr
                    key={l.id}
                    onClick={() => onOpenThread(l)}
                    className="hover:bg-[#171b2e] transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-3 font-medium text-white">{l.firstName}</td>
                    <td className="py-3 px-3 text-zinc-400 font-mono text-[11px]">{l.email}</td>
                    <td className="py-3 px-3 text-zinc-400 text-[11px]">
                      13 Oct 2026, 10:09 pm
                    </td>
                    <td className="py-3 px-3 text-zinc-300 truncate max-w-[240px]">
                      {l.firstName}, something about your store
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {getStatusBadge(l.status, l.openedCount)}
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
