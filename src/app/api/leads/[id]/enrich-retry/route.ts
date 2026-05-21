import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getWorkspaceIdFromRequest, verifyWorkspaceAccess } from '@/lib/tenant';
import { logAuditEvent } from '@/lib/audit';
import { enrichLead } from '@/lib/enrichment';
import { scoreLead } from '@/lib/scoring';

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

    // Tenant isolation verification
    verifyWorkspaceAccess(lead.workspaceId, workspaceId);

    // Perform enrichment
    const enrichResult = await enrichLead(id);

    // Automatically score the newly enriched lead to ensure consistency
    const scoringResult = await scoreLead(id);

    // Log the audit event for compliance
    await logAuditEvent(
      workspaceId,
      'enrichment_retry',
      'Lead',
      id,
      {
        businessName: lead.businessName,
        status: 'enriched_and_scored',
        score: scoringResult.score,
      }
    );

    const finalLead = await prisma.lead.findUnique({
      where: { id },
      include: { signals: true },
    });

    return NextResponse.json({
      success: true,
      lead: finalLead,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
