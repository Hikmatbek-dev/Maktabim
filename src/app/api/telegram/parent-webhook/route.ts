import { NextRequest, NextResponse } from 'next/server';
import { processTelegramUpdate } from '@/lib/parentBotService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();
    // Non-blocking processing
    processTelegramUpdate(update).catch((err) => {
      console.error('Error processing update in webhook:', err);
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Telegram webhook error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Maktabim Telegram Parent Bot Webhook Active' });
}
