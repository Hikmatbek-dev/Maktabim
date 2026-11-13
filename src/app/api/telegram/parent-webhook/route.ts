import { NextRequest, NextResponse } from 'next/server';
import { processTelegramUpdate } from '@/lib/parentBotService';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();
    console.log('[Telegram Webhook] Received update:', JSON.stringify(update));
    
    // Serverless da albatta await qilish shart, aks holda Vercel xabarni jo'natishga ulgurmasdan jarayonni muzlatib qo'yadi!
    await processTelegramUpdate(update);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Telegram webhook error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const dbTest = await query(`SELECT COUNT(*)::int as count FROM students`);
    const token = process.env.TELEGRAM_PARENT_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '9204379482:AAG52nMv0V3GaOxNrij5a-JgWaHRDEQkYXo';
    return NextResponse.json({
      status: 'Maktabim Telegram Parent Bot Active',
      students_count: dbTest.rows[0]?.count,
      bot_prefix: token.slice(0, 10),
    });
  } catch (err: any) {
    return NextResponse.json({
      status: 'error',
      error: err.message,
    }, { status: 500 });
  }
}
