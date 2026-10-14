import React, { useState } from 'react';
import {
  Mail,
  Zap,
  Bell,
  Clock,
  Play,
  Pause,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Header: React.FC<{ activeTab: string; setActiveTab: (tab: string) => void }> = ({
  activeTab,
  setActiveTab,
}) => {
  const {
    accounts,
    timingSettings,
    automation,
    notifications,
    unreadNotificationCount,
    totalFollowUpsDue,
    selectedAccountIdFilter,
    setSelectedAccountIdFilter,
    toggleAutomationEngine,
    updateTimingSettings,
    markAllNotificationsAsRead,
    markNotificationAsRead,
    clearNotifications,
  } = useApp();

  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);

  // Remaining seconds until next random send
  const [secondsUntilNextSend, setSecondsUntilNextSend] = useState<number | null>(null);

  React.useEffect(() => {
    const timer = setInterval(() => {
      if (automation.nextScheduledSendTimestamp) {
        const remaining = Math.max(
          0,
          Math.ceil((automation.nextScheduledSendTimestamp - Date.now()) / 1000)
        );
        setSecondsUntilNextSend(remaining);
      } else {
        setSecondsUntilNextSend(null);
      }
    }, 500);
    return () => clearInterval(timer);
  }, [automation.nextScheduledSendTimestamp]);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountIdFilter);

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 px-4 lg:px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Brand */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-600/20">
            <Mail className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-white tracking-tight">NexusReach</span>
              <span className="text-[11px] text-zinc-400 hidden sm:inline">
                • Cold Email Automation
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 hidden md:block">
              Multi-account outreach with randomized delay (2-5m)
            </p>
          </div>
        </div>

        {/* Right: Clean, Uncluttered Controls */}
        <div className="flex items-center gap-2.5">
          {/* Automation Active / Paused Pill */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
            <button
              onClick={toggleAutomationEngine}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                automation.isRunning
                  ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
              title={automation.isRunning ? 'Click to Pause automation' : 'Click to Start automation'}
            >
              {automation.isRunning ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Automation: Active</span>
                </>
              ) : (
                <>
                  <Pause className="h-3 w-3" />
                  <span>Automation: Paused</span>
                </>
              )}
            </button>

            {/* Countdown or Delay Label */}
            {automation.isRunning && secondsUntilNextSend !== null && secondsUntilNextSend > 0 ? (
              <span className="text-[11px] text-indigo-300 font-mono hidden sm:inline">
                Next send in {secondsUntilNextSend}s
              </span>
            ) : (
              <span className="text-[11px] text-zinc-400 hidden sm:inline">
                {timingSettings.testModeFastInterval ? '⚡ Fast 10s Mode' : 'Random delay: 2-5 min'}
              </span>
            )}

            {/* Fast Demo Mode Toggle */}
            <button
              onClick={() =>
                updateTimingSettings({
                  testModeFastInterval: !timingSettings.testModeFastInterval,
                })
              }
              className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all cursor-pointer ${
                timingSettings.testModeFastInterval
                  ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'
              }`}
              title="Toggle Fast Demo Mode (10s delay) for testing"
            >
              {timingSettings.testModeFastInterval ? '⚡ Fast 10s' : '🐢 Normal (2-5m)'}
            </button>
          </div>

          {/* Account Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowAccountDropdown(!showAccountDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 rounded-xl text-xs text-zinc-200 transition-colors cursor-pointer"
            >
              <div className="h-2 w-2 rounded-full bg-indigo-500" />
              <span className="font-medium max-w-[130px] truncate">
                {selectedAccountIdFilter === 'all'
                  ? `All Mailboxes (${accounts.length})`
                  : selectedAccount?.email.split('@')[0]}
              </span>
              <ChevronDown className="h-3 w-3 text-zinc-400" />
            </button>

            {showAccountDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowAccountDropdown(false)}
                />
                <div className="absolute right-0 mt-2 w-64 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 p-2 space-y-1">
                  <button
                    onClick={() => {
                      setSelectedAccountIdFilter('all');
                      setShowAccountDropdown(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-left ${
                      selectedAccountIdFilter === 'all'
                        ? 'bg-indigo-600 text-white'
                        : 'text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <span>All Connected Accounts</span>
                    <span className="text-[10px] opacity-70">{accounts.length}</span>
                  </button>

                  <div className="border-t border-zinc-800 pt-1">
                    {accounts.map((acc) => (
                      <button
                        key={acc.id}
                        onClick={() => {
                          setSelectedAccountIdFilter(acc.id);
                          setShowAccountDropdown(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-left ${
                          selectedAccountIdFilter === acc.id
                            ? 'bg-indigo-600 text-white'
                            : 'text-zinc-300 hover:bg-zinc-800'
                        }`}
                      >
                        <div className="truncate">
                          <p className="font-medium truncate">{acc.email}</p>
                          <p className="text-[10px] opacity-60">
                            {acc.sentToday}/{acc.dailyLimit} sent today
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-zinc-800 pt-1.5">
                    <button
                      onClick={() => {
                        setShowAccountDropdown(false);
                        setActiveTab('accounts');
                      }}
                      className="w-full text-center py-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                      + Manage Gmail Accounts
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="relative p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 transition-colors cursor-pointer"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadNotificationCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white shadow-sm">
                  {unreadNotificationCount}
                </span>
              )}
            </button>

            {showNotifDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowNotifDropdown(false)}
                />
                <div className="absolute right-0 mt-2 w-80 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 p-3">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800 text-xs">
                    <span className="font-bold text-white">Notifications</span>
                    <button
                      onClick={markAllNotificationsAsRead}
                      className="text-[11px] text-zinc-400 hover:text-white"
                    >
                      Mark read
                    </button>
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-2">
                    {notifications.length === 0 ? (
                      <p className="text-center py-6 text-xs text-zinc-500">
                        No notifications yet.
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            markNotificationAsRead(n.id);
                            if (n.type === 'reply_received') setActiveTab('inbox');
                            if (n.type === 'followup_due') setActiveTab('leads');
                            setShowNotifDropdown(false);
                          }}
                          className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800 text-xs hover:border-zinc-700 transition-colors cursor-pointer"
                        >
                          <p className="font-semibold text-white">{n.title}</p>
                          <p className="text-[11px] text-zinc-400 mt-0.5">{n.message}</p>
                          <span className="text-[10px] text-zinc-500 mt-1 block">
                            via {n.accountEmail}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
