import React from 'react';
import {
  Rocket,
  Inbox,
  Settings,
  AtSign,
  Zap,
  Database,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAccountSwitcher: () => void;
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
      badgeVariant: 'accent' as const,
    },
    {
      id: 'inbox',
      label: 'Unibox',
      icon: Inbox,
      badge: unreadRepliesCount > 0 ? `${unreadRepliesCount}` : undefined,
      badgeVariant: 'success' as const,
    },
    {
      id: 'accounts',
      label: 'Email accounts',
      icon: AtSign,
      badge: `${accounts.length}`,
      badgeVariant: 'muted' as const,
    },
    {
      id: 'settings',
      label: 'Settings & database',
      icon: Settings,
      badge: supabaseConfig.isConnected ? 'Live' : undefined,
      badgeVariant: 'success' as const,
    },
  ];

  return (
    <aside className="w-64 bg-[var(--surface)] border-r border-[var(--border)] flex flex-col justify-between p-4 shrink-0 hidden md:flex min-h-screen select-none">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 pt-1">
          <div className="h-9 w-9 rounded-[10px] bg-[var(--accent)] text-[#0E1116] flex items-center justify-center font-bold text-sm">
            <Zap className="h-4 w-4 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                Instantly
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-[8px] bg-[rgba(91,141,239,0.12)] text-[var(--accent)]">
                Pro
              </span>
            </div>
            <p className="text-[13px] text-[var(--text-secondary)]">Outreach automation</p>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-[10px] text-sm font-medium transition-colors duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-[var(--accent)] text-[#0E1116]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-xs font-medium tabular-nums px-2 py-0.5 rounded-[8px] ${
                      isActive
                        ? 'bg-[#0E1116]/20 text-[#0E1116]'
                        : item.badgeVariant === 'success'
                        ? 'bg-[rgba(52,211,153,0.12)] text-[var(--success)]'
                        : item.badgeVariant === 'accent'
                        ? 'bg-[rgba(91,141,239,0.12)] text-[var(--accent)]'
                        : 'bg-[rgba(138,147,163,0.12)] text-[var(--muted)]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sending window status card */}
        <div className="app-card space-y-2 p-3.5">
          <div className="flex items-center justify-between text-[13px]">
            <span className="font-medium text-[var(--text-primary)] flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  automation.isInScheduleWindow ? 'bg-[var(--success)]' : 'bg-[var(--warning)]'
                }`}
              />
              <span>{automation.isInScheduleWindow ? 'Sending window active' : 'Outside window'}</span>
            </span>
            <span className="text-[12px] text-[var(--text-secondary)] tabular-nums">8am - 10pm</span>
          </div>
          <p className="text-[13px] text-[var(--text-secondary)] leading-snug">
            Automated throttle engine checks queue every 3s within active window.
          </p>
        </div>

        {/* Database status card */}
        <div
          onClick={() => setActiveTab('settings')}
          className="app-card flex items-center gap-3 cursor-pointer hover:border-[var(--accent)] transition-colors"
        >
          <Database className={`h-4 w-4 shrink-0 ${supabaseConfig.isConnected ? 'text-[var(--success)]' : 'text-[var(--muted)]'}`} />
          <div className="truncate flex-1">
            <p className="text-[13px] font-medium text-[var(--text-primary)] leading-tight">Database</p>
            <p className="text-[12px] text-[var(--text-secondary)] truncate mt-0.5">
              {supabaseConfig.isConnected ? 'Supabase connected' : 'Local + Supabase ready'}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="pt-4 border-t border-[var(--border)]">
        {/* Account Pill in bottom-left */}
        <button
          onClick={onOpenAccountSwitcher}
          className="w-full flex items-center justify-between p-2.5 rounded-[10px] bg-transparent hover:bg-white/[0.04] border border-[var(--border)] transition-colors duration-150 cursor-pointer text-left"
          title="Click to switch or manage sender accounts"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: currentAccount?.color || 'var(--accent)' }}
            />
            <div className="truncate min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                {currentAccount?.senderName || 'Sender'}
              </p>
              <p className="text-[12px] text-[var(--text-secondary)] truncate">
                {currentAccount?.email || 'No account'}
              </p>
            </div>
          </div>
          <span className="text-xs text-[var(--accent)] font-medium shrink-0 ml-2">Switch</span>
        </button>
      </div>
    </aside>
  );
};
