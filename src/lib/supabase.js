'use client';

import { createBrowserClient } from '@supabase/ssr';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && key);

export const supabase = isSupabaseConfigured
  ? createBrowserClient(url, key)
  : null;

if (!isSupabaseConfigured && typeof window !== 'undefined') {
  // eslint-disable-next-line no-console
  console.warn(
    '[supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set. ' +
      'The app will run in no-op mode until you fill them in .env.local and restart.'
  );
}

const camelKey = (k) => k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const snakeKey = (k) => k.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());

const transform = (obj, mapKey) => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map((x) => transform(x, mapKey));
  if (typeof obj !== 'object') return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[mapKey(k)] = v;
  return out;
};

/** Map a Postgres row (snake_case) to the JS shape used by the app. */
export const fromRow = (row) => transform(row, camelKey);

/** Map a JS object (camelCase) to a Postgres row payload. */
export const toRow = (obj) => transform(obj, snakeKey);
