import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Ruxsat berilmagan' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    // 1. Sinflar bo'yicha davomat
    const classesRes = await query(
      `SELECT 
        c.name as "Sinf",
        c.shift as "Smena",
        u.name as "Sinf rahbari",
        COUNT(DISTINCT s.id)::int as "Jami o'quvchi",
        COUNT(DISTINCT CASE WHEN a.status = 'PRESENT' THEN a.id END)::int as "Kelganlar",
        COUNT(DISTINCT CASE WHEN a.status = 'ABSENT_UNEXCUSED' THEN a.id END)::int as "Sababsiz kelmagan",
        COUNT(DISTINCT CASE WHEN a.status = 'ABSENT_EXCUSED' THEN a.id END)::int as "Sababli kelmagan",
        COUNT(DISTINCT CASE WHEN a.status = 'LATE' THEN a.id END)::int as "Kechikkanlar",
        CASE WHEN sub.id IS NOT NULL THEN 'Topshirilgan' ELSE 'Topshirilmagan' END as "Holati"
       FROM classes c
       LEFT JOIN users u ON u.id = c.teacher_id
       LEFT JOIN students s ON s.class_id = c.id AND s.status = 'active'
       LEFT JOIN attendance a ON a.student_id = s.id AND a.date = $1
       LEFT JOIN attendance_submissions sub ON sub.class_id = c.id AND sub.date = $1
       GROUP BY c.id, c.name, c.shift, u.name, sub.id
       ORDER BY c.grade ASC, c.name ASC`,
      [date]
    );

    // 2. Kelmagan o'quvchilar ro'yxati
    const absentsRes = await query(
      `SELECT 
        c.name as "Sinf",
        s.name as "O'quvchi F.I.Sh",
        CASE 
          WHEN a.status = 'ABSENT_UNEXCUSED' THEN 'Sababsiz kelmadi'
          WHEN a.status = 'ABSENT_EXCUSED' THEN 'Sababli kelmadi'
          WHEN a.status = 'LATE' THEN 'Kechikdi'
          ELSE 'Kelmadi'
        END as "Holat",
        COALESCE(a.reason, '-') as "Sabab / Izoh",
        COALESCE(s.parent_name, '-') as "Ota-onasi",
        COALESCE(s.parent_phone, '-') as "Telefon raqami"
       FROM attendance a
       JOIN students s ON s.id = a.student_id
       JOIN classes c ON c.id = s.class_id
       WHERE a.date = $1 AND a.status IN ('ABSENT_UNEXCUSED', 'ABSENT_EXCUSED', 'LATE')
       ORDER BY c.name, s.name`,
      [date]
    );

    const workbook = XLSX.utils.book_new();

    const wsClasses = XLSX.utils.json_to_sheet(classesRes.rows);
    XLSX.utils.book_append_sheet(workbook, wsClasses, 'Sinflar hisoboti');

    const wsAbsents = XLSX.utils.json_to_sheet(absentsRes.rows);
    XLSX.utils.book_append_sheet(workbook, wsAbsents, 'Kelmaganlar');

    const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="maktab_davomat_${date}.xlsx"`,
      },
    });
  } catch (err: any) {
    console.error('Export error:', err);
    return NextResponse.json({ error: 'Excel eksport qilishda xatolik' }, { status: 500 });
  }
}
