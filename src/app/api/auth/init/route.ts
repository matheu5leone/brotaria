import { NextResponse } from 'next/server';
import { initializeUser } from '@/services/inventoryService';

export async function POST(request: Request) {
  try {
    const { userId, email, nickname } = await request.json();

    if (!userId || !email) {
      return NextResponse.json({ error: 'Missing userId or email' }, { status: 400 });
    }

    await initializeUser(userId, email, nickname ?? null);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Auth Init API] Error:', error);
    return NextResponse.json({ error: 'Failed to initialize user' }, { status: 500 });
  }
}
