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
    const client = createClient(url, key, {
      global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
    });
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

const STATIC_TESTIMONIALS = [
  { id: '1', name: 'Jehnsen Enrique', car: 'Nissan Navara Owner', quote: 'I have been to every detailer in BGC. Samahuzai Carwash and Auto Detailing is the only one I trust with my Navara. The finish is mirror-grade.', rating: 5 },
  { id: '2', name: 'Dricks Espinosa', car: 'Range Rover Velar', quote: 'The lounge alone is worth it. I came in for a wash and left feeling like I had spent the morning at a five-star hotel.', rating: 5 },
  { id: '3', name: 'Vince Tacloban', car: 'BMW M3 Competition', quote: 'Ceramic coating turned out flawless. Six months in, still beading like the day I drove out. Worth every peso.', rating: 5 },
];

export async function fetchTestimonials() {
  if (!url || !key) return STATIC_TESTIMONIALS;
  try {
    // { global: { fetch } } opts out of Next.js fetch cache so the landing
    // page always gets live data instead of a cached response.
    const client = createClient(url, key, {
      global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
    });
    const { data, error } = await client
      .from('testimonials')
      .select('*')
      .eq('status', 'approved')
      .eq('is_visible', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) { console.error('[testimonials] fetch error', error); return STATIC_TESTIMONIALS; }
    if (!data?.length) return STATIC_TESTIMONIALS;
    return data.map(fromRow);
  } catch (e) {
    console.error('[testimonials] fetch exception', e);
    return STATIC_TESTIMONIALS;
  }
}
