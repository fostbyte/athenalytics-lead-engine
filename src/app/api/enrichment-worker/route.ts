import { NextResponse } from 'next/server';
import { processEnrichmentForJob } from '@/lib/enrichment';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { searchJobId } = body;

    if (!searchJobId) {
      return NextResponse.json({ error: 'searchJobId is required' }, { status: 400 });
    }

    // Process enrichment in the background without blocking
    // For Vercel/Netlify we can return immediately and process if the execution time is short
    // However, for Next.js 14+ Edge/Serverless functions, dangling promises can be killed.
    // In a real MVP, we await it or use a proper queue.
    const result = await processEnrichmentForJob(searchJobId);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error(`Failed to process enrichment:`, error);
    return NextResponse.json({ error: 'Failed to process enrichment' }, { status: 500 });
  }
}
