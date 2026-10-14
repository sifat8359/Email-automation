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

