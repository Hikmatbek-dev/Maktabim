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
    const classId = searchParams.get('class_id');
    const search = searchParams.get('search');
    const schoolId = searchParams.get('school_id') || user.school_id || 'sch_1';
    const limit = parseInt(searchParams.get('limit') || '100');

    let sql = `
      SELECT s.id, s.school_id, s.class_id, c.name as class_name, s.name, s.gender,
             s.birth_date, s.parent_name, s.parent_phone, s.status, s.created_at
      FROM students s
      JOIN classes c ON c.id = s.class_id
      WHERE s.status = 'active' AND s.school_id = $1
    `;
    const params: any[] = [schoolId];

    if (classId) {
      params.push(classId);
      sql += ` AND s.class_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.trim()}%`);
      sql += ` AND (s.name ILIKE $${params.length} OR s.parent_name ILIKE $${params.length})`;
    }

    sql += ` ORDER BY c.grade ASC, c.name ASC, s.name ASC LIMIT ${limit}`;

    const res = await query(sql, params);

    return NextResponse.json({ students: res.rows });
  } catch (err: any) {
    console.error('Fetch students error:', err);
    return NextResponse.json({ error: 'O‘quvchilarni olishda xatolik' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'DIRECTOR')) {
      return NextResponse.json({ error: 'Faqat Admin yoki Rahbariyat o‘quvchi qo‘sha oladi' }, { status: 403 });
    }

    const { name, class_id, gender, parent_name, parent_phone, birth_date, school_id } = await req.json();

    if (!name || !class_id) {
      return NextResponse.json({ error: 'O‘quvchi ismi va sinfi majburiy' }, { status: 400 });
    }

    // Sinfning school_id sini aniqlaymiz
    let targetSchoolId = school_id;
    if (!targetSchoolId) {
      const clsRes = await query(`SELECT school_id FROM classes WHERE id = $1`, [class_id]);
      targetSchoolId = clsRes.rows[0]?.school_id || user.school_id || 'sch_1';
    }

    const studentId = `st_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

    await query(
      `INSERT INTO students (id, school_id, class_id, name, gender, parent_name, parent_phone, birth_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')`,
      [
        studentId,
        targetSchoolId,
        class_id,
        name.trim(),
        gender || 'male',
        parent_name || null,
        parent_phone || null,
        birth_date || null,
      ]
    );

    return NextResponse.json({ success: true, studentId });
  } catch (err: any) {
    console.error('Create student error:', err);
    return NextResponse.json({ error: 'O‘quvchi qo‘shishda xatolik yuz berdi' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'DIRECTOR')) {
      return NextResponse.json({ error: 'Ruxsat berilmagan' }, { status: 403 });
    }

    const { id, name, class_id, gender, parent_name, parent_phone } = await req.json();

    if (!id || !name) {
      return NextResponse.json({ error: 'O‘quvchi ID va ismi kiritilishi shart' }, { status: 400 });
    }

    await query(
      `UPDATE students 
       SET name = $1, class_id = COALESCE($2, class_id), gender = COALESCE($3, gender),
           parent_name = $4, parent_phone = $5
       WHERE id = $6`,
      [name.trim(), class_id || null, gender || null, parent_name || null, parent_phone || null, id]
    );

    return NextResponse.json({ success: true, message: 'O‘quvchi maʼlumotlari yangilandi' });
  } catch (err: any) {
    console.error('Update student error:', err);
    return NextResponse.json({ error: 'Tahrirlashda xatolik' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Faqat Super Admin o‘chira oladi' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID talab qilinadi' }, { status: 400 });
    }

    await query(`DELETE FROM students WHERE id = $1`, [id]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Delete student error:', err);
    return NextResponse.json({ error: 'O‘chirishda xatolik' }, { status: 500 });
  }
}
