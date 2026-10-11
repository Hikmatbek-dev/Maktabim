import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { clearCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Ruxsat berilmagan' }, { status: 401 });
    }

    const { class_id, date } = await req.json();

    if (!class_id || !date) {
      return NextResponse.json({ error: 'Sinf va sana talab qilinadi' }, { status: 400 });
    }

    const clsRes = await query(`SELECT school_id FROM classes WHERE id = $1`, [class_id]);
    const schoolId = clsRes.rows[0]?.school_id || user.school_id || 'sch_1';

    const subId = `sub_${class_id}_${date}`;

    await query(
      `INSERT INTO attendance_submissions (id, school_id, date, class_id, submitted_by_id, status, submitted_at)
       VALUES ($1, $2, $3, $4, $5, 'SUBMITTED', CURRENT_TIMESTAMP)
       ON CONFLICT (class_id, date) DO UPDATE 
       SET submitted_by_id = EXCLUDED.submitted_by_id, submitted_at = CURRENT_TIMESTAMP`,
      [subId, schoolId, date, class_id, user.id]
    );

    clearCache();
    return NextResponse.json({
      success: true,
      message: 'Davomat muvaffaqiyatli topshirildi va tasdiqlandi!',
    });
  } catch (err: any) {
    console.error('Submit attendance error:', err);
    return NextResponse.json({ error: 'Topshirishda xatolik yuz berdi' }, { status: 500 });
  }
}
