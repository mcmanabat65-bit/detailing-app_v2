import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin, isAdminConfigured } from '@/lib/supabase-admin';

const VALID_ROLES = ['super_admin', 'admin'];

const err = (message, status = 400) =>
  NextResponse.json({ error: message }, { status });

export async function POST(request) {
  if (!isAdminConfigured) {
    return err(
      'Server is not configured for account creation. Set SUPABASE_SERVICE_ROLE_KEY.',
      500
    );
  }

  // --- 1. Identify the caller from their session cookie ---------------------
  const cookieStore = cookies();
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );
  const { data: { user }, error: userError } = await authClient.auth.getUser();
  if (userError || !user?.email) {
    return err('Not authenticated.', 401);
  }
  const callerEmail = user.email.trim().toLowerCase();

  // --- 2. Authorize: caller must be a super_admin --------------------------
  // (Bootstrap: if no super_admin exists yet, any authenticated user may act.)
  const { data: adminRows, error: rowsError } = await supabaseAdmin
    .from('admin_users')
    .select('email, role');
  if (rowsError) return err(rowsError.message, 500);

  const hasSuperAdmin = (adminRows || []).some((r) => r.role === 'super_admin');
  const callerIsSuper = (adminRows || []).some(
    (r) => (r.email || '').toLowerCase() === callerEmail && r.role === 'super_admin'
  );
  if (hasSuperAdmin && !callerIsSuper) {
    return err('Only a super admin can create staff accounts.', 403);
  }

  // --- 3. Validate input ----------------------------------------------------
  let body;
  try { body = await request.json(); } catch { return err('Invalid request body.'); }
  const email = (body?.email || '').trim().toLowerCase();
  const password = body?.password ?? '';
  const role = body?.role;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return err('A valid email is required.');
  }
  if (!VALID_ROLES.includes(role)) return err('Invalid role.');
  // Password is optional — when omitted we only assign a role to an account
  // that already exists. When provided it must meet Supabase's minimum.
  const wantsAccount = password !== '' && password != null;
  if (wantsAccount && String(password).length < 6) {
    return err('Password must be at least 6 characters.');
  }

  // --- 4. Lockout prevention: secure the bootstrap super admin --------------
  // If no super_admin exists yet and the caller isn't the one being added,
  // persist the caller as super_admin first so they can't lock themselves out.
  if (!hasSuperAdmin && callerEmail !== email) {
    const { error: selfError } = await supabaseAdmin
      .from('admin_users')
      .upsert({ email: callerEmail, role: 'super_admin' }, { onConflict: 'email' });
    if (selfError) return err(`Could not secure your access: ${selfError.message}`, 500);
  }

  // --- 5. Create the auth account (if a password was provided) --------------
  let accountCreated = false;
  if (wantsAccount) {
    const { error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // auto-confirm so they can log in immediately
    });
    if (createError) {
      const exists = /already.*(registered|exists)|duplicate/i.test(createError.message);
      if (!exists) return err(createError.message, 500);
      // Account already exists — fall through and just (re)assign the role.
    } else {
      accountCreated = true;
    }
  }

  // --- 6. Assign / update the role -----------------------------------------
  const { data: roleRow, error: roleError } = await supabaseAdmin
    .from('admin_users')
    .upsert({ email, role }, { onConflict: 'email' })
    .select()
    .single();
  if (roleError) return err(roleError.message, 500);

  return NextResponse.json({ ok: true, accountCreated, adminUser: roleRow });
}
