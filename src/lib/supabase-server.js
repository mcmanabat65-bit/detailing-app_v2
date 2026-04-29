import { createClient } from '@supabase/supabase-js';
import { services as staticServices } from '@/data/services';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const camelKey = (k) => k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const fromRow = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[camelKey(k)] = v;
  return out;
};

export async function fetchServices() {
  if (!url || !key) return staticServices;
  try {
    const client = createClient(url, key);
    const { data, error } = await client
      .from('services')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error || !data?.length) return staticServices;
    return data.map(fromRow);
  } catch {
    return staticServices;
  }
}
