import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { scoreLead } from '@/lib/scoring';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { searchJobId } = body;

    if (!searchJobId) {
      return NextResponse.json({ error: 'searchJobId is required' }, { status: 400 });
    }

    // Find all leads belonging to this search job
    const leads = await prisma.lead.findMany({
      where: {
        searchJobId,
      },
      select: { id: true }
    });

    let scoredCount = 0;
    const failures: string[] = [];

    // Run scoring sequentially for reliability
    for (const lead of leads) {
      try {
        await scoreLead(lead.id);
        scoredCount++;
      } catch (err: any) {
        console.error(`[Scoring Worker] Failed to score lead ${lead.id}:`, err.message);
        failures.push(lead.id);
      }
    }

    return NextResponse.json({ 
      success: true, 
      count: scoredCount,
      failed: failures.length,
      failures
    });
  } catch (error: any) {
    console.error(`[Scoring Worker] Failed to process scoring:`, error);
    return NextResponse.json({ error: 'Failed to process scoring' }, { status: 500 });
  }
}
