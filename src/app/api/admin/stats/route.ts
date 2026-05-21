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

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalUsers, totalJobs, totalLeads, totalDrafts, totalSent, usageAggregate] = await Promise.all([
    prisma.user.count(),
    prisma.searchJob.count(),
    prisma.lead.count(),
    prisma.emailDraft.count(),
    prisma.emailDraft.count({ where: { status: 'sent' } }),
    prisma.apiUsageLog.aggregate({
      where: {
        timestamp: {
          gte: startOfMonth,
        },
      },
      _sum: {
        cost: true,
      },
    }),
  ]);

  const monthlySpend = usageAggregate._sum.cost || 0;
  const safetyLimit = 140.00;
  const freeTierLimit = 200.00;

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
      googleMapsSpend: {
        monthlySpend,
        safetyLimit,
        freeTierLimit,
        percentageOfSafety: Math.min(Math.round((monthlySpend / safetyLimit) * 1000) / 10, 100),
        percentageOfFreeTier: Math.min(Math.round((monthlySpend / freeTierLimit) * 1000) / 10, 100),
        blocked: monthlySpend >= safetyLimit,
      },
    },
  });
}

