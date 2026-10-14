import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { CampaignsView } from './components/CampaignsView';
import { CampaignBuilderView } from './components/CampaignBuilderView';
import { InboxView } from './components/InboxView';
import { SettingsView } from './components/SettingsView';
import { ThreadModal } from './components/ThreadModal';
import { AccountSwitcherModal } from './components/AccountSwitcherModal';
import { AddAccountModal } from './components/AddAccountModal';
import { Lead } from './types';
import { Rocket, PlusCircle, Inbox, Settings, AtSign } from 'lucide-react';

import { AccountsView } from './components/AccountsView';

const MainLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('campaigns');
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [isLightMode, setIsLightMode] = useState<boolean>(false);

  // Modals state
  const [threadModalLead, setThreadModalLead] = useState<Lead | null>(null);
  const [isAccountSwitcherOpen, setIsAccountSwitcherOpen] = useState<boolean>(false);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState<boolean>(false);

  return (
    <div
      className={`min-h-screen flex ${
        isLightMode
          ? 'bg-zinc-100 text-zinc-900'
          : 'bg-[#0a0d17] text-zinc-100'
      }`}
    >
      {/* Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAccountSwitcher={() => setIsAccountSwitcherOpen(true)}
        isLightMode={isLightMode}
        setIsLightMode={setIsLightMode}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-20 md:pb-8">
        {activeTab === 'campaigns' && (
          <CampaignsView
            onNavigateToBuilder={(campaignId) => {
              setEditingCampaignId(campaignId || null);
            }}
            onNavigateToInbox={() => setActiveTab('inbox')}
            initialCampaignId={editingCampaignId}
          />
        )}

        {activeTab === 'inbox' && (
          <InboxView onNavigateToCompose={() => setActiveTab('campaigns')} />
        )}

        {activeTab === 'accounts' && (
          <AccountsView onOpenAddAccount={() => setIsAddAccountOpen(true)} />
        )}

        {activeTab === 'settings' && (
          <SettingsView onOpenAddAccount={() => setIsAddAccountOpen(true)} />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0a0c15]/95 backdrop-blur-lg border-t border-[#1a1e2f] flex items-center justify-around py-2 px-1">
        {[
          { id: 'campaigns', label: 'Campaigns', icon: Rocket },
          { id: 'inbox', label: 'Unibox', icon: Inbox },
          { id: 'accounts', label: 'Accounts', icon: AtSign },
          { id: 'settings', label: 'Settings', icon: Settings },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 p-1 rounded-lg text-[10px] transition-colors ${
                isActive ? 'text-indigo-400 font-bold' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Account Switcher Modal (triggered by bottom-left account pill) */}
      {isAccountSwitcherOpen && (
        <AccountSwitcherModal
          onClose={() => setIsAccountSwitcherOpen(false)}
          onOpenAddAccount={() => setIsAddAccountOpen(true)}
        />
      )}

      {/* Add Gmail Account Modal */}
      {isAddAccountOpen && (
        <AddAccountModal onClose={() => setIsAddAccountOpen(false)} />
      )}

      {/* Thread Details Modal */}
      {threadModalLead && (
        <ThreadModal
          lead={threadModalLead}
          onClose={() => setThreadModalLead(null)}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
