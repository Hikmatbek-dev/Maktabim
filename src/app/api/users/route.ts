import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser, hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Ruxsat berilmagan' }, { status: 403 });
    }

    const res = await query(
      `SELECT u.id, u.name, u.username, u.role, u.phone, u.created_at,
              c.id as assigned_class_id, c.name as assigned_class_name
       FROM users u
       LEFT JOIN classes c ON c.teacher_id = u.id
       ORDER BY u.role, u.name`
    );

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

    const { name, username, password, role, phone, assigned_class_id } = await req.json();

    if (!name || !username || !password || !role) {
      return NextResponse.json({ error: 'Barcha maydonlarni to‘ldiring' }, { status: 400 });
    }

    const pwHash = await hashPassword(password);
    const userId = `usr_${username.toLowerCase()}_${Date.now().toString().slice(-4)}`;

    await query(
      `INSERT INTO users (id, name, username, password_hash, role, phone)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, name.trim(), username.trim().toLowerCase(), pwHash, role, phone || null]
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
