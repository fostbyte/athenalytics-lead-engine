import { NextRequest, NextResponse } from 'next/server';
import { triggerScheduledSearches } from '@/lib/scheduler';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const result = await triggerScheduledSearches();
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[Cron API] Trigger failed:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const result = await triggerScheduledSearches();
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[Cron API] Trigger failed:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
