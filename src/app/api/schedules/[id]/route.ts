import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = req.headers.get('x-workspace-id');
    if (!workspaceId) {
      return NextResponse.json({ error: 'x-workspace-id header is required' }, { status: 400 });
    }

    const { id } = await params;
    const body = await req.json();
    
    // Find schedule to ensure it belongs to the workspace
    const schedule = await prisma.scheduledSearch.findFirst({
      where: { id, workspaceId }
    });

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found or unauthorized' }, { status: 404 });
    }

    const {
      vertical,
      locationType,
      city,
      state,
      zipCode,
      radiusMiles,
      targetCount,
      filters,
      interval,
      isActive
    } = body;

    const updateData: any = {};
    if (vertical !== undefined) updateData.vertical = vertical;
    if (locationType !== undefined) updateData.locationType = locationType;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (zipCode !== undefined) updateData.zipCode = zipCode;
    if (radiusMiles !== undefined) updateData.radiusMiles = parseInt(radiusMiles);
    if (targetCount !== undefined) updateData.targetCount = parseInt(targetCount);
    if (filters !== undefined) updateData.filters = filters;
    if (interval !== undefined) updateData.interval = interval;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await prisma.scheduledSearch.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ success: true, schedule: updated });
  } catch (err: any) {
    console.error('Error updating schedule:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = req.headers.get('x-workspace-id');
    if (!workspaceId) {
      return NextResponse.json({ error: 'x-workspace-id header is required' }, { status: 400 });
    }

    const { id } = await params;

    // Find schedule to ensure it belongs to the workspace
    const schedule = await prisma.scheduledSearch.findFirst({
      where: { id, workspaceId }
    });

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found or unauthorized' }, { status: 404 });
    }

    await prisma.scheduledSearch.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Schedule deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting schedule:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
