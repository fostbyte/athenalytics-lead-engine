import { NextRequest, NextResponse } from 'next/server';
import { processDiscoveryJob } from '@/lib/worker';

export async function POST(req: NextRequest) {
  try {
    const { jobId } = await req.json();

    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    // In a real production system, this would be pushed to a queue (e.g. SQS, Inngest, or Netlify Background Functions).
    // For this MVP, we process it inline asynchronously, or block and wait if we want synchronous response.
    // We'll process it synchronously here since Vercel/Netlify often kill background processes not explicitly awaited.
    const result = await processDiscoveryJob(jobId);

    if (result.success) {
      return NextResponse.json({ success: true, count: result.count });
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
