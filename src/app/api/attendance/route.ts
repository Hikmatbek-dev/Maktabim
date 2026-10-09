import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Ruxsat berilmagan' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('class_id');
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const studentId = searchParams.get('student_id');

    if (studentId) {
      // Bitta o'quvchining davomat tarixi
      const res = await query(
        `SELECT a.id, a.date, a.status, a.reason, a.doctor_note_url, a.notes,
                u.name as marked_by_name
         FROM attendance a
         LEFT JOIN users u ON u.id = a.marked_by_id
         WHERE a.student_id = $1
         ORDER BY a.date DESC
         LIMIT 60`,
        [studentId]
      );
      return NextResponse.json({ history: res.rows });
    }

    if (!classId) {
      return NextResponse.json({ error: 'class_id parametri talab qilinadi' }, { status: 400 });
    }

    // Sinfning ma'lum kundagi to'liq davomati (har bir o'quvchi uchun)
    const res = await query(
      `SELECT 
        s.id as student_id,
        s.name as student_name,
        s.gender,
        s.parent_name,
        s.parent_phone,
        COALESCE(a.status, 'PRESENT') as status,
        a.id as attendance_id,
        a.reason,
        a.doctor_note_url,
        a.notes,
        a.marked_by_id,
        mb.name as marked_by_name,
        a.confirmed_by_id,
        cb.name as confirmed_by_name,
        a.updated_at
       FROM students s
       LEFT JOIN attendance a ON a.student_id = s.id AND a.date = $2
       LEFT JOIN users mb ON mb.id = a.marked_by_id
       LEFT JOIN users cb ON cb.id = a.confirmed_by_id
       WHERE s.class_id = $1 AND s.status = 'active'
       ORDER BY s.name ASC`,
      [classId, date]
    );

    // Submission statusini ham olamiz
    const subRes = await query(
      `SELECT sub.id, sub.status, sub.submitted_at, u.name as submitted_by_name
       FROM attendance_submissions sub
       LEFT JOIN users u ON u.id = sub.submitted_by_id
       WHERE sub.class_id = $1 AND sub.date = $2`,
      [classId, date]
    );

    const submission = subRes.rows[0] || null;

    return NextResponse.json({
      date,
      class_id: classId,
      records: res.rows,
      submission,
    });
  } catch (err: any) {
    console.error('Fetch attendance error:', err);
    return NextResponse.json({ error: 'Davomatni yuklashda xatolik' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Ruxsat berilmagan' }, { status: 401 });
    }

    const { class_id, date, records } = await req.json();

    if (!class_id || !date || !Array.isArray(records)) {
      return NextResponse.json({ error: 'Noto‘g‘ri maʼlumot formati' }, { status: 400 });
    }

    // Sinfning maktabini aniqlaymiz
    const clsRes = await query(`SELECT school_id FROM classes WHERE id = $1`, [class_id]);
    const schoolId = clsRes.rows[0]?.school_id || user.school_id || 'sch_1';

    // Ommaviy upsert
    for (const item of records) {
      const studentId = item.student_id;
      const status = item.status || 'PRESENT';
      const reason = item.reason || null;
      const notes = item.notes || null;
      const doctorNoteUrl = item.doctor_note_url || null;
      const attId = `att_${studentId}_${date}`;

      await query(
        `INSERT INTO attendance (
          id, school_id, date, student_id, class_id, status, reason, doctor_note_url,
          notes, marked_by_id, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
        ON CONFLICT (student_id, date) DO UPDATE 
        SET 
          school_id = COALESCE(attendance.school_id, EXCLUDED.school_id),
          status = EXCLUDED.status,
          reason = COALESCE(EXCLUDED.reason, attendance.reason),
          doctor_note_url = COALESCE(EXCLUDED.doctor_note_url, attendance.doctor_note_url),
          notes = COALESCE(EXCLUDED.notes, attendance.notes),
          confirmed_by_id = CASE 
            WHEN $11 IN ('TEACHER', 'DIRECTOR', 'DEPUTY_DIRECTOR') THEN $10 
            ELSE attendance.confirmed_by_id 
          END,
          updated_at = CURRENT_TIMESTAMP`,
        [
          attId,
          schoolId,
          date,
          studentId,
          class_id,
          status,
          reason,
          doctorNoteUrl,
          notes,
          user.id,
          user.role,
        ]
      );
    }

    return NextResponse.json({
      success: true,
      message: `${records.length} ta o‘quvchi davomati saqlandi`,
    });
  } catch (err: any) {
    console.error('Save attendance error:', err);
    return NextResponse.json({ error: 'Davomatni saqlashda xatolik' }, { status: 500 });
  }
}
