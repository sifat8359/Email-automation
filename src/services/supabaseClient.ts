import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Campaign, Lead, GmailAccount, SupabaseConfig } from '../types';

const STORAGE_KEY_CONFIG = 'nexusreach_supabase_config';
const STORAGE_KEY_DATA = 'nexusreach_campaigns_cache';

let cachedClient: SupabaseClient | null = null;

export function getStoredSupabaseConfig(): SupabaseConfig {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        url: parsed.url || envUrl,
        anonKey: parsed.anonKey || envKey,
        isConnected: parsed.isConnected ?? (Boolean(parsed.url || envUrl) && Boolean(parsed.anonKey || envKey)),
        lastSyncTimestamp: parsed.lastSyncTimestamp ?? null,
      };
    }
  } catch (e) {
    console.error('Failed to parse stored Supabase config:', e);
  }

  return {
    url: envUrl,
    anonKey: envKey,
    isConnected: Boolean(envUrl && envKey),
    lastSyncTimestamp: null,
  };
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    cachedClient = null; // reset cached client
  } catch (e) {
    console.error('Failed to save Supabase config:', e);
  }
}

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const config = getStoredSupabaseConfig();
  if (config.url && config.anonKey) {
    try {
      cachedClient = createClient(config.url, config.anonKey, {
        auth: {
          persistSession: false,
        },
      });
      return cachedClient;
    } catch (e) {
      console.error('Could not initialize Supabase client:', e);
      return null;
    }
  }

  return null;
}

export async function testSupabaseConnection(url: string, anonKey: string): Promise<{ success: boolean; message: string }> {
  if (!url || !anonKey) {
    return { success: false, message: 'Please provide both Project URL and Anon API Key' };
  }

  try {
    const testClient = createClient(url.trim(), anonKey.trim(), {
      auth: { persistSession: false },
    });

    // Simple ping check to verify URL and key structure
    const { error } = await testClient.from('_healthcheck_ping').select('*').limit(1);
    
    // In Supabase, if the table doesn't exist (HTTP 404 or 42P01), it confirms valid auth and reachability!
    if (error && error.code !== '42P01' && error.message.includes('Invalid API key')) {
      return { success: false, message: 'Invalid API key or unauthorized access.' };
    }

    return {
      success: true,
      message: 'Successfully connected to Supabase project!',
    };
  } catch (e: any) {
    return {
      success: false,
      message: e?.message || 'Connection failed. Please check your Supabase Project URL.',
    };
  }
}

// Local cache backup helper for seamless offline & local execution
export function getLocalCampaignsCache(): Campaign[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DATA);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load local campaign cache:', e);
  }
  return null;
}

export function saveLocalCampaignsCache(campaigns: Campaign[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(campaigns));
  } catch (e) {
    console.error('Failed to persist local campaign cache:', e);
  }
}

export async function syncCampaignsToSupabase(campaigns: Campaign[]): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase client not configured. Please add your credentials in Settings.' };
  }

  try {
    // Attempt upserting to campaigns table
    const campaignRows = campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      assigned_account_id: c.assignedAccountId,
      daily_limit: c.dailyLimit,
      schedule_window: c.scheduleWindow,
      sequence_steps: c.sequenceSteps,
      leads: c.leads,
      stats: c.stats,
      updated_at: new Date().toISOString(),
    }));

    const { error: cError } = await client.from('campaigns').upsert(campaignRows, { onConflict: 'id' });
    if (cError) {
      if (cError.code === '42P01') {
        return {
          success: false,
          message: 'Table "campaigns" does not exist in your Supabase database. Please copy and run the provided SQL Schema in your Supabase SQL Editor.',
        };
      }
      return { success: false, message: `Supabase sync error: ${cError.message}` };
    }

    return { success: true, message: `Successfully synchronized ${campaigns.length} campaigns to Supabase!` };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Sync failed' };
  }
}

export async function syncAccountsToSupabase(accounts: GmailAccount[]): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase client not configured.' };
  }

  try {
    const accountRows = accounts.map((a) => ({
      id: a.id,
      email: a.email,
      sender_name: a.senderName,
      avatar: a.avatar,
      color: a.color,
      status: a.status,
      daily_limit: a.dailyLimit,
      sent_today: a.sentToday,
      warmup_score: a.warmupScore,
      provider: a.provider,
      signature: a.signature || '',
      smtp_config: a.smtpConfig || null,
      imap_config: a.imapConfig || null,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await client.from('accounts').upsert(accountRows, { onConflict: 'id' });
    if (error) {
      if (error.code === '42P01') {
        return { success: false, message: 'Table "accounts" does not exist in Supabase. Run SQL schema from Settings.' };
      }
      return { success: false, message: error.message };
    }

    return { success: true, message: `Successfully synchronized ${accounts.length} sending accounts to Supabase!` };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Accounts sync failed' };
  }
}

export async function loadCampaignsFromSupabase(): Promise<Campaign[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client.from('campaigns').select('*').order('created_at', { ascending: false });
    if (error || !data) return null;

    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      status: row.status,
      assignedAccountId: row.assigned_account_id,
      assignedAccountIds: row.assigned_account_ids || [row.assigned_account_id],
      dailyLimit: row.daily_limit || 50,
      scheduleWindow: row.schedule_window || { startTime: '08:00', endTime: '22:00', timezone: 'UTC', days: [1, 2, 3, 4, 5] },
      sequenceSteps: row.sequence_steps || [],
      leads: row.leads || [],
      stats: row.stats || { totalLeads: 0, sent: 0, opened: 0, replied: 0, bounced: 0, botFiltered: 0 },
      minDelayMinutes: row.min_delay_minutes ?? 2,
      maxDelayMinutes: row.max_delay_minutes ?? 5,
      createdAt: row.created_at,
    }));
  } catch (e) {
    console.warn('Failed to load campaigns from Supabase:', e);
    return null;
  }
}

export async function loadAccountsFromSupabase(): Promise<GmailAccount[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client.from('accounts').select('*');
    if (error || !data) return null;

    return data.map((row: any) => ({
      id: row.id,
      email: row.email,
      senderName: row.sender_name,
      avatar: row.avatar || '',
      color: row.color || '#5B8DEF',
      status: row.status || 'active',
      dailyLimit: row.daily_limit || 50,
      sentToday: row.sent_today || 0,
      warmupScore: row.warmup_score || 100,
      unreadReplies: 0,
      dueFollowUps: 0,
      provider: row.provider || 'custom_smtp',
      signature: row.signature || '',
      smtpConfig: row.smtp_config || undefined,
      imapConfig: row.imap_config || undefined,
      connectedAt: row.created_at || new Date().toISOString(),
    }));
  } catch (e) {
    console.warn('Failed to load accounts from Supabase:', e);
    return null;
  }
}


