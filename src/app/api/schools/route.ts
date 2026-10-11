import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getCached, setCached } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Ruxsat berilmagan' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const cacheKey = `schools_${date}`;
    const cachedSchools = getCached<any>(cacheKey);
    if (cachedSchools) {
      return NextResponse.json({ schools: cachedSchools });
    }

    // Har bir maktab bo'yicha tahliliy ma'lumotlar bilan
    const res = await query(
      `SELECT 
        s.id, s.name, s.code, s.region, s.district, s.address, s.phone, s.created_at,
        COUNT(DISTINCT c.id)::int as class_count,
        COUNT(DISTINCT st.id)::int as student_count,
        COUNT(DISTINCT u.id)::int as teacher_count,
        COUNT(DISTINCT CASE WHEN a.status IN ('PRESENT', 'LATE') THEN a.id END)::int as present_count,
        COUNT(DISTINCT CASE WHEN a.id IS NOT NULL THEN a.id END)::int as checked_count
       FROM schools s
       LEFT JOIN classes c ON c.school_id = s.id
       LEFT JOIN students st ON st.school_id = s.id AND st.status = 'active'
       LEFT JOIN users u ON u.school_id = s.id AND u.role = 'TEACHER'
       LEFT JOIN attendance a ON a.school_id = s.id AND a.date = $1
       GROUP BY s.id, s.name, s.code, s.region, s.district, s.address, s.phone, s.created_at
       ORDER BY s.name ASC`,
      [date]
    );

    const schools = res.rows.map((row) => {
      const rate = row.checked_count > 0 ? Math.round((row.present_count / row.checked_count) * 100) : 0;
      return {
        ...row,
        attendance_rate: rate,
      };
    });

    setCached(cacheKey, schools, 60);
    return NextResponse.json({ schools });
  } catch (err: any) {
    console.error('Fetch schools error:', err);
    return NextResponse.json({ error: 'Maktablarni yuklashda xatolik' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Faqat Super Admin maktab qo‘sha oladi' }, { status: 403 });
    }

    const { name, code, region, district, address, phone } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Maktab nomi kiritilishi shart' }, { status: 400 });
    }

    const schoolId = `sch_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const schoolCode = code || `MAK-${Math.floor(100 + Math.random() * 900)}`;

    await query(
      `INSERT INTO schools (id, name, code, region, district, address, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        schoolId,
        name.trim(),
        schoolCode.trim(),
        region?.trim() || null,
        district?.trim() || null,
        address?.trim() || null,
        phone?.trim() || null,
      ]
    );

    return NextResponse.json({ success: true, schoolId });
  } catch (err: any) {
    console.error('Create school error:', err);
    return NextResponse.json({ error: 'Maktab yaratishda xatolik yuz berdi' }, { status: 500 });
  }
}
