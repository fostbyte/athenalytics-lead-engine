import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logAuditEvent } from './audit';
import prisma from './prisma';

// Mock Prisma
vi.mock('./prisma', () => ({
  default: {
    auditLog: {
      create: vi.fn(),
    }
  }
}));

describe('logAuditEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves a valid audit log event to the database', async () => {
    const mockLog = {
      id: 'log-1',
      workspaceId: 'w-test',
      actor: 'user-123',
      action: 'settings_update',
      entityType: 'Settings',
      entityId: 'settings-1',
      details: { before: {}, after: {} },
      createdAt: new Date(),
    };
    (prisma.auditLog.create as any).mockResolvedValue(mockLog);

    const result = await logAuditEvent(
      'w-test',
      'settings_update',
      'Settings',
      'settings-1',
      { before: {}, after: {} },
      'user-123'
    );

    expect(result).toEqual(mockLog);
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        workspaceId: 'w-test',
        actor: 'user-123',
        action: 'settings_update',
        entityType: 'Settings',
        entityId: 'settings-1',
        details: { before: {}, after: {} },
      }
    });
  });

  it('defaults actor to system-user when not specified', async () => {
    (prisma.auditLog.create as any).mockResolvedValue({ id: 'log-2' });

    await logAuditEvent('w-test', 'scoring', 'Lead', 'lead-99');

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        workspaceId: 'w-test',
        actor: 'system-user',
        action: 'scoring',
        entityType: 'Lead',
        entityId: 'lead-99',
        details: undefined,
      }
    });
  });

  it('catches database errors and returns null gracefully instead of throwing', async () => {
    (prisma.auditLog.create as any).mockRejectedValue(new Error('Neon database offline'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await logAuditEvent('w-test', 'scoring', 'Lead', 'lead-99');

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
