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
    const limit = parseInt(searchParams.get('limit') || '100');

    let sql = `
      SELECT s.id, s.class_id, c.name as class_name, s.name, s.gender,
             s.birth_date, s.parent_name, s.parent_phone, s.status, s.created_at
      FROM students s
      JOIN classes c ON c.id = s.class_id
      WHERE s.status = 'active'
    `;
    const params: any[] = [];

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

    const { name, class_id, gender, parent_name, parent_phone, birth_date } = await req.json();

    if (!name || !class_id) {
      return NextResponse.json({ error: 'O‘quvchi ismi va sinfi majburiy' }, { status: 400 });
    }

    const studentId = `st_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

    await query(
      `INSERT INTO students (id, class_id, name, gender, parent_name, parent_phone, birth_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')`,
      [studentId, class_id, name.trim(), gender || 'male', parent_name || null, parent_phone || null, birth_date || null]
    );

    return NextResponse.json({ success: true, studentId });
  } catch (err: any) {
    console.error('Create student error:', err);
    return NextResponse.json({ error: 'O‘quvchi qo‘shishda xatolik yuz berdi' }, { status: 500 });
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
