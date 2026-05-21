import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getWorkspaceIdFromRequest, verifyWorkspaceAccess } from '@/lib/tenant';

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const requestWorkspaceId = getWorkspaceIdFromRequest(request);

    // Load draft first to verify workspace ownership
    const existingDraft = await prisma.emailDraft.findUnique({
      where: { id },
    });

    if (!existingDraft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    // Verify tenant boundary
    verifyWorkspaceAccess(existingDraft.workspaceId, requestWorkspaceId);

    const body = await request.json();
    const { subject, body: emailBody, status, recipientEmail } = body;

    const updateData: any = {};
    if (subject !== undefined) updateData.subject = subject;
    if (emailBody !== undefined) updateData.body = emailBody;
    if (status !== undefined) updateData.status = status;

    if (recipientEmail !== undefined) {
      await prisma.lead.update({
        where: { id: existingDraft.leadId },
        data: { contactEmail: recipientEmail }
      });
    }

    const draft = await prisma.emailDraft.update({
      where: { id },
      data: updateData,
      include: { lead: true }
    });

    return NextResponse.json({
      success: true,
      draft
    });
  } catch (error: any) {
    console.error(`[Draft Update API] Failed to update draft:`, error);
    return NextResponse.json({ error: error.message || 'Failed to update draft' }, { status: 500 });
  }
}


export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const requestWorkspaceId = getWorkspaceIdFromRequest(request);

    const existingDraft = await prisma.emailDraft.findUnique({
      where: { id },
    });

    if (!existingDraft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    // Verify tenant boundary
    verifyWorkspaceAccess(existingDraft.workspaceId, requestWorkspaceId);

    const draft = await prisma.emailDraft.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Draft discarded successfully',
      draft
    });
  } catch (error: any) {
    console.error(`[Draft Discard API] Failed to discard draft:`, error);
    return NextResponse.json({ error: error.message || 'Failed to discard draft' }, { status: 500 });
  }
}
