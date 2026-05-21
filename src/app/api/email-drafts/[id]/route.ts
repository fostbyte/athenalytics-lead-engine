import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const { subject, body: emailBody, status } = body;

    const updateData: any = {};
    if (subject !== undefined) updateData.subject = subject;
    if (emailBody !== undefined) updateData.body = emailBody;
    if (status !== undefined) updateData.status = status;

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
