import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyPassword, createToken, COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Login va parolni kiriting' },
        { status: 400 }
      );
    }

    const res = await query(
      `SELECT u.id, u.name, u.username, u.password_hash, u.role, u.phone,
              c.id as assigned_class_id, c.name as assigned_class_name
       FROM users u
       LEFT JOIN classes c ON c.teacher_id = u.id
       WHERE LOWER(u.username) = LOWER($1)`,
      [username.trim()]
    );

    if (res.rows.length === 0) {
      return NextResponse.json(
        { error: 'Bunday foydalanuvchi topilmadi yoki parol noto‘g‘ri' },
        { status: 401 }
      );
    }

    const user = res.rows[0];
    const isMatch = await verifyPassword(password, user.password_hash);

    if (!isMatch) {
      return NextResponse.json(
        { error: 'Bunday foydalanuvchi topilmadi yoki parol noto‘g‘ri' },
        { status: 401 }
      );
    }

    const token = await createToken({
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        phone: user.phone,
        assigned_class_id: user.assigned_class_id,
        assigned_class_name: user.assigned_class_name,
      },
    });

    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json(
      { error: 'Tizimda xatolik yuz berdi' },
      { status: 500 }
    );
  }
}
