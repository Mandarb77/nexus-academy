import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

/** Template values from .env.example count as "not configured" — replace with Project URL + anon/publishable key from Supabase. */
function isPlaceholderUrl(value: string): boolean {
  const v = value.trim().toLowerCase()
  return v.length === 0 || v.includes('your_project_ref')
}

function isPlaceholderAnonKey(value: string): boolean {
  const v = value.trim().toLowerCase()
  return (
    v.length === 0 ||
    v === 'your_anon_or_publishable_key_here' ||
    v === 'your_anon_key_here'
  )
}

export const isSupabaseConfigured =
  !isPlaceholderUrl(url) && !isPlaceholderAnonKey(anonKey)

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase env not ready: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env to your real Project URL and anon/publishable key (not the .env.example placeholders). Restart the dev server after saving.',
  )
}

/**
 * createClient('', '') throws "supabaseUrl is required". Use placeholders when env
 * is missing; AuthContext and UI gate on isSupabaseConfigured so nothing hits the network.
 */
const PLACEHOLDER_URL = 'https://placeholder.supabase.co'
const PLACEHOLDER_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

export const supabase = createClient(
  isSupabaseConfigured ? url : PLACEHOLDER_URL,
  isSupabaseConfigured ? anonKey : PLACEHOLDER_ANON_KEY,
  {
    auth: {
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  },
)
