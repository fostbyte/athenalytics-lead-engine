import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendOutreachEmail, getSmtpTransporter } from './mailer';
import prisma from './prisma';
import nodemailer from 'nodemailer';
import { encrypt } from './crypto';

vi.mock('./prisma', () => ({
  default: {
    settings: {
      findUnique: vi.fn(),
    }
  }
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(),
  }
}));

describe('SMTP Mailer Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null if SMTP is disabled', async () => {
    (prisma.settings.findUnique as any).mockResolvedValue({
      smtpEnabled: false,
    });

    const transporter = await getSmtpTransporter('workspace-1');
    expect(transporter).toBeNull();
  });

  it('configures nodemailer transporter if SMTP is enabled', async () => {
    const encPass = encrypt('mypassword123');
    (prisma.settings.findUnique as any).mockResolvedValue({
      smtpEnabled: true,
      smtpHost: 'smtp.gmail.com',
      smtpPort: 465,
      smtpUser: 'user@gmail.com',
      smtpPassEncr: encPass,
    });

    const mockSendMail = vi.fn();
    (nodemailer.createTransport as any).mockReturnValue({
      sendMail: mockSendMail,
    });

    const transporter = await getSmtpTransporter('workspace-1');
    expect(transporter).toBeDefined();
    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: 'user@gmail.com',
        pass: 'mypassword123',
      },
      connectionTimeout: 10000,
    });
  });

  it('throws an error during sending if SMTP is not configured', async () => {
    (prisma.settings.findUnique as any).mockResolvedValue({
      smtpEnabled: false,
    });

    await expect(
      sendOutreachEmail({
        workspaceId: 'workspace-1',
        to: 'lead@example.com',
        subject: 'Hello',
        body: 'Warm outreach',
      })
    ).rejects.toThrow('SMTP is not enabled or credentials are not configured for this workspace.');
  });
});
