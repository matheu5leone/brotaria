import { NextResponse } from 'next/server';
import { waterPlant } from '@/services/growthService';

export async function POST(request: Request) {
  try {
    const { plantId } = await request.json();
    
    if (!plantId) {
      return NextResponse.json({ error: 'Missing plantId' }, { status: 400 });
    }

    const result = await waterPlant(plantId);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Water API] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to water plant' }, { status: 500 });
  }
}
