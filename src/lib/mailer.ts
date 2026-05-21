import nodemailer from 'nodemailer';
import { decrypt } from './crypto';
import prisma from './prisma';

/**
 * Creates and returns a nodemailer transporter configured with decrypted workspace credentials
 */
export async function getSmtpTransporter(workspaceId: string) {
  const settings = await prisma.settings.findUnique({
    where: { workspaceId }
  });

  if (
    !settings || 
    !settings.smtpEnabled || 
    !settings.smtpHost || 
    !settings.smtpPort || 
    !settings.smtpUser || 
    !settings.smtpPassEncr
  ) {
    return null;
  }

  // Decrypt the stored SMTP password
  const password = decrypt(settings.smtpPassEncr);

  return nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpPort === 465, // true for port 465, false for 587/25/other TLS ports
    auth: {
      user: settings.smtpUser,
      pass: password,
    },
    connectionTimeout: 10000, // 10s connection timeout
  });
}

interface SendEmailParams {
  workspaceId: string;
  to: string;
  subject: string;
  body: string;
}

/**
 * Dispatches an email using the decrypted workspace SMTP credentials
 */
export async function sendOutreachEmail({ workspaceId, to, subject, body }: SendEmailParams) {
  const transporter = await getSmtpTransporter(workspaceId);
  if (!transporter) {
    throw new Error('SMTP is not enabled or credentials are not configured for this workspace.');
  }

  const settings = await prisma.settings.findUnique({
    where: { workspaceId }
  });

  const senderName = settings?.senderName || 'Athenalytics Team';
  // Fall back to SMTP user if senderEmail is not defined
  const senderEmail = settings?.senderEmail || settings?.smtpUser || 'outreach@athenalytics.co';

  const mailOptions = {
    from: `"${senderName}" <${senderEmail}>`,
    to,
    subject,
    text: body,
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
}
