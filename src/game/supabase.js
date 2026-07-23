// Supabase client for the shared online leaderboard.
// Reads its config from Vite env vars (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
// If either is missing the client is null and storage.js falls back to
// localStorage, so the game still runs offline / without a backend configured.
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && anonKey
  ? createClient(url, anonKey, { auth: { persistSession: false } })
  : null

// Handy flag for callers/UI ("online" leaderboard vs local-only).
export const isOnline = !!supabase

// One-line diagnostic in the browser console so it's obvious in production
// whether the online backend is wired up or we're on the localStorage fallback.
if (typeof window !== 'undefined') {
  if (isOnline) console.info('[MoleMayhem] Leaderboard: online (Supabase) ✓')
  else console.warn('[MoleMayhem] Leaderboard: LOCAL only — VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing at build time')
}
