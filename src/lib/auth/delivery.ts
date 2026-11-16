import nodemailer from 'nodemailer';
export async function deliverEmail(email: string, token: string) {
  const url = new URL(
    '/auth/verify',
    process.env.APP_URL || 'http://localhost:3000',
  );
  url.searchParams.set('identifier', email);
  url.searchParams.set('token', token);
  if (!process.env.SMTP_HOST) {
    if (process.env.NODE_ENV === 'production')
      throw new Error('SMTP delivery not configured');
    console.info(`[JobPilotAI email] ${url}`);
    return;
  }
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });
  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Your JobPilotAI sign-in link',
    text: `Sign in to JobPilotAI: ${url}\nThis link expires in 15 minutes. If you did not request it, ignore this email.`,
  });
}
export async function deliverSms(phone: string, code: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  if (!sid || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_FROM) {
    if (process.env.NODE_ENV === 'production')
      throw new Error('SMS delivery not configured');
    console.info(`[JobPilotAI SMS] ${phone}: ${code}`);
    return;
  }
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: phone,
        From: process.env.TWILIO_FROM,
        Body: `Your JobPilotAI code is ${code}. Expires in 10 minutes.`,
      }),
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!response.ok) throw new Error('SMS delivery failed');
}
