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

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const skip = (page - 1) * limit;

  const [jobs, total] = await Promise.all([
    prisma.searchJob.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        workspaceId: true,
        vertical: true,
        locationType: true,
        city: true,
        state: true,
        zipCode: true,
        radiusMiles: true,
        targetCount: true,
        status: true,
        totalFound: true,
        totalEnriched: true,
        totalScored: true,
        error: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.searchJob.count(),
  ]);

  return NextResponse.json({ success: true, jobs, total, page, limit });
}
