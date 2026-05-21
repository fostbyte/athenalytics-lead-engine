import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getWorkspaceIdFromRequest, getWorkspaceSettings } from '@/lib/tenant';
import { decrypt } from '@/lib/crypto';

export async function POST(request: Request) {
  try {
    const workspaceId = getWorkspaceIdFromRequest(request);
    const body = await request.json();

    const { smtpHost, smtpPort, smtpUser, smtpPass, testEmailRecipient } = body;

    if (!smtpHost || !smtpPort || !smtpUser) {
      return NextResponse.json({ error: 'SMTP Host, Port, and User are required to test connection.' }, { status: 400 });
    }

    if (!testEmailRecipient) {
      return NextResponse.json({ error: 'A test recipient email address is required.' }, { status: 400 });
    }

    let password = '';
    if (smtpPass !== undefined && smtpPass !== null && smtpPass !== '') {
      password = smtpPass;
    } else {
      // Load saved password from database
      const settings = await getWorkspaceSettings(workspaceId);
      if (!settings.smtpPassEncr) {
        return NextResponse.json({ error: 'No saved SMTP password found. Please enter a password.' }, { status: 400 });
      }
      password = decrypt(settings.smtpPassEncr);
    }

    // Configure nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // True for 465, false for 587/25
      auth: {
        user: smtpUser,
        pass: password,
      },
      connectionTimeout: 8000, // 8 second timeout
    });

    // 1. Verify credentials and server connection handshake
    await transporter.verify();

    // 2. Dispatch a beautiful connection test email to confirm relays are fully functional
    const mailOptions = {
      from: `"${smtpUser}" <${smtpUser}>`,
      to: testEmailRecipient,
      subject: '🚀 Athena Lead Engine: SMTP Connection Test Success!',
      text: `Hello!\n\nThis is a secure connection test email from your Athena Lead Engine workspace.\n\nYour SMTP server connection settings have been verified successfully and are ready to send outreach emails!\n\nConfigured SMTP Server: ${smtpHost}:${smtpPort}\nConfigured SMTP User: ${smtpUser}\nTimestamp: ${new Date().toISOString()}\n\nWarm regards,\nThe Athena Team`,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      message: 'SMTP connection verified and test email successfully dispatched.',
    });
  } catch (error: any) {
    console.error('[SMTP Test Connection Error]:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to establish connection to SMTP server.',
    }, { status: 500 });
  }
}
