import { createClient } from '@supabase/supabase-js';

// Hardcoded to bypass Vercel env variable setup for the client
const supabaseUrl = 'https://ffuqgimioiebntdzephr.supabase.co';
const supabaseAnonKey = 'sb_publishable_qk6BoMm3wIlxW12dtqlJeA_27m6LEPk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
