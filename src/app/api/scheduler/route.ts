import { NextResponse } from 'next/server';
import { processGrowth } from '@/services/growthService';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    await processGrowth();
    return NextResponse.json({ success: true, message: 'Scheduler processed successfully' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[Scheduler API] Error:', error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
