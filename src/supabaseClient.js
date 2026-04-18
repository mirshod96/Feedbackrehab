import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Fallback to a mock valid format URL so the app doesn't crash with a white screen
const validUrl = supabaseUrl.startsWith('http') ? supabaseUrl : 'https://mock-url.supabase.co';

export const supabase = createClient(validUrl, supabaseAnonKey || 'mock-key');
