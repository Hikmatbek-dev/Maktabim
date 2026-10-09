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
    const shift = searchParams.get('shift');
    const schoolId = searchParams.get('school_id') || user.school_id || 'sch_1';

    let sql = `
      SELECT 
        c.id, c.school_id, c.name, c.grade, c.shift, c.room,
        u.id as teacher_id, u.name as teacher_name, u.phone as teacher_phone,
        COUNT(DISTINCT s.id)::int as total_students,
        COUNT(DISTINCT CASE WHEN a.status = 'PRESENT' THEN a.id END)::int as present_count,
        COUNT(DISTINCT CASE WHEN a.status = 'ABSENT_UNEXCUSED' THEN a.id END)::int as unexcused_count,
        COUNT(DISTINCT CASE WHEN a.status = 'ABSENT_EXCUSED' THEN a.id END)::int as excused_count,
        COUNT(DISTINCT CASE WHEN a.status = 'LATE' THEN a.id END)::int as late_count,
        CASE WHEN sub.id IS NOT NULL THEN true ELSE false END as is_submitted,
        sub.submitted_at
      FROM classes c
      LEFT JOIN users u ON u.id = c.teacher_id
      LEFT JOIN students s ON s.class_id = c.id AND s.status = 'active'
      LEFT JOIN attendance a ON a.student_id = s.id AND a.date = $1
      LEFT JOIN attendance_submissions sub ON sub.class_id = c.id AND sub.date = $1
      WHERE c.school_id = $2
    `;

    const params: any[] = [date, schoolId];
    if (shift) {
      sql += ` AND c.shift = $3`;
      params.push(parseInt(shift));
    }

    sql += ` GROUP BY c.id, c.school_id, c.name, c.grade, c.shift, c.room, u.id, u.name, u.phone, sub.id, sub.submitted_at
             ORDER BY c.grade ASC, c.name ASC`;

    const res = await query(sql, params);

    const classes = res.rows.map((row) => {
      const checked = row.present_count + row.unexcused_count + row.excused_count + row.late_count;
      const percentage = row.total_students > 0 ? Math.round(((row.present_count + row.late_count) / row.total_students) * 100) : 0;
      return {
        ...row,
        checked_students: checked,
        percentage,
      };
    });

    return NextResponse.json({ classes });
  } catch (err: any) {
    console.error('Classes list error:', err);
    return NextResponse.json({ error: 'Sinflarni yuklashda xatolik' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Faqat Super Admin yangi sinf qo‘sha oladi' }, { status: 403 });
    }

    const { name, grade, shift, room, teacher_id, school_id } = await req.json();

    if (!name || !grade) {
      return NextResponse.json({ error: 'Sinf nomi va sinf raqami majburiy' }, { status: 400 });
    }

    const targetSchoolId = school_id || user.school_id || 'sch_1';
    const classId = `cls_${name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now().toString().slice(-4)}`;

    await query(
      `INSERT INTO classes (id, school_id, name, grade, shift, room, teacher_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [classId, targetSchoolId, name.trim(), parseInt(grade), parseInt(shift || '1'), room || null, teacher_id || null]
    );

    return NextResponse.json({ success: true, classId });
  } catch (err: any) {
    console.error('Create class error:', err);
    return NextResponse.json({ error: 'Sinf qo‘shishda xatolik yuz berdi' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Faqat Super Admin sinfni o‘chira oladi' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Sinf ID talab qilinadi' }, { status: 400 });
    }

    await query(`DELETE FROM classes WHERE id = $1`, [id]);

    return NextResponse.json({ success: true, message: 'Sinf muvaffaqiyatli o‘chirildi' });
  } catch (err: any) {
    console.error('Delete class error:', err);
    return NextResponse.json({ error: 'Sinfni o‘chirishda xatolik' }, { status: 500 });
  }
}
