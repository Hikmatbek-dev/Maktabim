import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser, hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Ruxsat berilmagan' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('school_id');

    let sql = `
      SELECT u.id, u.name, u.username, u.role, u.school_id, u.phone, u.created_at,
             s.name as school_name,
             c.id as assigned_class_id, c.name as assigned_class_name
      FROM users u
      LEFT JOIN schools s ON s.id = u.school_id
      LEFT JOIN classes c ON c.teacher_id = u.id
    `;
    const params: any[] = [];

    if (schoolId) {
      params.push(schoolId);
      sql += ` WHERE u.school_id = $1`;
    }

    sql += ` ORDER BY u.role, u.name`;

    const res = await query(sql, params);

    return NextResponse.json({ users: res.rows });
  } catch (err: any) {
    console.error('Fetch users error:', err);
    return NextResponse.json({ error: 'Foydalanuvchilarni yuklashda xatolik' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Ruxsat berilmagan' }, { status: 403 });
    }

    const { name, username, password, role, school_id, phone, assigned_class_id } = await req.json();

    if (!name || !username || !password || !role) {
      return NextResponse.json({ error: 'Barcha maydonlarni to‘ldiring' }, { status: 400 });
    }

    const pwHash = await hashPassword(password);
    const userId = `usr_${username.toLowerCase()}_${Date.now().toString().slice(-4)}`;
    const targetSchoolId = school_id || user.school_id || 'sch_1';

    await query(
      `INSERT INTO users (id, school_id, name, username, password_hash, role, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, role === 'SUPER_ADMIN' ? null : targetSchoolId, name.trim(), username.trim().toLowerCase(), pwHash, role, phone || null]
    );

    if (assigned_class_id && role === 'TEACHER') {
      await query(
        `UPDATE classes SET teacher_id = $1 WHERE id = $2`,
        [userId, assigned_class_id]
      );
    }

    return NextResponse.json({ success: true, userId });
  } catch (err: any) {
    if (err.message?.includes('duplicate key') || err.message?.includes('unique')) {
      return NextResponse.json({ error: 'Bunday loginli foydalanuvchi allaqachon mavjud' }, { status: 400 });
    }
    console.error('Create user error:', err);
    return NextResponse.json({ error: 'Foydalanuvchi yaratishda xatolik' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Faqat Super Admin xodimlarni o‘chira oladi' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Foydalanuvchi ID talab qilinadi' }, { status: 400 });
    }

    if (id === user.id) {
      return NextResponse.json({ error: 'O‘zingizni o‘chira olmaysiz' }, { status: 400 });
    }

    await query(`DELETE FROM users WHERE id = $1`, [id]);

    return NextResponse.json({ success: true, message: 'Foydalanuvchi o‘chirildi' });
  } catch (err: any) {
    console.error('Delete user error:', err);
    return NextResponse.json({ error: 'O‘chirishda xatolik' }, { status: 500 });
  }
}
