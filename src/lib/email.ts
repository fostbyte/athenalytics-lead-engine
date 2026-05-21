/**
 * Email delivery using Resend (https://resend.com).
 * Free tier: 3,000 emails/month, 100/day.
 *
 * Setup:
 * 1. Sign up at resend.com
 * 2. Add your domain (or use onboarding@resend.dev for testing)
 * 3. Create an API key and set RESEND_API_KEY in .env
 */
import { Resend } from 'resend';

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.startsWith('PLACEHOLDER')) {
    return null;
  }
  return new Resend(apiKey);
}

function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
}

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

export async function sendPasswordResetEmail(
  toEmail: string,
  toName: string,
  resetToken: string
): Promise<{ success: boolean; error?: string }> {
  const resend = getResendClient();
  const resetUrl = `${getAppUrl()}/reset-password?token=${resetToken}`;

  if (!resend) {
    // Dev fallback: log to console so developers can test without Resend
    console.log('\n[Email] Password Reset (Resend not configured — CONSOLE LOG ONLY)');
    console.log(`  To: ${toEmail}`);
    console.log(`  Reset URL: ${resetUrl}`);
    console.log('  (Set RESEND_API_KEY in .env to send real emails)\n');
    return { success: true };
  }

  try {
    const { error } = await resend.emails.send({
      from: `Athenalytics <${getFromEmail()}>`,
      to: [toEmail],
      subject: 'Reset your Athenalytics password',
      html: buildPasswordResetEmailHtml(toName, resetUrl),
    });

    if (error) {
      console.error('[Email] Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Email] sendPasswordResetEmail exception:', err.message);
    return { success: false, error: err.message };
  }
}

export async function sendWelcomeEmail(
  toEmail: string,
  toName: string
): Promise<void> {
  const resend = getResendClient();

  if (!resend) {
    console.log(`[Email] Welcome email skipped (Resend not configured) — would send to ${toEmail}`);
    return;
  }

  try {
    await resend.emails.send({
      from: `Athenalytics <${getFromEmail()}>`,
      to: [toEmail],
      subject: 'Welcome to Athenalytics Lead Engine',
      html: buildWelcomeEmailHtml(toName),
    });
  } catch (err: any) {
    console.error('[Email] sendWelcomeEmail exception:', err.message);
  }
}

// ─── Email Templates ──────────────────────────────────────────────────────────

function buildPasswordResetEmailHtml(name: string, resetUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your password</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="560" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#1e293b,#0f172a);border:1px solid rgba(99,102,241,0.3);border-radius:16px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px;text-align:center;">
              <div style="font-size:24px;font-weight:700;color:#fff;letter-spacing:-0.5px;">⚡ Athenalytics</div>
              <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-top:4px;">Lead Engine</div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 32px;">
              <h2 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#f1f5f9;">Hi ${name},</h2>
              <p style="margin:0 0 24px;font-size:15px;color:#94a3b8;line-height:1.6;">
                We received a request to reset the password for your Athenalytics account.
                Click the button below to set a new password. This link expires in <strong style="color:#e2e8f0;">1 hour</strong>.
              </p>
              <div style="text-align:center;margin:32px 0;">
                <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:0.3px;">
                  Reset Password
                </a>
              </div>
              <p style="margin:0 0 8px;font-size:13px;color:#64748b;">
                If the button doesn't work, copy and paste this link:
              </p>
              <p style="margin:0;font-size:12px;color:#4f46e5;word-break:break-all;">${resetUrl}</p>
              <hr style="border:none;border-top:1px solid rgba(99,102,241,0.2);margin:32px 0;">
              <p style="margin:0;font-size:13px;color:#475569;">
                If you didn't request a password reset, you can safely ignore this email. Your password won't be changed.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background:rgba(0,0,0,0.2);text-align:center;">
              <p style="margin:0;font-size:12px;color:#334155;">
                &copy; ${new Date().getFullYear()} Athenalytics. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

function buildWelcomeEmailHtml(name: string): string {
  const appUrl = getAppUrl();
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to Athenalytics</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#1e293b;border:1px solid rgba(99,102,241,0.3);border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px;text-align:center;">
              <div style="font-size:24px;font-weight:700;color:#fff;">⚡ Athenalytics</div>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 32px;">
              <h2 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#f1f5f9;">Welcome, ${name}! 🎉</h2>
              <p style="margin:0 0 24px;font-size:15px;color:#94a3b8;line-height:1.6;">
                Your Athenalytics Lead Engine account is ready. Start discovering, scoring, and reaching out to real local business leads.
              </p>
              <div style="text-align:center;margin:32px 0;">
                <a href="${appUrl}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">
                  Open Lead Engine
                </a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}
