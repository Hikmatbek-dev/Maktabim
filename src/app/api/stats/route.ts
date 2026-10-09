import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Ruxsat berilmagan' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    // 1. Umumiy o'quvchilar soni
    const totalStudentsRes = await query(
      `SELECT COUNT(*)::int as count FROM students WHERE status = 'active'`
    );
    const totalStudents = totalStudentsRes.rows[0]?.count || 0;

    // 2. Bugungi davomat hisoboti
    const attRes = await query(
      `SELECT 
        status, 
        COUNT(*)::int as count 
       FROM attendance 
       WHERE date = $1 
       GROUP BY status`,
      [date]
    );

    let present = 0;
    let unexcused = 0;
    let excused = 0;
    let late = 0;

    for (const r of attRes.rows) {
      if (r.status === 'PRESENT') present = r.count;
      else if (r.status === 'ABSENT_UNEXCUSED') unexcused = r.count;
      else if (r.status === 'ABSENT_EXCUSED') excused = r.count;
      else if (r.status === 'LATE') late = r.count;
    }

    // 3. Smenalar bo'yicha statistika
    const shiftStatsRes = await query(
      `SELECT 
        c.shift,
        COUNT(s.id)::int as total_students,
        COUNT(CASE WHEN a.status = 'PRESENT' OR a.status = 'LATE' THEN 1 END)::int as present_students
       FROM classes c
       JOIN students s ON s.class_id = c.id AND s.status = 'active'
       LEFT JOIN attendance a ON a.student_id = s.id AND a.date = $1
       GROUP BY c.shift
       ORDER BY c.shift`,
      [date]
    );

    let shift1 = { total: 0, present: 0, rate: 0 };
    let shift2 = { total: 0, present: 0, rate: 0 };

    for (const r of shiftStatsRes.rows) {
      const rate = r.total_students > 0 ? Math.round((r.present_students / r.total_students) * 100) : 0;
      if (r.shift === 1) {
        shift1 = { total: r.total_students, present: r.present_students, rate };
      } else if (r.shift === 2) {
        shift2 = { total: r.total_students, present: r.present_students, rate };
      }
    }

    // 4. Sinflar va ularning topshirish holati
    const classesCountRes = await query(`SELECT COUNT(*)::int as count FROM classes`);
    const totalClasses = classesCountRes.rows[0]?.count || 0;

    const submittedRes = await query(
      `SELECT COUNT(*)::int as count FROM attendance_submissions WHERE date = $1`,
      [date]
    );
    const submittedClassesCount = submittedRes.rows[0]?.count || 0;

    // 5. Xavf guruhi (Surunkali dars qoldiruvchi top 5 o'quvchi)
    const riskStudentsRes = await query(
      `SELECT 
        s.id, s.name, s.parent_phone, c.name as class_name,
        COUNT(a.id)::int as unexcused_days
       FROM attendance a
       JOIN students s ON s.id = a.student_id
       JOIN classes c ON c.id = s.class_id
       WHERE a.status = 'ABSENT_UNEXCUSED'
       GROUP BY s.id, s.name, s.parent_phone, c.name
       ORDER BY unexcused_days DESC
       LIMIT 5`
    );

    const checkedTotal = present + unexcused + excused + late;
    const overallRate = checkedTotal > 0 ? Math.round(((present + late) / checkedTotal) * 100) : 0;

    return NextResponse.json({
      date,
      total_students: totalStudents,
      checked_students: checkedTotal,
      total_present: present,
      total_absent_unexcused: unexcused,
      total_absent_excused: excused,
      total_late: late,
      attendance_rate: overallRate,
      total_classes: totalClasses,
      submitted_classes_count: submittedClassesCount,
      pending_classes_count: Math.max(0, totalClasses - submittedClassesCount),
      shift1_stats: shift1,
      shift2_stats: shift2,
      risk_students: riskStudentsRes.rows,
    });
  } catch (err: any) {
    console.error('Stats fetch error:', err);
    return NextResponse.json({ error: 'Statistika yuklashda xatolik' }, { status: 500 });
  }
}
