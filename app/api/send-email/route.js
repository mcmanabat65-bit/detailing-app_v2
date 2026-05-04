import { NextResponse } from 'next/server';

const FROM =
  process.env.EMAIL_FROM ?? 'Samahuzai Detailing <noreply@samahuzai.ph>';

export async function POST(req) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Silently skip when the env var isn't configured — callers check `skipped`.
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

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error('[send-email] Resend error:', data);
    return NextResponse.json(
      { error: data.message ?? 'Send failed.' },
      { status: res.status }
    );
  }
  return NextResponse.json({ ok: true, id: data.id });
}
