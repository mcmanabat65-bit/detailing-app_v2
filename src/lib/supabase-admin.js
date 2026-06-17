import { createClient } from '@supabase/supabase-js';

// Service-role Supabase client. BYPASSES Row Level Security and can use the
// Auth Admin API (create/delete users). MUST only ever be imported in
// server-side code (API routes / server actions). The service-role key is read
// from a NON-public env var, so it is never inlined into the client bundle
// (it resolves to undefined on the client).
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isAdminConfigured = Boolean(url && serviceKey);

export const supabaseAdmin = isAdminConfigured
  ? createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;
