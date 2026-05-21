import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getWorkspaceIdFromRequest, verifyWorkspaceAccess } from '@/lib/tenant';
import { logAuditEvent } from '@/lib/audit';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workspaceId = getWorkspaceIdFromRequest(request);

    const lead = await prisma.lead.findUnique({
      where: { id },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Tenant isolation enforcement
    verifyWorkspaceAccess(lead.workspaceId, workspaceId);

    const body = await request.json();
    const rejectionReason = body.rejectionReason || 'unspecified';

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectionReason,
      },
    });

    // Log audit event for compliance
    await logAuditEvent(
      workspaceId,
      'lead_reject',
      'Lead',
      id,
      {
        businessName: lead.businessName,
        reason: rejectionReason,
      }
    );

    return NextResponse.json(updatedLead);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
