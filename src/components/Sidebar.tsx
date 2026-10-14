import React from 'react';
import {
  Rocket,
  Inbox,
  Settings,
  Mail,
  Database,
  AtSign,
  Zap,
  Activity,
  Layers,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAccountSwitcher: () => void;
  isLightMode: boolean;
  setIsLightMode: (val: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenAccountSwitcher,
}) => {
  const { campaigns, accounts, leads, selectedAccountIdFilter, supabaseConfig, automation } = useApp();

  const currentAccount =
    accounts.find((a) => a.id === selectedAccountIdFilter) || accounts[0];

  const activeCampaignsCount = campaigns.filter((c) => c.status === 'active').length;
  const unreadRepliesCount = leads.filter((l) => l.status === 'replied').length;

  const navItems = [
    {
      id: 'campaigns',
      label: 'Campaigns',
      icon: Rocket,
      badge: activeCampaignsCount > 0 ? `${activeCampaignsCount}` : undefined,
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
    },
    {
      id: 'inbox',
      label: 'Unibox',
      icon: Inbox,
      badge: unreadRepliesCount > 0 ? `${unreadRepliesCount}` : undefined,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    },
    {
      id: 'accounts',
      label: 'Email Accounts',
      icon: AtSign,
      badge: `${accounts.length}`,
      badgeColor: 'bg-zinc-800 text-zinc-400 border border-zinc-700',
    },
    {
      id: 'settings',
      label: 'Settings & DB',
      icon: Settings,
      badge: supabaseConfig.isConnected ? 'Live' : undefined,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    },
  ];

  return (
    <aside className="w-64 bg-[#0a0d17] border-r border-[#1a2238] flex flex-col justify-between p-4 shrink-0 hidden md:flex min-h-screen select-none">
      <div className="space-y-6">
        {/* Brand Header: Authentic Instantly Style */}
        <div className="flex items-center gap-3 px-2 pt-1">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-600/30 text-white font-extrabold text-base">
            <Zap className="h-5 w-5 fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-sm text-white tracking-tight leading-snug">
                INSTANTLY
              </h1>
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">Cold Outreach Automation</p>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#121829]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : item.badgeColor
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Real-time Schedule Window Status Pill */}
        <div className="mx-1 p-3 rounded-xl bg-[#0f1424] border border-[#1d2742] space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-zinc-300 flex items-center gap-1.5">
              <div
                className={`h-2 w-2 rounded-full ${
                  automation.isInScheduleWindow ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span>{automation.isInScheduleWindow ? 'Sending Window Active' : 'Outside Window'}</span>
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">8am - 10pm</span>
          </div>
          <p className="text-[10px] text-zinc-400 leading-tight">
            Automated throttle engine checks queue every 3s within active window.
          </p>
        </div>

        {/* Database Status Pill */}
        <div
          onClick={() => setActiveTab('settings')}
          className="mx-1 p-3 rounded-xl bg-[#0f1424] border border-[#1d2742] flex items-center gap-2.5 cursor-pointer hover:border-indigo-500/50 transition-colors"
        >
          <Database className={`h-4 w-4 ${supabaseConfig.isConnected ? 'text-emerald-400' : 'text-zinc-500'}`} />
          <div className="truncate flex-1">
            <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">DATABASE</p>
            <p className="text-[11px] text-zinc-200 font-medium truncate">
              {supabaseConfig.isConnected ? 'Supabase Connected' : 'Local + Supabase ready'}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="space-y-2.5 pt-4 border-t border-[#1a233b]">
        {/* Account Pill in bottom-left */}
        <button
          onClick={onOpenAccountSwitcher}
          className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#12182b] hover:bg-[#182038] border border-[#1f2a47] transition-colors cursor-pointer text-left"
          title="Click to switch or manage sender accounts"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: currentAccount?.color || '#6366f1' }}
            />
            <div className="truncate min-w-0">
              <p className="text-xs font-semibold text-zinc-200 truncate">
                {currentAccount?.senderName || 'Sender'}
              </p>
              <p className="font-mono text-[10px] text-zinc-400 truncate">
                {currentAccount?.email || 'No account'}
              </p>
            </div>
          </div>
          <span className="text-[10px] text-indigo-400 font-bold shrink-0">Switch</span>
        </button>
      </div>
    </aside>
  );
};
