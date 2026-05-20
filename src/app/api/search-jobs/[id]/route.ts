import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // In Next.js App Router, params is a promise in newer versions, but depending on the version 
    // it's a plain object. Awaiting params ensures compatibility with Next 15 changes.
    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const searchJob = await prisma.searchJob.findUnique({
      where: { id },
    });

    if (!searchJob) {
      return NextResponse.json(
        { error: 'Search job not found' },
        { status: 404 }
      );
    }

    // Usually we would enforce workspace isolation here:
    // const { searchParams } = new URL(req.url);
    // const workspaceId = searchParams.get('workspaceId');
    // if (searchJob.workspaceId !== workspaceId) return 403;

    return NextResponse.json({ success: true, searchJob }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching search job:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
