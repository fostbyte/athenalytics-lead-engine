import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const leadId = searchParams.get('leadId');
    const workspaceId = searchParams.get('workspaceId') || 'default-workspace';

    const whereClause: any = { workspaceId };
    
    if (status) {
      whereClause.status = status;
    }
    if (leadId) {
      whereClause.leadId = leadId;
    }

    const drafts = await prisma.emailDraft.findMany({
      where: whereClause,
      include: {
        lead: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      drafts
    });
  } catch (error: any) {
    console.error(`[Drafts List API] Failed to fetch drafts:`, error);
    return NextResponse.json({ error: 'Failed to fetch drafts' }, { status: 500 });
  }
}
