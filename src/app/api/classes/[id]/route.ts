import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Ruxsat berilmagan' }, { status: 401 });
    }

    const { id } = await params;

    const classRes = await query(
      `SELECT c.id, c.name, c.grade, c.shift, c.room,
              u.id as teacher_id, u.name as teacher_name, u.phone as teacher_phone
       FROM classes c
       LEFT JOIN users u ON u.id = c.teacher_id
       WHERE c.id = $1`,
      [id]
    );

    if (classRes.rows.length === 0) {
      return NextResponse.json({ error: 'Sinf topilmadi' }, { status: 404 });
    }

    const studentsRes = await query(
      `SELECT id, name, gender, birth_date, parent_name, parent_phone, status
       FROM students
       WHERE class_id = $1 AND status = 'active'
       ORDER BY name ASC`,
      [id]
    );

    return NextResponse.json({
      class: classRes.rows[0],
      students: studentsRes.rows,
    });
  } catch (err: any) {
    console.error('Fetch class error:', err);
    return NextResponse.json({ error: 'Sinf maʼlumotlarini olishda xatolik' }, { status: 500 });
  }
}
