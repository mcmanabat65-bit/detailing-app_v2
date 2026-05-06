const e = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const shell = (content) => `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0A0A0B;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="background:#141416;border:1px solid rgba(0,112,74,0.25);border-radius:8px;padding:36px 32px">
${content}
<p style="color:#6B6B72;font-size:12px;text-align:center;margin:24px 0 0">
  Samahuzai Carwash and Auto Detailing
</p>
</td></tr></table>
</td></tr></table>
</body></html>`;

const row = (label, value) =>
  `<tr>
    <td style="color:#6B6B72;font-size:13px;padding:5px 0;width:40%">${e(label)}</td>
    <td style="color:#F5F0E8;font-size:13px;padding:5px 0;text-align:right">${value}</td>
  </tr>`;

export const bookingReceivedHtml = ({
  id,
  customerName,
  serviceName,
  servicePrice,
  date,
  time,
  vehicle,
  vehicleYear,
}) => {
  const price = `&#8369;${Number(servicePrice ?? 0).toLocaleString('en-PH')}`;
  const firstName = e(customerName).split(' ')[0];

  return shell(`
    <div style="text-align:center;margin-bottom:28px">
      <div style="color:#00704A;font-size:10px;letter-spacing:0.3em;text-transform:uppercase;margin-bottom:8px">
        Received
      </div>
      <h1 style="color:#F5F0E8;font-size:26px;font-family:Georgia,serif;margin:0">
        We received your request.
      </h1>
    </div>

    <div style="background:#1C1C1F;border-radius:6px;padding:20px;margin-bottom:20px">
      <p style="color:#00704A;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 12px">
        Booking Details
      </p>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${row('Reference', `<span style="font-family:monospace;font-size:12px">${e(id)}</span>`)}
        ${row('Package', e(serviceName))}
        ${row('Date', e(date))}
        ${row('Time', e(time))}
        ${row('Vehicle', `${e(vehicleYear)} ${e(vehicle)}`)}
        ${row('Total', `<span style="color:#00704A;font-size:15px;font-weight:600">${price}</span>`)}
      </table>
    </div>

    <div style="background:rgba(0,112,74,0.06);border:1px solid rgba(0,112,74,0.25);border-radius:6px;padding:14px 16px;margin-bottom:20px">
      <p style="color:#00704A;font-size:13px;margin:0;line-height:1.6">
        &#8987; Your booking is <strong>pending confirmation</strong>. We&rsquo;ll send you another email once it&rsquo;s approved.
      </p>
    </div>

    <p style="color:#F5F0E8;font-size:14px;text-align:center;margin:0">
      Thank you, ${firstName}. We&rsquo;ll be in touch shortly.
    </p>`);
};

export const bookingConfirmationHtml = ({
  id,
  customerName,
  serviceName,
  servicePrice,
  date,
  time,
  vehicle,
  vehicleYear,
  isVip,
  coffeeOrder,
}) => {
  const price = `&#8369;${Number(servicePrice ?? 0).toLocaleString('en-PH')}`;
  const firstName = e(customerName).split(' ')[0];

  return shell(`
    <div style="text-align:center;margin-bottom:28px">
      <div style="color:#00704A;font-size:10px;letter-spacing:0.3em;text-transform:uppercase;margin-bottom:8px">
        Confirmed
      </div>
      <h1 style="color:#F5F0E8;font-size:26px;font-family:Georgia,serif;margin:0">
        Your detail is booked.
      </h1>
    </div>

    <div style="background:#1C1C1F;border-radius:6px;padding:20px;margin-bottom:20px">
      <p style="color:#00704A;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 12px">
        Booking Details
      </p>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${row('Reference', `<span style="font-family:monospace;font-size:12px">${e(id)}</span>`)}
        ${row('Package', e(serviceName))}
        ${row('Date', e(date))}
        ${row('Time', e(time))}
        ${row('Vehicle', `${e(vehicleYear)} ${e(vehicle)}`)}
        ${row('Total', `<span style="color:#00704A;font-size:15px;font-weight:600">${price}</span>`)}
        ${isVip && coffeeOrder ? row('Coffee', `<span style="color:#00704A">&#9749; ${e(coffeeOrder)} &mdash; on us</span>`) : ''}
      </table>
    </div>

    <p style="color:#F5F0E8;font-size:14px;text-align:center;margin:0">
      See you soon, ${firstName}.
    </p>`);
};

export const membershipStatusHtml = (member, status) => {
  const isApproved = status === 'approved';
  const accentColor = isApproved ? '#4CAF7D' : '#E05252';
  const heading = isApproved ? 'Welcome to the club.' : 'Membership application update.';
  const bodyText = isApproved
    ? `Your VIP membership has been approved. From your next booking under
       <strong style="color:#F5F0E8">${e(member.email)}</strong> your 10%&nbsp;discount
       and complimentary coffee will be applied automatically.`
    : `After review, we were unable to approve your membership application at this
       time. You are welcome to reapply in the future.`;

  const perksBlock = isApproved
    ? `<div style="background:rgba(0,112,74,0.08);border:1px solid rgba(0,112,74,0.25);
                   border-radius:6px;padding:16px;margin:20px 0">
        <p style="color:#00704A;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 10px">
          Your perks
        </p>
        <ul style="color:#F5F0E8;font-size:13px;margin:0;padding-left:18px;line-height:2">
          <li>10% off every service, every visit</li>
          <li>Free barista coffee while you wait</li>
          <li>Priority scheduling access</li>
          <li>Members-only lounge with Wi-Fi</li>
          <li>Birthday month special treatment</li>
        </ul>
      </div>`
    : '';

  return shell(`
    <div style="text-align:center;margin-bottom:28px">
      <div style="color:${accentColor};font-size:10px;letter-spacing:0.3em;text-transform:uppercase;margin-bottom:8px">
        ${isApproved ? 'Approved' : 'Update'}
      </div>
      <h1 style="color:#F5F0E8;font-size:26px;font-family:Georgia,serif;margin:0">
        ${heading}
      </h1>
    </div>

    <div style="background:#1C1C1F;border-radius:6px;padding:20px;margin-bottom:4px">
      <p style="color:#F5F0E8;font-size:14px;line-height:1.7;margin:0">
        Hi ${e(member.name).split(' ')[0]}, ${bodyText}
      </p>
    </div>

    ${perksBlock}`);
};
