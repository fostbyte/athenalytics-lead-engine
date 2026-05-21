import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.headers.get('x-workspace-id') || new URL(req.url).searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json({ error: 'x-workspace-id header or workspaceId parameter is required' }, { status: 400 });
    }

    const notifications = await prisma.notification.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, notifications });
  } catch (err: any) {
    console.error('Error fetching notifications:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const workspaceId = req.headers.get('x-workspace-id');
    if (!workspaceId) {
      return NextResponse.json({ error: 'x-workspace-id header is required' }, { status: 400 });
    }

    const body = await req.json();
    const { id, ids } = body;

    if (id) {
      // Mark a single notification as read
      await prisma.notification.updateMany({
        where: { id, workspaceId },
        data: { isRead: true }
      });
    } else if (ids && Array.isArray(ids)) {
      // Mark a batch of notifications as read
      await prisma.notification.updateMany({
        where: { id: { in: ids }, workspaceId },
        data: { isRead: true }
      });
    } else {
      // Mark ALL notifications for the workspace as read
      await prisma.notification.updateMany({
        where: { workspaceId, isRead: false },
        data: { isRead: true }
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error updating notifications:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const workspaceId = req.headers.get('x-workspace-id');
    if (!workspaceId) {
      return NextResponse.json({ error: 'x-workspace-id header is required' }, { status: 400 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (id) {
      // Delete specific notification
      await prisma.notification.deleteMany({
        where: { id, workspaceId }
      });
    } else {
      // Delete all notifications for the workspace
      await prisma.notification.deleteMany({
        where: { workspaceId }
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting notifications:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
