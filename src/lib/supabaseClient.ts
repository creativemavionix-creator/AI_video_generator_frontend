import { createClient } from '@supabase/supabase-js';

// Read env variables
const metaEnv = (import.meta as any).env || {};
const rawUrl = metaEnv.VITE_SUPABASE_URL || '';
// Clean up any trailing /rest/v1/ if user appended it
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').trim();
const supabaseAnonKey = (metaEnv.VITE_SUPABASE_ANON_KEY || '').trim();

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are missing.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
