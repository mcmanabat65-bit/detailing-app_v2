import { NextResponse } from 'next/server';
import { createMiddlewareClient } from '@/lib/supabase-middleware';

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next({ request });

  // Only guard admin routes (not the login page itself)
  if (!pathname.startsWith('/admin') || pathname === '/admin/login') {
    return response;
  }

  const { supabase } = createMiddlewareClient(request, response);

  // If Supabase isn't configured, fall through to client-side guard
  if (!supabase) return response;

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*'],
};
