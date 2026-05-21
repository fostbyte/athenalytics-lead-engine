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
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    totalUsers,
    totalJobs,
    totalLeads,
    totalDrafts,
    totalSent,
    googleMapsMonthly,
    googleMapsDaily,
    openRouterMonthly,
    openRouterDaily,
    placesMonthly,
    placesDaily,
    geocodingMonthly,
    geocodingDaily,
    workspaceStats,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.searchJob.count(),
    prisma.lead.count(),
    prisma.emailDraft.count(),
    prisma.emailDraft.count({ where: { status: 'sent' } }),
    // Google Maps monthly cost (places + geocoding)
    prisma.apiUsageLog.aggregate({
      where: {
        apiName: { in: ['places', 'geocoding'] },
        timestamp: { gte: startOfMonth },
      },
      _sum: { cost: true },
    }),
    // Google Maps today cost
    prisma.apiUsageLog.aggregate({
      where: {
        apiName: { in: ['places', 'geocoding'] },
        timestamp: { gte: startOfToday },
      },
      _sum: { cost: true },
    }),
    // OpenRouter monthly tokens
    prisma.apiUsageLog.aggregate({
      where: {
        apiName: 'openrouter',
        timestamp: { gte: startOfMonth },
      },
      _count: { id: true },
      _sum: { promptTokens: true, completionTokens: true },
    }),
    // OpenRouter daily tokens
    prisma.apiUsageLog.aggregate({
      where: {
        apiName: 'openrouter',
        timestamp: { gte: startOfToday },
      },
      _count: { id: true },
      _sum: { promptTokens: true, completionTokens: true },
    }),
    // Places monthly stats
    prisma.apiUsageLog.aggregate({
      where: {
        apiName: 'places',
        timestamp: { gte: startOfMonth },
      },
      _count: { id: true },
      _sum: { cost: true },
    }),
    // Places today stats
    prisma.apiUsageLog.aggregate({
      where: {
        apiName: 'places',
        timestamp: { gte: startOfToday },
      },
      _count: { id: true },
      _sum: { cost: true },
    }),
    // Geocoding monthly stats
    prisma.apiUsageLog.aggregate({
      where: {
        apiName: 'geocoding',
        timestamp: { gte: startOfMonth },
      },
      _count: { id: true },
      _sum: { cost: true },
    }),
    // Geocoding today stats
    prisma.apiUsageLog.aggregate({
      where: {
        apiName: 'geocoding',
        timestamp: { gte: startOfToday },
      },
      _count: { id: true },
      _sum: { cost: true },
    }),
    // Workspace count
    prisma.searchJob.groupBy({
      by: ['workspaceId'],
      _count: { id: true },
    }),
  ]);

  const monthlySpend = googleMapsMonthly._sum.cost || 0;
  const dailySpend = googleMapsDaily._sum.cost || 0;
  const safetyLimit = 140.00;
  const freeTierLimit = 200.00;

  const openRouterStats = {
    monthlyRequests: openRouterMonthly._count.id || 0,
    monthlyPromptTokens: openRouterMonthly._sum.promptTokens || 0,
    monthlyCompletionTokens: openRouterMonthly._sum.completionTokens || 0,
    monthlyTotalTokens: (openRouterMonthly._sum.promptTokens || 0) + (openRouterMonthly._sum.completionTokens || 0),
    dailyRequests: openRouterDaily._count.id || 0,
    dailyPromptTokens: openRouterDaily._sum.promptTokens || 0,
    dailyCompletionTokens: openRouterDaily._sum.completionTokens || 0,
    dailyTotalTokens: (openRouterDaily._sum.promptTokens || 0) + (openRouterDaily._sum.completionTokens || 0),
  };

  const googleMapsStats = {
    places: {
      rate: '$32.00 / 1,000 requests',
      monthlyRequests: placesMonthly._count.id || 0,
      monthlyCost: placesMonthly._sum.cost || 0,
      dailyRequests: placesDaily._count.id || 0,
      dailyCost: placesDaily._sum.cost || 0,
    },
    geocoding: {
      rate: '$5.00 / 1,000 requests',
      monthlyRequests: geocodingMonthly._count.id || 0,
      monthlyCost: geocodingMonthly._sum.cost || 0,
      dailyRequests: geocodingDaily._count.id || 0,
      dailyCost: geocodingDaily._sum.cost || 0,
    },
  };

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
        dailySpend,
        safetyLimit,
        freeTierLimit,
        percentageOfSafety: Math.min(Math.round((monthlySpend / safetyLimit) * 1000) / 10, 100),
        percentageOfFreeTier: Math.min(Math.round((monthlySpend / freeTierLimit) * 1000) / 10, 100),
        blocked: monthlySpend >= safetyLimit,
      },
      openRouterStats,
      googleMapsStats,
    },
  });
}

