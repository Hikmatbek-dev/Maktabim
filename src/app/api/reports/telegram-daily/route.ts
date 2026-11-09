import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sendDailyTelegramReport } from '@/lib/telegramReport';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    // Auth tekshirish: faqat tizimga kirgan rahbarlar yoki maxfiy token bilan ruxsat
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'maktabim_cron_telegram_secret_2026';
    const isCronAuthorized = authHeader === `Bearer ${cronSecret}`;

    if (!user && !isCronAuthorized) {
      return NextResponse.json({ error: 'Ruxsat berilmagan' }, { status: 401 });
    }

    if (user && !['DIRECTOR', 'DEPUTY_DIRECTOR', 'INSPECTOR'].includes(user.role)) {
      return NextResponse.json({ error: 'Faqat rahbarlar hisobot yubora oladi' }, { status: 403 });
    }

    let date: string | undefined;
    let schoolId = user?.school_id || 'sch_1';

    try {
      const body = await req.json();
      if (body.date) date = body.date;
      if (body.school_id) schoolId = body.school_id;
    } catch (_) {
      // Body bo'lmasa yoki JSON bo'lmasa url paramlardan oladi
      const url = new URL(req.url);
      date = url.searchParams.get('date') || undefined;
      schoolId = url.searchParams.get('school_id') || schoolId;
    }

    const reportResult = await sendDailyTelegramReport({
      date,
      schoolId,
    });

    return NextResponse.json({
      success: true,
      message: 'Telegramga kunlik hisobot muvaffaqiyatli yuborildi',
      data: reportResult,
    });
  } catch (error: any) {
    console.error('Telegram hisobot yuborishda xatolik:', error);
    return NextResponse.json(
      { error: error.message || 'Telegramga hisobot yuborishda xatolik' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
