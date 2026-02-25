import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './index';

export function createSupabaseClient(accessToken?: string): SupabaseClient {
  const headers: Record<string, string> = {};

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    global: {
      headers,
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
