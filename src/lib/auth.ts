import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { query } from './db';
import { User, Role } from './types';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'maktabim-super-secret-jwt-key-2026-very-secure'
);

export const COOKIE_NAME = 'maktabim_auth_token';

export async function createToken(payload: { id: string; username: string; role: Role; name: string }) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET_KEY);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as { id: string; username: string; role: Role; name: string };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const decoded = await verifyToken(token);
    if (!decoded) return null;

    try {
      const res = await query(
        `SELECT u.id, u.name, u.username, u.role, u.phone, u.avatar, u.created_at,
                c.id as assigned_class_id, c.name as assigned_class_name
         FROM users u
         LEFT JOIN classes c ON c.teacher_id = u.id
         WHERE u.id = $1`,
        [decoded.id]
      );

      if (res.rows.length === 0) return null;

      const u = res.rows[0];
      return {
        id: u.id,
        name: u.name,
        username: u.username,
        role: u.role as Role,
        phone: u.phone,
        avatar: u.avatar,
        assigned_class_id: u.assigned_class_id || undefined,
        assigned_class_name: u.assigned_class_name || undefined,
        created_at: u.created_at,
      };
    } catch (dbErr) {
      console.warn('Database query fallback in getCurrentUser:', dbErr);
      // Token mavjud va to'g'ri bo'lsa, xatolik chiqarmasdan foydalanuvchini qaytarish
      return {
        id: decoded.id,
        name: decoded.name || decoded.username,
        username: decoded.username,
        role: decoded.role as Role,
        created_at: new Date().toISOString(),
      };
    }
  } catch (err) {
    console.error('Error in getCurrentUser:', err);
    return null;
  }
}

export async function verifyPassword(plain: string, hashed: string) {
  return await bcrypt.compare(plain, hashed);
}

export async function hashPassword(plain: string) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(plain, salt);
}
