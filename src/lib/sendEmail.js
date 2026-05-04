/**
 * Fire-and-forget email helper. Calls the /api/send-email route (Resend).
 * Silently skips when RESEND_API_KEY is not configured; logs on failure.
 */
export const sendEmail = (to, subject, html) => {
  fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, subject, html }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (!data.ok && !data.skipped) {
        console.error('[sendEmail]', data.error);
      }
    })
    .catch((err) => console.error('[sendEmail] fetch failed', err));
};
