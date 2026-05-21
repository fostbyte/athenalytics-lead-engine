import { NextResponse } from 'next/server';
import { draftEmail } from '@/lib/drafting';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
    }

    let tone: 'direct' | 'friendly' | 'professional' = 'friendly';
    try {
      const body = await request.json();
      if (body.tone && ['direct', 'friendly', 'professional'].includes(body.tone)) {
        tone = body.tone;
      }
    } catch {
      // Gracefully handle request without body (default tone is friendly)
    }

    const result = await draftEmail(id, tone);

    return NextResponse.json({
      success: true,
      subject: result.subject,
      body: result.body,
      personalizationPoints: result.personalizationPoints,
      draft: result.dbDraft
    });
  } catch (error: any) {
    console.error(`[Draft Email API] Failed to draft email:`, error);
    return NextResponse.json({ error: error.message || 'Failed to draft email' }, { status: 500 });
  }
}
