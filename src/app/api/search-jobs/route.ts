import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      workspaceId,
      vertical,
      locationType,
      city,
      state,
      zipCode,
      radiusMiles = 10,
      targetCount = 50,
      filters,
    } = body;

    if (!workspaceId || !vertical || !locationType) {
      return NextResponse.json(
        { error: 'Missing required fields (workspaceId, vertical, locationType)' },
        { status: 400 }
      );
    }

    if (locationType === 'city_state' && (!city || !state)) {
      return NextResponse.json(
        { error: 'City and state are required when locationType is city_state' },
        { status: 400 }
      );
    }

    if (locationType === 'zip' && !zipCode) {
      return NextResponse.json(
        { error: 'Zip code is required when locationType is zip' },
        { status: 400 }
      );
    }

    const searchJob = await prisma.searchJob.create({
      data: {
        workspaceId,
        vertical,
        locationType,
        city,
        state,
        zipCode,
        radiusMiles,
        targetCount,
        filters: filters ? JSON.stringify(filters) : null,
        status: 'queued',
        totalFound: 0,
        totalEnriched: 0,
        totalScored: 0,
      },
    });

    return NextResponse.json({ success: true, searchJob }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating search job:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    const jobs = await prisma.searchJob.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ success: true, jobs }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching search jobs:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
