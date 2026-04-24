import { createClient } from '@supabase/supabase-js'

const getSupabaseConfig = () => {
  // Use the exact values from .env.example if not provided by environment
  const DEFAULT_URL = 'https://eslddxxgogrbrffpwqev.supabase.co';
  const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzbGRkeHhnb2dyYnJmZnB3cWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NzA1NjcsImV4cCI6MjA5MjM0NjU2N30.BLDkVJmxUtMpBkPe5ZTflH1yqAEMBLNUn5v08Jr4rls';

  const rawUrl = import.meta.env.VITE_SUPABASE_URL;
  const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  // Ensure we have a string and it starts with http
  let url = (typeof rawUrl === 'string' && rawUrl.trim().startsWith('http')) ? rawUrl.trim() : DEFAULT_URL;
  const key = (typeof rawKey === 'string' && rawKey.trim().length > 10) ? rawKey.trim() : DEFAULT_KEY;

  if (url === 'https://eslddxxgogrbffpwqev.supabase.co') {
    url = DEFAULT_URL;
  }

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
