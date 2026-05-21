import { NextResponse } from 'next/server';
import { scoreLead } from '@/lib/scoring';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
    }

    const result = await scoreLead(id);

    return NextResponse.json({
      success: true,
      lead: result.lead,
      score: result.score,
      scoreBand: result.scoreBand,
      reasons: result.reasons
    });
  } catch (error: any) {
    console.error(`[Rescore API] Failed to rescore lead:`, error);
    return NextResponse.json({ error: error.message || 'Failed to rescore lead' }, { status: 500 });
  }
}
