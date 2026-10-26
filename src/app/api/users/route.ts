import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser, hashPassword } from '@/lib/auth';
import { clearCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

let schemaInitialized = false;

async function ensureUsersSchema() {
  if (schemaInitialized) return;
  try {
    await query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS raw_password VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS schedule JSONB;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS work_days TEXT[] DEFAULT ARRAY['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
      UPDATE users SET raw_password = 'ustoz123' WHERE role = 'TEACHER' AND raw_password IS NULL;
      UPDATE users SET raw_password = 'davomat123' WHERE role = 'INSPECTOR' AND raw_password IS NULL;
      UPDATE users SET raw_password = 'zam123' WHERE role = 'DEPUTY_DIRECTOR' AND raw_password IS NULL;
      UPDATE users SET raw_password = 'direktor123' WHERE role = 'DIRECTOR' AND raw_password IS NULL;
    `);
    schemaInitialized = true;
  } catch (e) {
    console.warn('ensureUsersSchema migration warning:', e);
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'DIRECTOR' && user.role !== 'DEPUTY_DIRECTOR')) {
      return NextResponse.json({ error: 'Ruxsat berilmagan' }, { status: 403 });
    }

    await ensureUsersSchema();

    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('school_id');

    let sql = `
      SELECT u.id, u.name, u.username, u.role, u.school_id, u.phone,
             COALESCE(u.raw_password, 'ustoz123') as raw_password,
             u.schedule,
             u.work_days,
             u.created_at,
             s.name as school_name,
             c.id as assigned_class_id, c.name as assigned_class_name
      FROM users u
      LEFT JOIN schools s ON s.id = u.school_id
      LEFT JOIN classes c ON c.teacher_id = u.id
    `;
    const params: any[] = [];

    if (schoolId) {
      params.push(schoolId);
      sql += ` WHERE (u.school_id = $1 OR u.school_id IS NULL)`;
    }

    sql += ` ORDER BY u.role, u.name`;

    let rows: any[] = [];
    try {
      const res = await query(sql, params);
      rows = res.rows;
    } catch (queryErr) {
      console.warn('Fallback query for users without new columns:', queryErr);
      const fallbackSql = `
        SELECT u.id, u.name, u.username, u.role, u.school_id, u.phone, u.created_at,
               s.name as school_name,
               c.id as assigned_class_id, c.name as assigned_class_name
        FROM users u
        LEFT JOIN schools s ON s.id = u.school_id
        LEFT JOIN classes c ON c.teacher_id = u.id
        ${schoolId ? `WHERE (u.school_id = $1 OR u.school_id IS NULL)` : ''}
        ORDER BY u.role, u.name
      `;
      const fallbackRes = await query(fallbackSql, params);
      rows = fallbackRes.rows;
    }

    // Har bir o'qituvchining jadvali kafolatlanishi uchun
    const classesRes = await query('SELECT name FROM classes ORDER BY grade, name');
    const classNames = classesRes.rows.map((r: any) => r.name);
    const subjects = ['Matematika', 'Ona tili', 'Adabiyot', 'Ingliz tili', 'Fizika', 'Tarix', 'Biologiya', 'Geografiya'];

    const usersWithSchedule = rows.map((u: any, idx: number) => {
      let sched = u.schedule;
      if (!sched && u.role === 'TEACHER') {
        const subj = subjects[idx % subjects.length];
        const mainClass = u.assigned_class_name || classNames[idx % (classNames.length || 1)] || '5-A';
        const otherClass = classNames[(idx + 3) % (classNames.length || 1)] || '6-B';
        const otherClass2 = classNames[(idx + 7) % (classNames.length || 1)] || '9-A';

        sched = {
          Dushanba: [
            { hour: 1, class_name: mainClass, subject: subj, room: (200 + (idx % 25)).toString() },
            { hour: 2, class_name: otherClass, subject: subj, room: (200 + (idx % 25)).toString() },
            { hour: 4, class_name: otherClass2, subject: subj, room: (200 + (idx % 25)).toString() },
          ],
          Seshanba: [
            { hour: 2, class_name: otherClass, subject: subj, room: (200 + (idx % 25)).toString() },
            { hour: 3, class_name: mainClass, subject: subj, room: (200 + (idx % 25)).toString() },
          ],
          Chorshanba: [
            { hour: 1, class_name: mainClass, subject: subj, room: (200 + (idx % 25)).toString() },
            { hour: 3, class_name: otherClass2, subject: subj, room: (200 + (idx % 25)).toString() },
            { hour: 5, class_name: otherClass, subject: subj, room: (200 + (idx % 25)).toString() },
          ],
          Payshanba: [
            { hour: 2, class_name: mainClass, subject: subj, room: (200 + (idx % 25)).toString() },
            { hour: 4, class_name: otherClass, subject: subj, room: (200 + (idx % 25)).toString() },
          ],
          Juma: [
            { hour: 1, class_name: mainClass, subject: subj, room: (200 + (idx % 25)).toString() },
            { hour: 2, class_name: otherClass2, subject: subj, room: (200 + (idx % 25)).toString() },
          ],
          Shanba: [
            { hour: 3, class_name: otherClass, subject: subj, room: (200 + (idx % 25)).toString() },
          ],
        };
      }

      return {
        ...u,
        raw_password: u.raw_password || 'ustoz123',
        schedule: sched,
        work_days: u.work_days || ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'],
      };
    });

    return NextResponse.json({ users: usersWithSchedule });
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
      `INSERT INTO users (id, school_id, name, username, password_hash, raw_password, role, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, targetSchoolId, name.trim(), cleanUsername, pwHash, password, role, phone || null]
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

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'DIRECTOR')) {
      return NextResponse.json({ error: 'Faqat Direktor xodim maʼlumotlarini o‘zgartira oladi' }, { status: 403 });
    }

    const { id, newPassword, phone, name, schedule, work_days } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Foydalanuvchi ID talab qilinadi' }, { status: 400 });
    }

    if (newPassword) {
      if (newPassword.length < 4) {
        return NextResponse.json({ error: 'Parol kamida 4 ta belgidan iborat bo‘lishi kerak' }, { status: 400 });
      }
      const pwHash = await hashPassword(newPassword);
      await query(
        `UPDATE users SET password_hash = $1, raw_password = $2 WHERE id = $3`,
        [pwHash, newPassword, id]
      );
    }

    if (phone !== undefined) {
      await query(`UPDATE users SET phone = $1 WHERE id = $2`, [phone || null, id]);
    }

    if (name) {
      await query(`UPDATE users SET name = $1 WHERE id = $2`, [name.trim(), id]);
    }

    if (schedule !== undefined) {
      await query(`UPDATE users SET schedule = $1 WHERE id = $2`, [JSON.stringify(schedule), id]);
    }

    if (work_days !== undefined) {
      await query(`UPDATE users SET work_days = $1 WHERE id = $2`, [work_days, id]);
    }

    clearCache();
    return NextResponse.json({ success: true, message: 'Foydalanuvchi maʼlumotlari yangilandi' });
  } catch (err: any) {
    console.error('Update user error:', err);
    return NextResponse.json({ error: 'Yangilashda xatolik yuz berdi' }, { status: 500 });
  }
}
