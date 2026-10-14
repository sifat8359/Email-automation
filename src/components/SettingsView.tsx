import React, { useState } from 'react';
import {
  Database,
  Mail,
  Plus,
  Edit2,
  Clock,
  Check,
  Trash2,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Copy,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

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
  title TEXT,
  status TEXT DEFAULT 'ready_for_outreach',
  current_step_index INT DEFAULT 0,
  last_contacted_at BIGINT,
  next_follow_up_at BIGINT,
  history JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (optional)
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read and write" ON campaigns FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read and write on leads" ON leads FOR ALL TO anon USING (true) WITH CHECK (true);`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-16">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Settings & Database</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Configure Supabase database connection, sender Gmail mailboxes, and outreach limits.
        </p>
      </div>

      {/* Section 1: Supabase Database Integration */}
      <div className="bg-[#0f1423] border border-[#1d263f] rounded-2xl p-6 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#182037]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm text-white">Supabase Database Integration</h2>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  PostgreSQL
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Connect your Supabase project to persist campaigns, leads, sequences, and analytics in real time.
              </p>
            </div>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold self-start sm:self-auto flex items-center gap-1.5 ${
              supabaseConfig.isConnected
                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
            }`}
          >
            <div
              className={`h-2 w-2 rounded-full ${
                supabaseConfig.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
              }`}
            />
            <span>{supabaseConfig.isConnected ? 'Connected to Supabase' : 'Not Connected'}</span>
          </span>
        </div>

        <form onSubmit={handleSaveSupabase} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
              SUPABASE PROJECT URL
            </label>
            <input
              type="url"
              required
              placeholder="https://xyzprojectid.supabase.co"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#090d16] border border-[#1b233a] text-sm text-white font-mono focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
              SUPABASE ANON PUBLIC API KEY
            </label>
            <input
              type="password"
              required
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#090d16] border border-[#1b233a] text-sm text-white font-mono focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {testResult && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-700/50'
                  : 'bg-red-950/40 text-red-300 border border-red-700/50'
              }`}
            >
              {testResult.success ? (
                <Check className="h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {syncResult && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
                syncResult.success
                  ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-700/50'
                  : 'bg-amber-950/40 text-amber-300 border border-amber-700/50'
              }`}
            >
              {syncResult.success ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
              )}
              <span>{syncResult.message}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSqlSchema((prev) => !prev)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
              >
                {showSqlSchema ? 'Hide SQL Schema' : 'View Recommended Supabase SQL Schema'}
              </button>

              {supabaseConfig.isConnected && (
                <button
                  type="button"
                  onClick={handleSyncData}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync Data Now'}</span>
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isTesting || !supabaseUrl || !supabaseKey}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center gap-2 self-start sm:self-auto"
            >
              {isTesting ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Save &amp; Connect Supabase</span>
                </>
              )}
            </button>
          </div>
        </form>

        {showSqlSchema && (
          <div className="p-4 rounded-xl bg-[#090d16] border border-[#1b233a] space-y-2 text-xs">
            <div className="flex items-center justify-between text-zinc-400 font-mono text-[11px]">
              <span>Copy and run in Supabase SQL Editor:</span>
              <button
                type="button"
                onClick={handleCopySql}
                className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 cursor-pointer"
              >
                {copiedSql ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedSql ? 'Copied!' : 'Copy SQL'}</span>
              </button>
            </div>
            <pre className="font-mono text-[11px] text-zinc-300 overflow-x-auto p-3.5 rounded-lg bg-[#0e1424] border border-[#1b243d] leading-relaxed">
{SQL_SCHEMA}
            </pre>
          </div>
        )}
      </div>

      {/* Section 2: Connected Gmail Mailboxes */}
      <div className="bg-[#0f1423] border border-[#1d263f] rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-[#182037]">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-indigo-400" />
            <h2 className="font-bold text-sm text-white">Outreach Sending Mailboxes</h2>
          </div>
          <button
            onClick={onOpenAddAccount}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Connect Account</span>
          </button>
        </div>

        <div className="space-y-3">
          {accounts.map((acc) => {
            const isEditing = editingId === acc.id;
            return (
              <div
                key={acc.id}
                className="p-4 rounded-xl bg-[#090d16] border border-[#1b233a] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  {acc.avatar && acc.avatar.trim() !== '' ? (
                    <div className="relative shrink-0">
                      <img
                        src={acc.avatar}
                        alt={acc.senderName}
                        className="h-9 w-9 rounded-xl object-cover border border-[#232f50] shadow-sm"
                      />
                      <div
                        className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-[#090d16]"
                        style={{ backgroundColor: acc.color }}
                      />
                    </div>
                  ) : (
                    <div
                      className="h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-sm shrink-0 border border-white/10"
                      style={{ backgroundColor: acc.color }}
                    >
                      {acc.senderName ? acc.senderName.slice(0, 2).toUpperCase() : acc.email.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-white">{acc.senderName}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">({acc.email})</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-0.5">
                      <span>Sent today: <strong className="text-zinc-200">{acc.sentToday}</strong></span>
                      <span>•</span>
                      <span>Daily limit: <strong className="text-zinc-200">{acc.dailyLimit}</strong></span>
                      <span>•</span>
                      <span>Warmup: <strong className="text-emerald-400">{acc.warmupScore}%</strong></span>
                    </div>
                  </div>
                </div>

                {isEditing ? (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-zinc-400">Limit:</span>
                      <input
                        type="number"
                        value={editLimit}
                        onChange={(e) => setEditLimit(Number(e.target.value))}
                        className="w-16 px-2 py-1 rounded bg-[#121829] border border-[#1e2740] text-xs text-white text-center"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-zinc-400">Avatar URL:</span>
                      <input
                        type="url"
                        placeholder="https://... (optional)"
                        value={editAvatar}
                        onChange={(e) => setEditAvatar(e.target.value)}
                        className="w-36 px-2 py-1 rounded bg-[#121829] border border-[#1e2740] text-xs text-white placeholder-zinc-500"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => saveEdit(acc.id)}
                        className="px-2.5 py-1 rounded bg-indigo-600 text-white text-xs font-semibold"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-2 py-1 text-xs text-zinc-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      onClick={() => startEdit(acc)}
                      className="p-1.5 rounded-lg bg-[#141b2c] hover:bg-[#1a233b] border border-[#212b48] text-zinc-300 text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="h-3 w-3" />
                      <span>Edit Limit</span>
                    </button>

                    {accounts.length > 1 && (
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${acc.email}?`)) {
                            deleteAccount(acc.id);
                          }
                        }}
                        className="p-1.5 rounded-lg hover:bg-rose-950/60 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Workspace Data Management & Mock Items */}
      <div className="bg-[#0f1423] border border-[#1b233a] rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Workspace Data & Mock Items</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Manage preloaded demo campaigns, sample leads, and local state.
            </p>
          </div>
          <span className="text-xs font-mono text-zinc-500">
            {campaigns.length} campaigns ({campaigns.reduce((acc, c) => acc + c.leads.length, 0)} total leads)
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#090d16] border border-[#1c243d] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-zinc-200">Remove Mock / Sample Data</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Clear all default mock campaigns, leads, and demo sequences so you can start with a fresh workspace for your real CSV imports.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {campaigns.length > 0 ? (
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to remove all mock/sample campaigns and leads?')) {
                    clearMockData();
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-950/70 border border-rose-800/60 text-rose-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove Mock Items</span>
              </button>
            ) : (
              <button
                onClick={loadSampleMockData}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Restore Sample Data</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
