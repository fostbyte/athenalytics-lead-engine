import prisma from './prisma';

export type AuditAction = 
  | 'scoring' 
  | 'rescore' 
  | 'approval' 
  | 'send' 
  | 'settings_update' 
  | 'lead_reject'
  | 'enrichment_retry';

export type AuditEntityType = 'Lead' | 'EmailDraft' | 'Settings' | 'SearchJob';

/**
 * Logs an event into the structured AuditLog table for enterprise compliance.
 */
export async function logAuditEvent(
  workspaceId: string,
  action: AuditAction,
  entityType: AuditEntityType,
  entityId: string,
  details?: any,
  actor: string = 'system-user'
) {
  try {
    const log = await prisma.auditLog.create({
      data: {
        workspaceId,
        actor,
        action,
        entityType,
        entityId,
        details: details ? (details as any) : undefined,
      },
    });
    return log;
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Return null rather than failing the primary user action
    return null;
  }
}
