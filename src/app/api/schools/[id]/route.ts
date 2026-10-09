import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Ruxsat berilmagan' }, { status: 401 });
    }

    const { id } = await params;

    const res = await query(`SELECT * FROM schools WHERE id = $1`, [id]);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Maktab topilmadi' }, { status: 404 });
    }

    return NextResponse.json({ school: res.rows[0] });
  } catch (err: any) {
    console.error('Fetch school error:', err);
    return NextResponse.json({ error: 'Maktab maʼlumotlarini olishda xatolik' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Ruxsat berilmagan' }, { status: 403 });
    }

    const { id } = await params;
    const { name, code, region, district, address, phone } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Maktab nomi majburiy' }, { status: 400 });
    }

    await query(
      `UPDATE schools 
       SET name = $1, code = $2, region = $3, district = $4, address = $5, phone = $6
       WHERE id = $7`,
      [name.trim(), code || null, region || null, district || null, address || null, phone || null, id]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Update school error:', err);
    return NextResponse.json({ error: 'Maktabni tahrirlashda xatolik' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Faqat Super Admin maktabni o‘chira oladi' }, { status: 403 });
    }

    const { id } = await params;

    // Maktabni o'chirish (Kaskadli: unga tegishli sinflar va o'quvchilar ham o'chadi)
    await query(`DELETE FROM schools WHERE id = $1`, [id]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Delete school error:', err);
    return NextResponse.json({ error: 'Maktabni o‘chirishda xatolik' }, { status: 500 });
  }
}
