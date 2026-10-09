import { NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Tizimdan chiqildi' });
  response.cookies.delete(COOKIE_NAME);
  return response;
}
