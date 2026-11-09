import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { clearCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

async function ensureTableAndDefaults(schoolId: string) {
  await query(`
    CREATE TABLE IF NOT EXISTS academic_quarters (
      id VARCHAR(50) PRIMARY KEY,
      school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      quarter_number INT NOT NULL,
      name VARCHAR(100) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      vacation_start DATE,
      vacation_end DATE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_school_quarter UNIQUE (school_id, quarter_number)
    );
  `);

  const existing = await query(
    `SELECT COUNT(*)::int as count FROM academic_quarters WHERE school_id = $1`,
    [schoolId]
  );

  if (existing.rows[0]?.count === 0) {
    const defaultQuarters = [
      { q: 1, name: '1-chorak', sDate: '2026-09-02', eDate: '2026-11-04', vStart: '2026-11-05', vEnd: '2026-11-10' },
      { q: 2, name: '2-chorak', sDate: '2026-11-11', eDate: '2026-12-27', vStart: '2026-12-28', vEnd: '2027-01-10' },
      { q: 3, name: '3-chorak', sDate: '2027-01-11', eDate: '2027-03-20', vStart: '2027-03-21', vEnd: '2027-03-27' },
      { q: 4, name: '4-chorak', sDate: '2027-03-28', eDate: '2027-05-25', vStart: '2027-05-26', vEnd: '2027-09-01' },
    ];
    for (const q of defaultQuarters) {
      await query(
        `INSERT INTO academic_quarters (id, school_id, quarter_number, name, start_date, end_date, vacation_start, vacation_end)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (school_id, quarter_number) DO NOTHING;`,
        [`qtr_${schoolId}_${q.q}`, schoolId, q.q, q.name, q.sDate, q.eDate, q.vStart, q.vEnd]
      );
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Ruxsat berilmagan' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('school_id') || user.school_id || 'sch_1';

    await ensureTableAndDefaults(schoolId);

    const res = await query(
      `SELECT 
        id, school_id, quarter_number, name,
        TO_CHAR(start_date, 'YYYY-MM-DD') as start_date,
        TO_CHAR(end_date, 'YYYY-MM-DD') as end_date,
        TO_CHAR(vacation_start, 'YYYY-MM-DD') as vacation_start,
        TO_CHAR(vacation_end, 'YYYY-MM-DD') as vacation_end
       FROM academic_quarters
       WHERE school_id = $1
       ORDER BY quarter_number ASC`,
      [schoolId]
    );

    return NextResponse.json({ quarters: res.rows });
  } catch (err: any) {
    console.error('Fetch quarters error:', err);
    return NextResponse.json({ error: 'Choraklar maʼlumotini yuklashda xatolik' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'DIRECTOR' && user.role !== 'DEPUTY_DIRECTOR')) {
      return NextResponse.json({ error: 'Faqat Direktor yoki maʼmuriyat chorak sanalarini o‘zgartira oladi' }, { status: 403 });
    }

    const { school_id, quarters } = await req.json();
    const targetSchoolId = school_id || user.school_id || 'sch_1';

    if (!Array.isArray(quarters) || quarters.length === 0) {
      return NextResponse.json({ error: 'Choraklar ro‘yxati yaroqsiz' }, { status: 400 });
    }

    await ensureTableAndDefaults(targetSchoolId);

    for (const q of quarters) {
      const qNum = parseInt(q.quarter_number, 10);
      const name = q.name || `${qNum}-chorak`;
      const sDate = q.start_date;
      const eDate = q.end_date;
      const vStart = q.vacation_start || null;
      const vEnd = q.vacation_end || null;

      if (!sDate || !eDate) {
        continue;
      }

      await query(
        `INSERT INTO academic_quarters (id, school_id, quarter_number, name, start_date, end_date, vacation_start, vacation_end, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
         ON CONFLICT (school_id, quarter_number) DO UPDATE
         SET name = EXCLUDED.name,
             start_date = EXCLUDED.start_date,
             end_date = EXCLUDED.end_date,
             vacation_start = EXCLUDED.vacation_start,
             vacation_end = EXCLUDED.vacation_end,
             updated_at = CURRENT_TIMESTAMP;`,
        [`qtr_${targetSchoolId}_${qNum}`, targetSchoolId, qNum, name, sDate, eDate, vStart, vEnd]
      );
    }

    clearCache();
    return NextResponse.json({ success: true, message: 'Choraklar va taʼtillar sanalari muvaffaqiyatli saqlandi' });
  } catch (err: any) {
    console.error('Update quarters error:', err);
    return NextResponse.json({ error: 'Choraklar sanasini saqlashda xatolik yuz berdi' }, { status: 500 });
  }
}
