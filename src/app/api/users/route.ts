import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser, hashPassword } from '@/lib/auth';
import { clearCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'DIRECTOR' && user.role !== 'DEPUTY_DIRECTOR')) {
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
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'DIRECTOR')) {
      return NextResponse.json({ error: 'Faqat Direktor yangi xodim qo‘sha oladi' }, { status: 403 });
    }

    const { name, username, password, role, school_id, phone, assigned_class_id } = await req.json();

    if (!name || !username || !password || !role) {
      return NextResponse.json({ error: 'Barcha maydonlarni to‘ldiring' }, { status: 400 });
    }

    if (password.length < 4) {
      return NextResponse.json({ error: 'Parol kamida 4 ta belgidan iborat bo‘lishi kerak' }, { status: 400 });
    }

    const allowedRoles = ['TEACHER', 'INSPECTOR', 'DEPUTY_DIRECTOR'];
    if (user.role === 'DIRECTOR' && !allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Noto‘g‘ri lavozim tanlandi' }, { status: 400 });
    }

    const pwHash = await hashPassword(password);
    const cleanUsername = username.trim().toLowerCase();
    const userId = `usr_${cleanUsername}_${Date.now().toString().slice(-4)}`;
    const targetSchoolId = user.school_id || school_id || 'sch_1';

    await query(
      `INSERT INTO users (id, school_id, name, username, password_hash, role, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, targetSchoolId, name.trim(), cleanUsername, pwHash, role, phone || null]
    );

    if (assigned_class_id && role === 'TEACHER') {
      await query(
        `UPDATE classes SET teacher_id = $1 WHERE id = $2`,
        [userId, assigned_class_id]
      );
    }

    clearCache();
    return NextResponse.json({ success: true, userId, message: 'Xodim muvaffaqiyatli qo‘shildi' });
  } catch (err: any) {
    if (err.message?.includes('duplicate key') || err.message?.includes('unique') || err.message?.includes('users_username_key')) {
      return NextResponse.json({ error: 'Bunday loginli foydalanuvchi allaqachon mavjud' }, { status: 400 });
    }
    console.error('Create user error:', err);
    return NextResponse.json({ error: 'Foydalanuvchi yaratishda xatolik' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'DIRECTOR')) {
      return NextResponse.json({ error: 'Faqat Direktor xodimlarni o‘chira oladi' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Foydalanuvchi ID talab qilinadi' }, { status: 400 });
    }

    if (id === user.id) {
      return NextResponse.json({ error: 'O‘zingizni o‘chira olmaysiz' }, { status: 400 });
    }

    // Agar o'qituvchi sinfga biriktirilgan bo'lsa, sinfdagi teacher_id ni tozalash
    await query(`UPDATE classes SET teacher_id = NULL WHERE teacher_id = $1`, [id]);

    // Xodimni o'chirish (o'z maktabiga tegishli bo'lsa)
    if (user.role === 'DIRECTOR') {
      await query(`DELETE FROM users WHERE id = $1 AND school_id = $2 AND role != 'DIRECTOR'`, [id, user.school_id]);
    } else {
      await query(`DELETE FROM users WHERE id = $1`, [id]);
    }

    clearCache();
    return NextResponse.json({ success: true, message: 'Foydalanuvchi o‘chirildi' });
  } catch (err: any) {
    console.error('Delete user error:', err);
    return NextResponse.json({ error: 'O‘chirishda xatolik' }, { status: 500 });
  }
}
