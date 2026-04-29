import { createClient } from '@supabase/supabase-js'

const getSupabaseConfig = () => {
  // Use placeholders for safety
  const DEFAULT_URL = 'https://your-project.supabase.co';
  const DEFAULT_KEY = 'your-anon-key';

  const rawUrl = import.meta.env.VITE_SUPABASE_URL;
  const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  // Ensure we have a string and it starts with http
  let url = (typeof rawUrl === 'string' && rawUrl.trim().startsWith('http')) ? rawUrl.trim() : DEFAULT_URL;
  const key = (typeof rawKey === 'string' && rawKey.trim().length > 10) ? rawKey.trim() : DEFAULT_KEY;

  // Final check for validity
  if (!url || !url.startsWith('http')) {
    url = DEFAULT_URL;
  }

  return { url, key };
};

const config = getSupabaseConfig();
export const supabaseUrl = config.url;
export const supabaseAnonKey = config.key;

// Create client immediately but safely
// If the URL is still somehow invalid, we catch it here to prevent the crash from bubbling up
let supabaseClient;
try {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
} catch (e) {
  console.error('Failed to create Supabase client:', e);
  // Fallback to a mock-like proxy if it fails
  supabaseClient = new Proxy({} as any, {
    get: () => {
      throw new Error('Supabase client failed to initialize. Check your URL and Key.');
    }
  });
}

export const supabase = supabaseClient;
