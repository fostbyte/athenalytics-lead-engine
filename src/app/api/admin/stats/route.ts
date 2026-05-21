import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import prisma from '@/lib/prisma';

function adminOnly(session: any) {
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  const denied = adminOnly(session);
  if (denied) return denied;

  const [totalUsers, totalJobs, totalLeads, totalDrafts, totalSent] = await Promise.all([
    prisma.user.count(),
    prisma.searchJob.count(),
    prisma.lead.count(),
    prisma.emailDraft.count(),
    prisma.emailDraft.count({ where: { status: 'sent' } }),
  ]);

  const workspaceStats = await prisma.searchJob.groupBy({
    by: ['workspaceId'],
    _count: { id: true },
  });

  return NextResponse.json({
    success: true,
    stats: {
      totalUsers,
      totalWorkspaces: workspaceStats.length,
      totalJobs,
      totalLeads,
      totalDrafts,
      totalSent,
    },
  });
}
