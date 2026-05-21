import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'Draft ID is required' }, { status: 400 });
    }

    // 1. Fetch draft to ensure it exists and check approval state
    const draft = await prisma.emailDraft.findUnique({
      where: { id },
      include: { lead: true }
    });

    if (!draft) {
      return NextResponse.json({ error: 'Email draft not found' }, { status: 404 });
    }

    // 2. Strict Human-In-The-Loop gating guardrail
    if (draft.status !== 'approved') {
      return NextResponse.json({ 
        error: 'Forbidden: Cannot send an unapproved email draft. Please approve the draft first.' 
      }, { status: 403 });
    }

    // 3. Simulate outreach sending (simulates slight network delay e.g. 100ms)
    await new Promise(resolve => setTimeout(resolve, 100));

    // 4. Update status of draft to 'sent' and record timestamp
    const sentDraft = await prisma.emailDraft.update({
      where: { id },
      data: {
        status: 'sent',
        sentAt: new Date()
      }
    });

    // 5. Update associated lead status to 'sent'
    await prisma.lead.update({
      where: { id: draft.leadId },
      data: {
        status: 'sent'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Email outreach sent successfully',
      draft: sentDraft
    });
  } catch (error: any) {
    console.error(`[Draft Send API] Failed to send draft:`, error);
    return NextResponse.json({ error: error.message || 'Failed to send draft' }, { status: 500 });
  }
}
