import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getWorkspaceIdFromRequest, verifyWorkspaceAccess } from '@/lib/tenant';
import { logAuditEvent } from '@/lib/audit';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const requestWorkspaceId = getWorkspaceIdFromRequest(request);

    if (!id) {
      return NextResponse.json({ error: 'Draft ID is required' }, { status: 400 });
    }

    // 1. Fetch draft to ensure it exists
    const draft = await prisma.emailDraft.findUnique({
      where: { id },
      include: { lead: true }
    });

    if (!draft) {
      return NextResponse.json({ error: 'Email draft not found' }, { status: 404 });
    }

    // Tenant boundary verification
    verifyWorkspaceAccess(draft.workspaceId, requestWorkspaceId);

    // 2. Perform transaction: update draft to 'approved' and lead to 'approved'
    const updatedDraft = await prisma.emailDraft.update({
      where: { id },
      data: {
        status: 'approved',
        approvedBy: 'default-user'
      }
    });

    await prisma.lead.update({
      where: { id: draft.leadId },
      data: {
        status: 'approved'
      }
    });

    // Log compliance audit event
    await logAuditEvent(
      draft.workspaceId,
      'approval',
      'EmailDraft',
      id,
      {
        businessName: draft.lead.businessName,
        approvedBy: 'default-user',
      }
    );

    return NextResponse.json({
      success: true,
      draft: updatedDraft
    });
  } catch (error: any) {
    console.error(`[Draft Approve API] Failed to approve draft:`, error);
    return NextResponse.json({ error: error.message || 'Failed to approve draft' }, { status: 500 });
  }
}
