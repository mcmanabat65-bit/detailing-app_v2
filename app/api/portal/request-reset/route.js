import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabaseAdmin, isAdminConfigured } from '@/lib/supabase-admin';
import { passwordResetHtml } from '@/lib/emailTemplates';

const FROM =
  process.env.EMAIL_FROM ?? 'Samahuzai Detailing <onboarding@resend.dev>';

// Always respond the same way whether or not the email maps to an account, so
// this endpoint can't be used to enumerate registered member emails.
const genericOk = () => NextResponse.json({ ok: true });

export async function POST(request) {
  if (!isAdminConfigured) {
    return NextResponse.json(
      { error: 'Server is not configured for password reset. Set SUPABASE_SERVICE_ROLE_KEY.' },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const email = (body?.email || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
  }

  // Only send resets to accounts that belong to an APPROVED member — this is
  // the member portal, not admin. Admins reset via the Supabase dashboard.
  const { data: member, error: memberError } = await supabaseAdmin
    .from('members')
    .select('name, status')
    .ilike('email', email)
    .maybeSingle();

  if (memberError) {
    console.error('[request-reset] member lookup failed:', memberError.message);
    // Fail closed but generically — don't reveal internals to the caller.
    return genericOk();
  }
  if (!member || member.status !== 'approved') {
    return genericOk();
  }

  // Mint a recovery link. Supabase generates the verify URL; after the user
  // clicks it, Supabase redirects to redirectTo with a recovery session.
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    request.headers.get('origin') ||
    new URL(request.url).origin;

  const { data: linkData, error: linkError } =
    await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${origin}/portal/reset-password` },
    });

  if (linkError) {
    // No auth user for this email (e.g. approved but never completed sign-up).
    // Stay generic so we don't leak which emails have a login.
    console.error('[request-reset] generateLink failed:', linkError.message);
    return genericOk();
  }

  const resetUrl = linkData?.properties?.action_link;
  if (!resetUrl) return genericOk();

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // No email provider configured — nothing to send, but stay generic.
    console.warn('[request-reset] RESEND_API_KEY not set; skipping send.');
    return genericOk();
  }

  const resend = new Resend(apiKey);
  const { error: sendError } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Reset your Samahuzai password',
    html: passwordResetHtml({ name: member.name, resetUrl }),
  });

  if (sendError) {
    console.error('[request-reset] Resend error:', sendError.message ?? sendError);
    // Still generic — the user is told to check their inbox either way.
  }

  return genericOk();
}
