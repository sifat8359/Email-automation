import React, { useState } from 'react';
import {
  Mail,
  Plus,
  Edit2,
  Check,
  Trash2,
  Copy,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  PageHeader,
  SectionHeader,
  Card,
  ListCard,
  ListRow,
  Button,
  Input,
  StatusPill,
} from './ui/DesignSystem';

export const SettingsView: React.FC<{
  onOpenAddAccount: () => void;
}> = ({ onOpenAddAccount }) => {
  const {
    accounts,
    campaigns,
    supabaseConfig,
    updateSupabaseCredentials,
    syncWithSupabase,
    updateAccount,
    deleteAccount,
    clearMockData,
    loadSampleMockData,
  } = useApp();

  // Supabase Form state
  const [supabaseUrl, setSupabaseUrl] = useState(supabaseConfig.url || '');
  const [supabaseKey, setSupabaseKey] = useState(supabaseConfig.anonKey || '');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showSqlSchema, setShowSqlSchema] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Mailbox inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLimit, setEditLimit] = useState(60);
  const [editSent, setEditSent] = useState(15);
  const [editAvatar, setEditAvatar] = useState('');

  const startEdit = (acc: any) => {
    setEditingId(acc.id);
    setEditLimit(acc.dailyLimit);
    setEditSent(acc.sentToday);
    setEditAvatar(acc.avatar || '');
  };

  const saveEdit = (id: string) => {
    updateAccount(id, {
      dailyLimit: Math.max(1, Number(editLimit)),
      sentToday: Math.max(0, Number(editSent)),
      avatar: editAvatar.trim(),
    });
    setEditingId(null);
  };

  const handleSaveSupabase = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setTestResult(null);

    const res = await updateSupabaseCredentials(supabaseUrl, supabaseKey);
    setIsTesting(false);
    setTestResult(res);
  };

  const handleSyncData = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    const res = await syncWithSupabase();
    setIsSyncing(false);
    setSyncResult(res);
  };

  const SQL_SCHEMA = `-- Instantly Cold Outreach Database Schema for Supabase
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  assigned_account_id TEXT,
  schedule_window JSONB,
  sequence_steps JSONB DEFAULT '[]',
  stats JSONB DEFAULT '{}',
  daily_limit INT DEFAULT 50,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  campaign_id TEXT REFERENCES campaigns(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT NOT NULL,
  company_name TEXT,
  website TEXT,
  status TEXT DEFAULT 'ready_for_outreach',
  current_step_index INT DEFAULT 0,
  history JSONB DEFAULT '[]',
  opened_count INT DEFAULT 0,
  clicked_count INT DEFAULT 0,
  replied_at TIMESTAMPTZ,
  next_step_due_at TIMESTAMPTZ,
  sentiment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  sender_name TEXT,
  avatar TEXT,
  color TEXT,
  status TEXT DEFAULT 'active',
  daily_limit INT DEFAULT 50,
  sent_today INT DEFAULT 0,
  warmup_score INT DEFAULT 100,
  provider TEXT,
  smtp_config JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read and write on campaigns" ON campaigns FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read and write on leads" ON leads FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read and write on accounts" ON accounts FOR ALL TO anon USING (true) WITH CHECK (true);`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 page-fade">
      {/* Header */}
      <PageHeader
        title="Settings & database"
        subtitle="Configure Supabase database connection, sender mailboxes, and outreach limits."
      />

      {/* Section 1: Supabase Database Integration */}
      <Card className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
          <SectionHeader
            title="Supabase database integration"
            subtitle="Connect your project to persist campaigns, leads, and analytics in real time."
          />
          <StatusPill
            variant={supabaseConfig.isConnected ? 'success' : 'muted'}
            label={supabaseConfig.isConnected ? 'Supabase connected' : 'Not connected'}
          />
        </div>

        <form onSubmit={handleSaveSupabase} className="space-y-4">
          <div>
            <label className="block text-[13px] text-[var(--text-secondary)] mb-1">
              Supabase project URL
            </label>
            <Input
              type="url"
              required
              placeholder="https://yourproject.supabase.co"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[13px] text-[var(--text-secondary)] mb-1">
              Supabase anon public API key
            </label>
            <Input
              type="password"
              required
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
            />
          </div>

          {testResult && (
            <div className="p-3 rounded-[10px] border border-[var(--border)] text-xs flex items-center gap-2 text-[var(--text-primary)]">
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-[var(--success)] shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-[var(--warning)] shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {syncResult && (
            <div className="p-3 rounded-[10px] border border-[var(--border)] text-xs flex items-center gap-2 text-[var(--text-primary)]">
              {syncResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-[var(--success)] shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-[var(--warning)] shrink-0" />
              )}
              <span>{syncResult.message}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSqlSchema((prev) => !prev)}
                className="text-xs text-[var(--accent)] hover:underline font-medium cursor-pointer"
              >
                {showSqlSchema ? 'Hide SQL schema' : 'View recommended Supabase SQL schema'}
              </button>

              {supabaseConfig.isConnected && (
                <Button
                  variant="secondary"
                  type="button"
                  onClick={handleSyncData}
                  disabled={isSyncing}
                  className="text-xs py-1.5 px-3"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync data now'}</span>
                </Button>
              )}
            </div>

            <Button
              variant="primary"
              type="submit"
              disabled={isTesting || !supabaseUrl || !supabaseKey}
            >
              {isTesting ? (
                <span>Connecting...</span>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Save and connect Supabase</span>
                </>
              )}
            </Button>
          </div>
        </form>

        {showSqlSchema && (
          <div className="p-4 rounded-[10px] bg-white/[0.02] border border-[var(--border)] space-y-2 text-xs">
            <div className="flex items-center justify-between text-[var(--text-secondary)]">
              <span>Copy and run in Supabase SQL editor:</span>
              <button
                type="button"
                onClick={handleCopySql}
                className="flex items-center gap-1 text-[var(--accent)] hover:underline cursor-pointer"
              >
                {copiedSql ? <Check className="h-3.5 w-3.5 text-[var(--success)]" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedSql ? 'Copied' : 'Copy SQL'}</span>
              </button>
            </div>
            <pre className="font-mono text-xs text-[var(--text-primary)] overflow-x-auto p-3.5 rounded-[8px] bg-[var(--surface)] border border-[var(--border)] leading-relaxed">
{SQL_SCHEMA}
            </pre>
          </div>
        )}
      </Card>

      {/* Section 2: Connected Sending Mailboxes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionHeader
            title="Outreach sending mailboxes"
            subtitle="Manage warmup status and daily limits for each sender account."
          />
          <Button variant="secondary" onClick={onOpenAddAccount} className="text-xs py-1.5 px-3">
            <Plus className="h-3.5 w-3.5" />
            <span>Connect account</span>
          </Button>
        </div>

        <ListCard>
          {accounts.map((acc) => {
            const isEditing = editingId === acc.id;
            return (
              <ListRow key={acc.id} className="py-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-9 w-9 rounded-[10px] flex items-center justify-center font-semibold text-xs text-[#0E1116] shrink-0"
                      style={{ backgroundColor: acc.color || 'var(--accent)' }}
                    >
                      {acc.senderName ? acc.senderName.slice(0, 2).toUpperCase() : acc.email.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-[var(--text-primary)]">{acc.senderName}</span>
                        <span className="text-[12px] text-[var(--text-secondary)]">({acc.email})</span>
                      </div>
                      <p className="text-[13px] text-[var(--text-secondary)] mt-0.5 tabular-nums">
                        Sent today: {acc.sentToday}, Daily limit: {acc.dailyLimit}, Warmup: {acc.warmupScore}%
                      </p>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-[var(--text-secondary)]">Limit:</span>
                        <Input
                          type="number"
                          value={editLimit}
                          onChange={(e) => setEditLimit(Number(e.target.value))}
                          className="w-16 py-1 px-2 text-center"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button variant="primary" onClick={() => saveEdit(acc.id)} className="text-xs py-1 px-3">
                          Save
                        </Button>
                        <Button variant="secondary" onClick={() => setEditingId(null)} className="text-xs py-1 px-3">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <Button
                        variant="secondary"
                        onClick={() => startEdit(acc)}
                        className="text-xs py-1.5 px-3"
                      >
                        <Edit2 className="h-3 w-3" />
                        <span>Edit limit</span>
                      </Button>

                      {accounts.length > 1 && (
                        <button
                          onClick={() => {
                            if (confirm(`Remove ${acc.email}?`)) {
                              deleteAccount(acc.id);
                            }
                          }}
                          className="p-1.5 rounded-[8px] text-[var(--text-secondary)] hover:text-rose-400 hover:bg-white/[0.04] transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </ListRow>
            );
          })}
        </ListCard>
      </div>

      {/* Section 3: Workspace Data Management */}
      <Card className="space-y-4">
        <SectionHeader
          title="Workspace data and mock items"
          subtitle={`Manage preloaded demo campaigns and local state (${campaigns.length} campaigns, ${campaigns.reduce((acc, c) => acc + c.leads.length, 0)} leads).`}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <p className="text-[13px] text-[var(--text-secondary)]">
            Clear sample campaigns and leads to start fresh with your real CSV imports.
          </p>

          <div className="flex items-center gap-2 shrink-0">
            {campaigns.length > 0 ? (
              <Button
                variant="secondary"
                onClick={() => {
                  if (confirm('Are you sure you want to remove all mock campaigns and leads?')) {
                    clearMockData();
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
                <span>Remove mock items</span>
              </Button>
            ) : (
              <Button variant="secondary" onClick={loadSampleMockData}>
                <RefreshCw className="h-4 w-4" />
                <span>Restore sample data</span>
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
