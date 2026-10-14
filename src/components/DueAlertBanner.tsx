import React, { useState } from 'react';
import { Zap, Play, ArrowRight, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const DueAlertBanner: React.FC<{ onNavigateToLeads: () => void }> = ({ onNavigateToLeads }) => {
  const {
    accounts,
    totalFollowUpsDue,
    dueCountsByAccount,
    dispatchAllDueNow,
  } = useApp();

  const [isDismissed, setIsDismissed] = useState(false);

  if (totalFollowUpsDue === 0 || isDismissed) return null;

  const dueAccountsList = accounts
    .filter((acc) => (dueCountsByAccount[acc.id] || 0) > 0)
    .map((acc) => `${acc.email.split('@')[0]} (${dueCountsByAccount[acc.id]})`)
    .join(', ');

  return (
    <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-amber-500 text-zinc-950 flex items-center justify-center shrink-0 font-bold">
            <Zap className="h-4 w-4 fill-zinc-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-300 text-sm">
                {totalFollowUpsDue} Follow-up{totalFollowUpsDue > 1 ? 's' : ''} Due to Send
              </span>
              {dueAccountsList && (
                <span className="text-zinc-400 text-xs hidden md:inline">
                  for {dueAccountsList}
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400">
              Automation will send them with random delay (2-5m), or you can dispatch them immediately.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={dispatchAllDueNow}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-colors cursor-pointer shadow-sm"
          >
            <Play className="h-3 w-3 fill-zinc-950" />
            <span>Send All Due Now</span>
          </button>

          <button
            onClick={onNavigateToLeads}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs transition-colors cursor-pointer"
          >
            <span>View Leads</span>
            <ArrowRight className="h-3 w-3" />
          </button>

          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Dismiss notice"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
