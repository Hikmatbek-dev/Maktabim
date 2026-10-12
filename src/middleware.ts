import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'maktabim_auth_token';
const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'maktabim-super-secret-jwt-key-2026-very-secure'
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Statik fayllar, rasmlar va public resurslarni o'tkazib yuborish
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/fonts') ||
    pathname.startsWith('/Oquvchilar') ||
    pathname === '/favicon.ico' ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  let isAuthenticated = false;

  if (token) {
    try {
      await jwtVerify(token, SECRET_KEY);
      isAuthenticated = true;
    } catch {
      isAuthenticated = false;
    }
  }

  // 1. Agar login sahifasiga kirilayotgan bo'lsa:
  if (pathname === '/login') {
    // Agar foydalanuvchi allaqachon login qilgan bo'lsa, asosiy sahifaga yo'naltirish
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // 2. Auth API yo'llari o'tkaziladi
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // 3. Agar foydalanuvchi tizimga kirmagan bo'lsa:
  if (!isAuthenticated) {
    // API so'rovlari bo'lsa, 401 Unauthorized qaytarish
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Ruxsat berilmagan' }, { status: 401 });
    }
    // Oddiy sahifalar bo'lsa, to'g'ridan-to'g'ri /login sahifasiga majburiy redirect qilish
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    // Eskirgan noto'g'ri cookie bo'lsa tozalash
    if (token) {
      response.cookies.delete(COOKIE_NAME);
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Quyidagilardan boshqa barcha yo'llar uchun middleware ishlaydi:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
