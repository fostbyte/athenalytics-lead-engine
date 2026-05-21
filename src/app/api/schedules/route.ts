import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.headers.get('x-workspace-id') || new URL(req.url).searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json({ error: 'x-workspace-id header or workspaceId parameter is required' }, { status: 400 });
    }

    const schedules = await prisma.scheduledSearch.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, schedules });
  } catch (err: any) {
    console.error('Error fetching schedules:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const workspaceId = req.headers.get('x-workspace-id');
    if (!workspaceId) {
      return NextResponse.json({ error: 'x-workspace-id header is required' }, { status: 400 });
    }

    const body = await req.json();
    const {
      vertical,
      locationType,
      city,
      state,
      zipCode,
      radiusMiles = 10,
      targetCount = 50,
      filters,
      interval = 'weekly'
    } = body;

    if (!vertical || !locationType) {
      return NextResponse.json({ error: 'Missing required fields (vertical, locationType)' }, { status: 400 });
    }

    if (locationType === 'city_state' && (!city || !state)) {
      return NextResponse.json({ error: 'City and state are required when locationType is city_state' }, { status: 400 });
    }

    if (locationType === 'zip' && !zipCode) {
      return NextResponse.json({ error: 'Zip code is required when locationType is zip' }, { status: 400 });
    }

    // Set first run to immediately (current timestamp) so the user gets quick feedback
    const nextRunAt = new Date();

    const schedule = await prisma.scheduledSearch.create({
      data: {
        workspaceId,
        vertical,
        locationType,
        city,
        state,
        zipCode,
        radiusMiles: parseInt(radiusMiles),
        targetCount: parseInt(targetCount),
        filters: filters ? filters : undefined,
        interval,
        isActive: true,
        nextRunAt
      }
    });

    return NextResponse.json({ success: true, schedule }, { status: 201 });
  } catch (err: any) {
    console.error('Error creating schedule:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
