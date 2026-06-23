import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, amount, userId } = body;

    console.log(`[Mock Payment] Processing ${type} payment for user ${userId} of amount ${amount}`);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // For MVP, we always return success
    return NextResponse.json({
      success: true,
      transactionId: `mock_tx_${Math.random().toString(36).substring(7)}`,
      status: 'completed',
      message: 'Payment processed successfully (MOCK)'
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Invalid request' },
      { status: 400 }
    );
  }
}
