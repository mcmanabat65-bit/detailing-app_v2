/**
 * Fire-and-forget email helper. Calls the /api/send-email route (Resend).
 * Silently skips when RESEND_API_KEY is not configured; logs on failure.
 * Pass an optional `onError` callback to surface errors (e.g. showToast).
 */
export const sendEmail = (to, subject, html, onError) => {
  fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, subject, html }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (!data.ok && !data.skipped) {
        const msg = data.error || 'Email could not be sent.';
        console.error('[sendEmail]', msg);
        onError?.(msg);
      }
    })
    .catch((err) => {
      console.error('[sendEmail] fetch failed', err);
      onError?.('Email confirmation could not be sent.');
    });
};
