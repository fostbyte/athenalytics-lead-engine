import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getWorkspaceIdFromRequest } from '@/lib/tenant';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse filters
    const search = searchParams.get('search') || '';
    const scoreBand = searchParams.get('scoreBand') || '';
    const status = searchParams.get('status') || '';
    const searchJobId = searchParams.get('searchJobId') || '';
    
    // Parse sorting
    const sortBy = searchParams.get('sortBy') || 'score';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
    
    // Parse pagination
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    // Build Prisma query condition
    const where: any = {
      workspaceId: getWorkspaceIdFromRequest(request),
    };

    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { state: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (scoreBand) {
      where.scoreBand = scoreBand;
    }

    if (status) {
      where.status = status;
    }

    if (searchJobId) {
      where.searchJobId = searchJobId;
    }

    // Build order object
    let orderBy: any = {};
    if (sortBy === 'score') {
      // Nulls last or standard sort
      orderBy = { score: sortOrder };
    } else if (sortBy === 'businessName') {
      orderBy = { businessName: sortOrder };
    } else if (sortBy === 'distanceMiles') {
      orderBy = { distanceMiles: sortOrder };
    } else {
      orderBy = { createdAt: sortOrder };
    }

    // Query DB
    const [leads, totalCount] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: { signals: true },
      }),
      prisma.lead.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      leads,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error: any) {
    console.error('[Leads API] Failed to fetch leads:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}
