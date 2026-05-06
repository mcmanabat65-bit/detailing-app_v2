import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Resend requires a verified domain for the `from` address.
// Until you verify samahuzai.ph in your Resend dashboard, the built-in
// sandbox address onboarding@resend.dev works — but only delivers to the
// account owner's email address.
// Once your domain is verified, set in .env:
//   EMAIL_FROM=Samahuzai Detailing <noreply@samahuzai.ph>
const FROM =
  process.env.EMAIL_FROM ?? 'Samahuzai Detailing <onboarding@resend.dev>';

export async function POST(req) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, skipped: true });
  }

  let to, subject, html;
  try {
    ({ to, subject, html } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }
  if (!to || !subject || !html) {
    return NextResponse.json(
      { error: 'Missing to, subject, or html.' },
      { status: 400 }
    );
  }

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: FROM,
    to,
    subject,
    html,
  });

  if (error) {
    console.error('[send-email] Resend error:', error);
    return NextResponse.json(
      { error: error.message ?? 'Send failed.' },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, id: data.id });
}
