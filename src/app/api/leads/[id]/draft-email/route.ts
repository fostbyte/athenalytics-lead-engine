import { NextResponse } from 'next/server';
import { draftEmail } from '@/lib/drafting';
import prisma from '@/lib/prisma';
import { canPerformAction, incrementUsage } from '@/lib/limits';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
    }

    let tone: 'direct' | 'friendly' | 'professional' = 'friendly';
    try {
      const body = await request.json();
      if (body.tone && ['direct', 'friendly', 'professional'].includes(body.tone)) {
        tone = body.tone;
      }
    } catch {
      // Gracefully handle request without body (default tone is friendly)
    }

    // 1. Fetch lead to get the workspaceId
    const lead = await prisma.lead.findUnique({
      where: { id },
      select: { workspaceId: true },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const workspaceId = lead.workspaceId;

    // 2. SaaS resource limit check: Daily Drafts limit
    const quota = await canPerformAction(workspaceId, 'drafts');
    if (!quota.allowed) {
      return NextResponse.json(
        { 
          error: `Daily email drafts quota limit reached (${quota.limit}/${quota.limit}). Please upgrade your subscription tier in Settings to increase daily caps.`,
          limitReached: true,
          metric: 'drafts'
        },
        { status: 403 }
      );
    }

    const result = await draftEmail(id, tone);

    // 3. Increment drafts usage counter
    await incrementUsage(workspaceId, 'drafts');

    return NextResponse.json({
      success: true,
      subject: result.subject,
      body: result.body,
      personalizationPoints: result.personalizationPoints,
      draft: result.dbDraft
    });
  } catch (error: any) {
    console.error(`[Draft Email API] Failed to draft email:`, error);
    return NextResponse.json({ error: error.message || 'Failed to draft email' }, { status: 500 });
  }
}
